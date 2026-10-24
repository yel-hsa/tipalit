import { buildSeedListings, CATEGORY_FALLBACK_IMAGES, departmentFor } from '../../data/seed'
import { ServiceError } from '../errors'
import { createId } from '../ids'
import type { Listing, ListingDraft, ListingService } from '../types'
import { loadStatuses } from './accounts'
import { consumeOnce } from './controls'
import { delay } from './latency'
import { hasShape, isArrayOf, read, write } from './storage'

const isListings = isArrayOf(
  hasShape<Listing>({ id: 'string', title: 'string', price: 'number', campus: 'string', status: 'string', createdAt: 'string' }),
)

export const loadListings = () => read<Listing[]>('listings', () => buildSeedListings(), isListings)
export const saveListings = (listings: Listing[]) => write('listings', listings)
const load = loadListings
const save = saveListings

const newestFirst = (a: Listing, b: Listing) => b.createdAt.localeCompare(a.createdAt)

const failLoad = () => {
  if (consumeOnce('failNextLoad')) throw new ServiceError('network', "Couldn't load data.")
}

const fromDraft = (draft: ListingDraft) => {
  const imageUrls = draft.imageUrls.length > 0 ? draft.imageUrls : [CATEGORY_FALLBACK_IMAGES[draft.category]]
  return {
    title: draft.title,
    price: draft.price,
    transactionType: draft.transactionType,
    courseCode: draft.courseCode,
    category: draft.category,
    department: departmentFor(draft.courseCode),
    condition: draft.condition,
    description: draft.description || 'No description provided.',
    imageUrls,
    imageUrl: imageUrls[0],
    meetupSpot: draft.meetupSpot,
  }
}

const patchListing = (id: string, patch: (listing: Listing) => Listing) => {
  const listings = load()
  const index = listings.findIndex((listing) => listing.id === id)
  if (index === -1) throw new ServiceError('not_found', 'This listing no longer exists.')
  listings[index] = patch(listings[index])
  save(listings)
  return listings[index]
}

export function createMockListings(): ListingService {
  return {
    async list({ campus }) {
      await delay()
      failLoad()
      // Suspended members' listings are hidden from the feed, not deleted.
      const statuses = loadStatuses()
      return load()
        .filter(
          (listing) =>
            listing.campus === campus && listing.status === 'active' && statuses[listing.sellerId] !== 'suspended',
        )
        .sort(newestFirst)
    },

    async listMine(userId) {
      await delay()
      failLoad()
      return load()
        .filter((listing) => listing.sellerId === userId)
        .sort(newestFirst)
    },

    async getMany(ids) {
      await delay(150)
      return load().filter((listing) => ids.includes(listing.id))
    },

    async create(draft, { userId, campus }) {
      await delay(900)
      if (consumeOnce('failNextPublish')) throw new ServiceError('network', "Couldn't publish. Check your connection.")
      const listing: Listing = {
        id: createId('l'),
        ...fromDraft(draft),
        sellerId: userId,
        campus,
        status: 'active',
        createdAt: new Date().toISOString(),
      }
      save([listing, ...load()])
      return listing
    },

    async update(id, draft) {
      await delay(900)
      if (consumeOnce('failNextPublish')) throw new ServiceError('network', "Couldn't save changes. Check your connection.")
      return patchListing(id, (listing) => ({ ...listing, ...fromDraft(draft) }))
    },

    async setStatus(id, status) {
      await delay(400)
      return patchListing(id, (listing) => ({ ...listing, status }))
    },

    async remove(id) {
      await delay(400)
      save(load().filter((listing) => listing.id !== id))
    },
  }
}
