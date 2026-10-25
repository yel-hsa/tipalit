import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  serverTimestamp,
  documentId,
} from 'firebase/firestore'
import { CATEGORY_FALLBACK_IMAGES, departmentFor } from '../seed'
import { ServiceError } from '../errors'
import { createId } from '../ids'
import type {
  CampusId,
  Category,
  Condition,
  Department,
  Listing,
  ListingDraft,
  ListingService,
  ListingStatus,
  TransactionType,
} from '../types'
import { getFirebaseDb, isFirebaseConfigured } from './config'

// course codes are stored uppercase
const normalizeSubjectCode = (code: string): string => code.trim().toUpperCase()

const TRANSACTIONS: TransactionType[] = ['sale', 'free', 'trade']
const STATUSES: ListingStatus[] = ['active', 'reserved', 'sold']

// unknown categories get the generic 'Others' photo, never another category's
const fallbackImageFor = (category: unknown): string =>
  (typeof category === 'string' && Object.prototype.hasOwnProperty.call(CATEGORY_FALLBACK_IMAGES, category)
    ? CATEGORY_FALLBACK_IMAGES[category as Category]
    : undefined) ?? CATEGORY_FALLBACK_IMAGES.Others

const asUrlList = (value: unknown): string[] => {
  if (!Array.isArray(value)) return []
  return value.filter((url): url is string => typeof url === 'string' && url.trim().length > 0)
}

// live docs store image_ids as an array, a json string, or a bare bracketed list
function parseImageList(value: unknown): string[] {
  if (Array.isArray(value)) return asUrlList(value)
  if (typeof value !== 'string') return []

  const text = value.trim()
  if (!text) return []

  if (!text.startsWith('[')) return [text]

  try {
    const parsed: unknown = JSON.parse(text)
    if (Array.isArray(parsed)) {
      const urls = asUrlList(parsed)
      if (urls.length > 0) return urls
      if (parsed.length === 0) return []
    }
  } catch {
    // fall through to the unquoted bracketed form
  }

  return text
    .replace(/^\[|\]$/g, '')
    .split(/[,\s]+/)
    .map((url) => url.trim().replace(/^["']|["']$/g, ''))
    .filter((url) => url.length > 0)
}

export function toListing(id: string, data: Record<string, any>): Listing {
  const rawStatus = STATUSES.includes(data.status) ? data.status : 'active'
  const campus: CampusId = data.campus === 'manila' || data.campus === 'qc' ? data.campus : 'qc'
  const category: Category = (data.category as Category) || 'Textbooks'
  const parsedImages = parseImageList(data.image_ids)
  const imageUrls = parsedImages.length > 0 ? parsedImages : parseImageList(data.imageUrls)
  const cover = typeof data.imageUrl === 'string' && data.imageUrl ? data.imageUrl : imageUrls[0]
  // the edit form seeds from imageUrls, so a stock fallback must not land there
  const fallbackImage = fallbackImageFor(category)
  const realImages = cover && !imageUrls.includes(cover) ? [cover, ...imageUrls] : imageUrls
  const hasRealImage = realImages.length > 0

  return {
    id,
    title: data.title || '',
    price: typeof data.price === 'number' ? data.price : Number(data.price) || 0,
    transactionType: TRANSACTIONS.includes(data.transaction_type) ? data.transaction_type : 'sale',
    courseCode: data.subject_code || data.courseCode || '',
    category,
    department: (data.department as Department) || departmentFor(data.subject_code || data.courseCode || ''),
    condition: (data.condition as Condition) || 'Good',
    description: data.description || '',
    imageUrl: cover || fallbackImage,
    imageUrls: hasRealImage ? realImages : [fallbackImage],
    sellerId: data.seller_id || data.sellerId || '',
    meetupSpot: data.meetup_spot || data.meetupSpot || 'Library Plaza',
    campus,
    status: rawStatus,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
  }
}

export function createFirebaseListings(): ListingService {
  const db = getFirebaseDb()
  const listingsCol = collection(db, 'listings')

  return {
    async list({ campus }: { campus: CampusId }): Promise<Listing[]> {
      // rules require the exclusion to be provable by the query itself
      const q = query(
        listingsCol,
        where('campus', '==', campus),
        where('status', 'not-in', ['hidden', 'removed']),
      )
      const snapshot = await getDocs(q)
      const items: Listing[] = []
      snapshot.forEach((docSnap) => items.push(toListing(docSnap.id, docSnap.data())))
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async listMine(userId: string): Promise<Listing[]> {
      const q = query(listingsCol, where('seller_id', '==', userId))
      const snapshot = await getDocs(q)
      const items: Listing[] = []
      snapshot.forEach((docSnap) => {
        const status = docSnap.data().status
        if (status !== 'hidden' && status !== 'removed') items.push(toListing(docSnap.id, docSnap.data()))
      })
      return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async getMany(ids: string[]): Promise<Listing[]> {
      if (ids.length === 0) return []
      const found: Listing[] = []
      // firestore 'in' queries are capped at 30 ids
      const batchSize = 30
      for (let i = 0; i < ids.length; i += batchSize) {
        const q = query(listingsCol, where(documentId(), 'in', ids.slice(i, i + batchSize)))
        const snapshot = await getDocs(q)
        snapshot.forEach((docSnap) => found.push(toListing(docSnap.id, docSnap.data())))
      }
      return found
    },

    async create(draft: ListingDraft, ctx: { userId: string; campus: CampusId }): Promise<Listing> {
      const listingId = createId('l')
      // photos ride in the doc as data urls; cloud storage needs the blaze plan
      const imageUrls = draft.imageUrls.length > 0 ? draft.imageUrls : [fallbackImageFor(draft.category)]

      const subjectCode = normalizeSubjectCode(draft.courseCode)
      const department = departmentFor(subjectCode)
      const nowIso = new Date().toISOString()

      const firestoreDoc: Record<string, unknown> = {
        seller_id: ctx.userId,
        title: draft.title.trim().slice(0, 100),
        description: (draft.description || 'No description provided.').slice(0, 1000),
        price: draft.transactionType === 'sale' ? Number(draft.price) || 0 : 0,
        transaction_type: draft.transactionType,
        subject_code: subjectCode,
        category: draft.category,
        department,
        condition: draft.condition,
        campus: ctx.campus,
        image_ids: imageUrls,
        status: 'active',
        is_boosted: false,
        boost_until: null,
        report_count: 0,
        meetup_spot: draft.meetupSpot,
        created_at: nowIso,
        server_timestamp: serverTimestamp(),
      }

      try {
        await setDoc(doc(listingsCol, listingId), firestoreDoc)
      } catch (err) {
        console.error('[TIPalit Firebase Listings] Failed to save listing:', err)
        throw new ServiceError('network', "Couldn't publish. Check your connection.")
      }

      return toListing(listingId, { ...firestoreDoc, server_timestamp: nowIso })
    },

    async update(id: string, patch: ListingDraft): Promise<Listing> {
      const imageUrls = patch.imageUrls

      const subjectCode = normalizeSubjectCode(patch.courseCode)
      const department = departmentFor(subjectCode)

      const updateData: Record<string, unknown> = {
        title: patch.title.trim().slice(0, 100),
        description: (patch.description || 'No description provided.').slice(0, 1000),
        price: patch.transactionType === 'sale' ? Number(patch.price) || 0 : 0,
        transaction_type: patch.transactionType,
        subject_code: subjectCode,
        category: patch.category,
        department,
        condition: patch.condition,
        meetup_spot: patch.meetupSpot,
        image_ids: imageUrls,
        updated_at: serverTimestamp(),
      }

      try {
        const docRef = doc(listingsCol, id)
        await updateDoc(docRef, updateData)
        const updatedSnap = await getDoc(docRef)
        if (updatedSnap.exists()) return toListing(id, updatedSnap.data())
        throw new ServiceError('not_found', 'This listing no longer exists.')
      } catch (err) {
        if (err instanceof ServiceError) throw err
        console.error('[TIPalit Firebase Listings] Update error:', err)
        throw new ServiceError('network', "Couldn't save changes. Check your connection.")
      }
    },

    async setStatus(id: string, status: ListingStatus): Promise<Listing> {
      try {
        const docRef = doc(listingsCol, id)
        await updateDoc(docRef, { status, updated_at: serverTimestamp() })
        const updatedSnap = await getDoc(docRef)
        if (updatedSnap.exists()) return toListing(id, updatedSnap.data())
        throw new ServiceError('not_found', 'This listing no longer exists.')
      } catch (err) {
        if (err instanceof ServiceError) throw err
        console.error('[TIPalit Firebase Listings] Status update error:', err)
        throw new ServiceError('network', "Couldn't update listing status.")
      }
    },

    async remove(id: string): Promise<void> {
      // clients cannot write status 'hidden', so a seller delete removes the doc
      try {
        await deleteDoc(doc(listingsCol, id))
      } catch (err) {
        console.error('[TIPalit Firebase Listings] Remove error:', err)
        throw new ServiceError('network', "Couldn't remove listing.")
      }
    },
  }
}
