import {
  collection,
  doc,
  getDoc,
  getDocs,
  updateDoc,
  query,
  where,
  serverTimestamp,
  documentId,
} from 'firebase/firestore'
import {
  ref as storageRef,
  uploadBytes,
} from 'firebase/storage'
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
  ListingPhoto,
  ListingService,
  ListingStatus,
  TransactionType,
} from '../types'
import { getFirebaseDb, getFirebaseStorage } from './config'
import {
  callDeleteListingMedia,
  callFinalizeListingMedia,
  callReserveListingMedia,
  type ListingMediaReservation,
} from './listing-media-callables'

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

const PHOTO_CONTENT_TYPES = [
  'image/jpeg',
  'image/png',
  'image/webp',
] as const

const asFiniteNumber = (value: unknown): number | undefined =>
  typeof value === 'number' && Number.isFinite(value) ? value : undefined

const parsePhotos = (value: unknown): ListingPhoto[] => {
  if (!Array.isArray(value)) return []

  return value
    .map((candidate, index): ListingPhoto | null => {
      if (!candidate || typeof candidate !== 'object') return null
      const photo = candidate as Record<string, unknown>
      const contentType = PHOTO_CONTENT_TYPES.find(
        (type) => photo.content_type === type || photo.contentType === type,
      )
      const id = typeof photo.id === 'string' ? photo.id : ''
      const storagePath =
        typeof photo.storage_path === 'string'
          ? photo.storage_path
          : typeof photo.storagePath === 'string'
            ? photo.storagePath
            : ''
      const downloadUrl =
        typeof photo.download_url === 'string'
          ? photo.download_url
          : typeof photo.downloadUrl === 'string'
            ? photo.downloadUrl
            : ''
      const width = asFiniteNumber(photo.width)
      const height = asFiniteNumber(photo.height)
      const sizeBytes =
        asFiniteNumber(photo.size_bytes) ??
        asFiniteNumber(photo.sizeBytes)

      if (
        !id ||
        !storagePath ||
        !downloadUrl ||
        !contentType ||
        width === undefined ||
        height === undefined ||
        sizeBytes === undefined
      ) {
        return null
      }

      const thumbnailPath =
        typeof photo.thumbnail_path === 'string'
          ? photo.thumbnail_path
          : typeof photo.thumbnailPath === 'string'
            ? photo.thumbnailPath
            : undefined
      const thumbnailUrl =
        typeof photo.thumbnail_url === 'string'
          ? photo.thumbnail_url
          : typeof photo.thumbnailUrl === 'string'
            ? photo.thumbnailUrl
            : undefined

      return {
        id,
        storagePath,
        downloadUrl,
        thumbnailPath,
        thumbnailUrl,
        width,
        height,
        contentType,
        sizeBytes,
        sortOrder:
          asFiniteNumber(photo.sort_order) ??
          asFiniteNumber(photo.sortOrder) ??
          index,
        schemaVersion: 1,
      }
    })
    .filter((photo): photo is ListingPhoto => photo !== null)
    .sort((a, b) => a.sortOrder - b.sortOrder)
}

const dataUrlToBlob = async (dataUrl: string): Promise<Blob> => {
  const response = await fetch(dataUrl)
  if (!response.ok) {
    throw new ServiceError('invalid', 'A listing photo could not be read.')
  }
  return response.blob()
}

const prepareDraftPhotos = async (
  imageUrls: string[],
): Promise<Array<{
  id: string
  blob: Blob
  contentType: ListingPhoto['contentType']
  sizeBytes: number
  sortOrder: number
}>> => {
  const dataEntries = imageUrls
    .map((url, sortOrder) => ({ url, sortOrder }))
    .filter(({ url }) => url.startsWith('data:image/'))
  const photos = []

  for (const { url, sortOrder } of dataEntries) {
    const blob = await dataUrlToBlob(url)
    const contentType = PHOTO_CONTENT_TYPES.find((type) => type === blob.type)
    if (!contentType) {
      throw new ServiceError(
        'invalid',
        'Listing photos must be JPEG, PNG, or WebP images.',
      )
    }
    if (blob.size === 0 || blob.size >= 5 * 1024 * 1024) {
      throw new ServiceError('invalid', 'Each listing photo must be smaller than 5 MiB.')
    }
    photos.push({
      id: createId('photo'),
      blob,
      contentType,
      sizeBytes: blob.size,
      sortOrder,
    })
  }

  return photos
}

const uploadReservedPhotos = async (
  reservation: ListingMediaReservation,
  photos: Awaited<ReturnType<typeof prepareDraftPhotos>>,
): Promise<void> => {
  const storage = getFirebaseStorage()
  for (const upload of reservation.uploads) {
    const photo = photos.find((candidate) => candidate.id === upload.fileName.replace(/\.(jpg|png|webp)$/, ''))
    if (!photo) {
      throw new ServiceError('invalid', 'The listing photo reservation changed. Try again.')
    }
    await uploadBytes(storageRef(storage, upload.path), photo.blob, {
      contentType: photo.contentType,
    })
  }
}

export function toListing(id: string, data: Record<string, any>): Listing {
  const rawStatus = STATUSES.includes(data.status) ? data.status : 'active'
  const campus: CampusId = data.campus === 'manila' || data.campus === 'qc' ? data.campus : 'qc'
  const category: Category = (data.category as Category) || 'Textbooks'
  const photos = parsePhotos(data.photos)
  const photoUrls = photos.map(
    (photo) => photo.thumbnailUrl || photo.downloadUrl,
  )
  const parsedImages = parseImageList(data.image_ids)
  const legacyImageUrls =
    parsedImages.length > 0 ? parsedImages : parseImageList(data.imageUrls)
  const imageUrls = photoUrls.length > 0 ? photoUrls : legacyImageUrls
  const cover =
    photoUrls.length > 0
      ? photoUrls[0]
      : typeof data.imageUrl === 'string' && data.imageUrl
        ? data.imageUrl
        : imageUrls[0]
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
    photos,
    listingVersion:
      typeof data.listing_version === 'number' ? data.listing_version : 0,
    imageUrl: cover || fallbackImage,
    imageUrls: hasRealImage ? realImages : [fallbackImage],
    sellerId: data.seller_id || data.sellerId || '',
    meetupSpot: data.meetup_spot || data.meetupSpot || 'Library Plaza',
    campus,
    status: rawStatus,
    createdAt: data.createdAt || data.created_at || new Date().toISOString(),
  }
}

const runMediaMutation = async (input: {
  kind: 'create' | 'update'
  draft: ListingDraft
  campus: CampusId
  listingId?: string
  expectedListingVersion: number
  currentPhotos?: ListingPhoto[]
}): Promise<Listing> => {
  const department = departmentFor(normalizeSubjectCode(input.draft.courseCode))
  const currentPhotos = input.currentPhotos ?? []
  const retainedUrls = new Set(
    input.draft.imageUrls.filter((url) => !url.startsWith('data:image/')),
  )
  const retainedPhotoIds = currentPhotos
    .filter((photo) => retainedUrls.has(photo.thumbnailUrl || photo.downloadUrl))
    .map((photo) => photo.id)
  const preparedPhotos = await prepareDraftPhotos(input.draft.imageUrls)
  const operationId = createId('media')

  const reservation = await callReserveListingMedia({
    operationId,
    kind: input.kind,
    listingId: input.listingId,
    expectedListingVersion: input.expectedListingVersion,
    draft: input.draft,
    campus: input.campus,
    department,
    retainedPhotoIds,
    photos: preparedPhotos.map(({ id, contentType, sizeBytes, sortOrder }) => ({
      id,
      contentType,
      sizeBytes,
      sortOrder,
    })),
  })

  try {
    await uploadReservedPhotos(reservation, preparedPhotos)
  } catch (error) {
    if (error instanceof ServiceError) throw error
    console.error('[TIPalit Firebase Listings] Failed to upload reserved photos:', error)
    throw new ServiceError('storage', "Couldn't upload listing photos. Try again.")
  }

  const result = await callFinalizeListingMedia(operationId)
  const finalizedSnap = await getDoc(doc(getFirebaseDb(), 'listings', result.listingId))
  if (!finalizedSnap.exists()) {
    throw new ServiceError('not_found', 'This listing no longer exists.')
  }
  return toListing(finalizedSnap.id, finalizedSnap.data())
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
        where('status', 'in', ['active', 'reserved', 'sold']),
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
      return runMediaMutation({
        kind: 'create',
        draft,
        campus: ctx.campus,
        expectedListingVersion: 0,
      })
    },

    async update(id: string, patch: ListingDraft): Promise<Listing> {
      const currentSnap = await getDoc(doc(listingsCol, id))
      if (!currentSnap.exists()) {
        throw new ServiceError('not_found', 'This listing no longer exists.')
      }
      const current = toListing(id, currentSnap.data())
      return runMediaMutation({
        kind: 'update',
        draft: patch,
        campus: current.campus,
        listingId: id,
        expectedListingVersion: current.listingVersion ?? 0,
        currentPhotos: current.photos,
      })
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
      try {
        const currentSnap = await getDoc(doc(listingsCol, id))
        if (!currentSnap.exists()) {
          throw new ServiceError('not_found', 'This listing no longer exists.')
        }
        const current = toListing(id, currentSnap.data())
        await callDeleteListingMedia(
          id,
          current.listingVersion ?? 0,
          createId('media-delete'),
        )
      } catch (err) {
        if (err instanceof ServiceError) throw err
        console.error('[TIPalit Firebase Listings] Remove error:', err)
        throw new ServiceError('network', "Couldn't remove listing.")
      }
    },
  }
}
