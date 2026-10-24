import { SEED_REVIEWS, SEED_THREADS, SELLER_REPLIES } from '../../data/seed'
import { ServiceError } from '../errors'
import { createId } from '../ids'
import type { ChatEvent, ChatItem, ChatService, ListingStatus, MeetupItem, Review, Thread } from '../types'
import { readSession } from './auth'
import { consumeOnce, mockControls } from './controls'
import { delay } from './latency'
import { hasShape, isArrayOf, isRecordOf, read, write } from './storage'
import { loadListings, saveListings } from './listings'

const isThreads = isArrayOf(hasShape<Thread>({ id: 'string', listingId: 'string', sellerId: 'string', items: 'object' }))
const isReviews = isRecordOf(
  hasShape<Review>({ id: 'string', rating: 'number', comment: 'string', revieweeId: 'string', createdAt: 'string' }),
)

/** Reviews are global (both sides read them); ids are review ids. */
export const loadReviews = () =>
  read<Record<string, Review>>('reviews', () => Object.fromEntries(SEED_REVIEWS.map((r) => [r.id, r])), isReviews)

/*
 * Threads are stored per signed-in user. Seller behaviour (typing, replies,
 * accepting or declining meetups) is simulated here and pushed through
 * `subscribe`, the same way a realtime backend would deliver it.
 */
export function createMockChat() {
  const listeners = new Set<(event: ChatEvent) => void>()
  let timers: number[] = []
  let replyIndex = 0

  const storageKey = () => {
    const session = readSession()
    if (!session) throw new ServiceError('unauthenticated', 'Sign in to use chat.')
    return `threads.${session.userId}`
  }
  const load = () => read<Thread[]>(storageKey(), () => structuredClone(SEED_THREADS), isThreads)
  const save = (threads: Thread[]) => write(storageKey(), threads)

  const mutate = (threadId: string, change: (thread: Thread) => Thread) => {
    const threads = load()
    const index = threads.findIndex((thread) => thread.id === threadId)
    if (index === -1) throw new ServiceError('not_found', 'This conversation no longer exists.')
    threads[index] = change(threads[index])
    save(threads)
    return threads[index]
  }
  const append = (threadId: string, item: ChatItem) =>
    mutate(threadId, (thread) => ({ ...thread, items: [...thread.items, item] }))
  const patchMeetup = (threadId: string, itemId: string, patch: Partial<MeetupItem>): MeetupItem => {
    const thread = mutate(threadId, (current) => ({
      ...current,
      items: current.items.map((item) => (item.id === itemId && item.kind === 'meetup' ? { ...item, ...patch } : item)),
    }))
    const updated = thread.items.find((item): item is MeetupItem => item.id === itemId && item.kind === 'meetup')
    if (!updated) throw new ServiceError('not_found', 'This meetup no longer exists.')
    return updated
  }

  const emit = (event: ChatEvent) => listeners.forEach((listener) => listener(event))
  const later = (run: () => void, ms: number) => {
    timers.push(
      window.setTimeout(() => {
        try {
          run()
        } catch {
          // The thread was removed or the user signed out; drop the simulated event.
        }
      }, ms),
    )
  }

  const service: ChatService = {
    async listThreads() {
      await delay()
      if (consumeOnce('failNextLoad')) throw new ServiceError('network', "Couldn't load chats.")
      return load()
    },

    async openThread(listing) {
      await delay(250)
      const threads = load()
      const existing = threads.find((thread) => thread.listingId === listing.id)
      if (existing) return existing
      const thread: Thread = { id: createId('t'), listingId: listing.id, sellerId: listing.sellerId, items: [] }
      save([thread, ...threads])
      return thread
    },

    async sendMessage(threadId, { id, text }) {
      await delay(250)
      const item: ChatItem = { id, kind: 'message', from: 'me', text }
      append(threadId, item)
      later(() => emit({ type: 'typing', threadId, typing: true }), 400)
      later(() => {
        const reply: ChatItem = {
          id: createId('m'),
          kind: 'message',
          from: 'seller',
          text: SELLER_REPLIES[replyIndex++ % SELLER_REPLIES.length],
        }
        emit({ type: 'typing', threadId, typing: false })
        append(threadId, reply)
        emit({ type: 'message', threadId, item: reply })
      }, 1200)
      return item
    },

    async proposeMeetup(threadId, { id, location, time }) {
      await delay(300)
      const item: MeetupItem = { id, kind: 'meetup', from: 'me', time, location, status: 'pending' }
      append(threadId, item)
      later(() => {
        const declines = mockControls.sellerDeclines
        const updated = patchMeetup(threadId, id, { status: declines ? 'declined' : 'accepted' })
        const reply: ChatItem = {
          id: createId('m'),
          kind: 'message',
          from: 'seller',
          text: declines ? "Can't make that one, can you pick another time?" : `${time} works. See you at ${location}!`,
        }
        append(threadId, reply)
        emit({ type: 'meetupUpdated', threadId, item: updated })
        emit({ type: 'message', threadId, item: reply })
      }, 1500)
      return item
    },

    async respondToMeetup(threadId, itemId, status, reply) {
      await delay(250)
      patchMeetup(threadId, itemId, { status })
      append(threadId, { id: reply.id, kind: 'message', from: 'me', text: reply.text })
    },

    async completeMeetup(threadId, itemId) {
      await delay(250)
      patchMeetup(threadId, itemId, { completed: true })
    },

    async rate(threadId, itemId, rating, comment) {
      await delay(250)
      patchMeetup(threadId, itemId, { completed: true, rating })
      // Record the review so seller cards and the analytics average can be
      // computed from real data instead of hard-coded numbers.
      const session = readSession()
      if (!session) throw new ServiceError('unauthenticated', 'Sign in to leave a review.')
      const thread = load().find((candidate) => candidate.id === threadId)
      if (!thread) return // meetup already patched; review needs no thread
      const listing = loadListings().find((item) => item.id === thread.listingId)
      const revieweeId = listing?.sellerId ?? thread.sellerId
      const review: Review = {
        id: itemId,
        rating,
        comment,
        reviewerId: session.userId,
        revieweeId,
        listingId: thread.listingId,
        threadId,
        createdAt: new Date().toISOString(),
      }
      write('reviews', { ...loadReviews(), [review.id]: review })
    },

    async listReviews(userId) {
      await delay(150)
      return Object.values(loadReviews())
        .filter((review) => review.revieweeId === userId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async setListingStatus(threadId, status) {
      await delay(250)
      const thread = load().find((candidate) => candidate.id === threadId)
      if (!thread) throw new ServiceError('not_found', 'This conversation no longer exists.')
      const listings = loadListings()
      const index = listings.findIndex((listing) => listing.id === thread.listingId)
      if (index === -1) return // listing deleted; nothing to update
      listings[index] = { ...listings[index], status }
      saveListings(listings)
    },

    subscribe(listener) {
      listeners.add(listener)
      return () => {
        listeners.delete(listener)
      }
    },
  }

  return {
    service,
    /** Cancels simulated seller activity (on sign-out and demo reset). */
    cancelPending() {
      timers.forEach((timer) => window.clearTimeout(timer))
      timers = []
    },
  }
}
