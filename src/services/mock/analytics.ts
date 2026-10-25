import type { AnalyticsService } from '../types'
import { delay } from './latency'
import { loadListings } from './listings'
import { loadReviews } from './chat'
import { loadReports } from './reports'
import { hasShape, isArrayOf, read, write } from './storage'

type AnalyticsEvent = {
  id: string
  name: string
  properties?: Record<string, string | number | boolean>
  at: string
}

const isEvents = isArrayOf(hasShape<AnalyticsEvent>({ id: 'string', name: 'string', at: 'string' }))

const EVENT_KEY = 'analyticsEvents'
let eventCounter = 0

export function createMockAnalytics(): AnalyticsService {
  return {
    async getOverview() {
      await delay(200)
      const listings = loadListings()
      const reports = loadReports()
      const active = listings.filter((listing) => listing.status === 'active')
      const completed = listings.filter((listing) => listing.status === 'sold')
      const reviews = Object.values(loadReviews())
      const ratingTotal = reviews.reduce((sum, review) => sum + review.rating, 0)
      return {
        members: 3,
        activeListings: active.length,
        openReports: reports.filter((report) => report.status === 'open').length,
        completedExchanges: completed.length,
        averageRating: reviews.length > 0 ? Math.round((ratingTotal / reviews.length) * 10) / 10 : 0,
      }
    },

    async track(event, properties) {
      const events = read<AnalyticsEvent[]>(EVENT_KEY, () => [], isEvents)
      events.push({
        id: `e${++eventCounter}`,
        name: event,
        properties,
        at: new Date().toISOString(),
      })
      write(EVENT_KEY, events)
    },
  }
}
