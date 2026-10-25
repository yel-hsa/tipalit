import { addDoc, collection, getDocs } from 'firebase/firestore'
import type { AnalyticsService, AnalyticsOverview } from '../types'
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './config'

export function createFirebaseAnalytics(): AnalyticsService {
  const db = getFirebaseDb()
  const auth = getFirebaseAuth()

  return {
    async getOverview(): Promise<AnalyticsOverview> {
      if (!isFirebaseConfigured()) {
        return { members: 0, activeListings: 0, openReports: 0, completedExchanges: 0, averageRating: 0 }
      }

      try {
        const [listingsSnap, reportsSnap, usersSnap, reviewsSnap] = await Promise.all([
          getDocs(collection(db, 'listings')),
          getDocs(collection(db, 'reports')),
          getDocs(collection(db, 'users')),
          getDocs(collection(db, 'reviews')),
        ])

        let activeListings = 0
        let completedExchanges = 0
        listingsSnap.forEach((docSnap) => {
          const status = docSnap.data().status
          if (status === 'active') activeListings += 1
          if (status === 'sold') completedExchanges += 1
        })

        let openReports = 0
        reportsSnap.forEach((docSnap) => {
          if (docSnap.data().status === 'open') openReports += 1
        })

        let ratingTotal = 0
        reviewsSnap.forEach((docSnap) => {
          const rating = Number(docSnap.data().rating)
          if (Number.isFinite(rating) && rating > 0) ratingTotal += rating
        })

        return {
          members: usersSnap.size,
          activeListings,
          openReports,
          completedExchanges,
          averageRating: reviewsSnap.size > 0 ? Math.round((ratingTotal / reviewsSnap.size) * 10) / 10 : 0,
        }
      } catch (err) {
        console.warn('[TIPalit Firebase Analytics] Error computing overview:', err)
        return { members: 0, activeListings: 0, openReports: 0, completedExchanges: 0, averageRating: 0 }
      }
    },

    async track(event: string, properties?: Record<string, string | number | boolean>): Promise<void> {
      if (!isFirebaseConfigured()) return
      try {
        // analytics must never break the user action it records
        await addDoc(collection(db, 'analytics_events'), {
          name: event,
          properties: properties ?? {},
          user_id: auth.currentUser?.uid ?? null,
          created_at: new Date().toISOString(),
        })
      } catch (err) {
        console.warn('[TIPalit Firebase Analytics] Error tracking event:', err)
      }
    },
  }
}
