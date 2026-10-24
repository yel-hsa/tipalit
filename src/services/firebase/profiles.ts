import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection, query, where, documentId } from 'firebase/firestore'
import { SEED_ADMIN_PROFILES, SELLERS } from '../../data/seed'
import { initialsOf } from '../profile'
import type { CampusId, Profile, ProfileService, Seller } from '../types'
import { getFirebaseDb } from './config'

const seedProfilesMap = (): Record<string, Profile> =>
  Object.fromEntries(SEED_ADMIN_PROFILES().map((profile) => [profile.userId, profile]))

const toSeller = (profile: Profile): Seller | null =>
  profile.campus
    ? {
        id: profile.userId,
        name: profile.name,
        initials: initialsOf(profile.name),
        program: profile.program,
        year: profile.year,
        campus: profile.campus,
        verified: true,
      }
    : null

/** Maps the Cloud Function's aggregate fields onto the public seller card. */
const withReputation = (seller: Seller, data: Record<string, any> | undefined): Seller => {
  if (!data) return seller
  const rating = Number(data.average_rating)
  const reviews = Number(data.total_reviews)
  if (!Number.isFinite(rating) || rating <= 0 || !Number.isFinite(reviews) || reviews <= 0) return seller
  return { ...seller, rating: Math.round(rating * 10) / 10, reviews }
}

export function createFirebaseProfiles(): ProfileService {
  const db = getFirebaseDb()

  return {
    async get(userId: string): Promise<Profile | null> {
      try {
        const docRef = doc(db, 'users_profile', userId)
        const snapshot = await getDoc(docRef)

        if (snapshot.exists()) {
          const data = snapshot.data()
          const campusVal: CampusId | null =
            data.campus === 'manila' || data.campus === 'qc' ? data.campus : null

          return {
            userId: data.user_id || userId,
            name: data.full_name || data.name || 'TIP Student',
            email: data.email,
            campus: campusVal,
            program: data.department || data.program || '',
            year: data.year || '',
            joinedAt: data.joinedAt || new Date().toISOString(),
            safetyAcceptedAt: data.safetyAcceptedAt,
            onboardedAt: data.onboardedAt,
          }
        }

        // Fall back to seed admin profiles if applicable
        return seedProfilesMap()[userId] ?? null
      } catch (err) {
        console.warn(`[TIPalit Firebase Profiles] Error getting profile for ${userId}:`, err)
        return seedProfilesMap()[userId] ?? null
      }
    },

    async save(profile: Profile): Promise<Profile> {
      try {
        const docRef = doc(db, 'users_profile', profile.userId)
        // Firestore rules: identity fields (user_id, email, is_verified) and
        // privileged fields (role, status) may only be set on create; updates
        // are restricted to the editable profile keys, verbatim.
        const base = {
          full_name: profile.name,
          campus: profile.campus,
          department: profile.program,
          program: profile.program,
          year: profile.year,
          joinedAt: profile.joinedAt,
          safetyAcceptedAt: profile.safetyAcceptedAt || null,
          onboardedAt: profile.onboardedAt || null,
          updated_at: serverTimestamp(),
        }
        const existing = await getDoc(docRef)
        if (existing.exists()) {
          await setDoc(docRef, base, { merge: true })
        } else {
          await setDoc(
            docRef,
            {
              ...base,
              user_id: profile.userId,
              email: profile.email || '',
              is_verified: true,
              role: 'member',
              status: 'active',
            },
            { merge: true },
          )
        }
        return profile
      } catch (err) {
        console.error('[TIPalit Firebase Profiles] Error saving profile:', err)
        throw err
      }
    },

    async getSellers(ids: string[]): Promise<Seller[]> {
      if (ids.length === 0) return []

      const result: Seller[] = []
      const missingIds: string[] = []

      // 1. Check known SELLERS first — their aggregates live on their
      //    users_profile docs, which may not exist for seed ids, so read
      //    them best-effort without blocking the card.
      for (const id of ids) {
        const seedSeller = SELLERS.find((s) => s.id === id)
        if (seedSeller) {
          result.push(seedSeller)
        } else {
          missingIds.push(id)
        }
      }

      if (missingIds.length === 0) return result

      try {
        // 2. Fetch missing sellers from Firestore in batches of 10 (Firestore 'in' query limit is 30)
        const batchSize = 10
        for (let i = 0; i < missingIds.length; i += batchSize) {
          const slice = missingIds.slice(i, i + batchSize)
          const q = query(collection(db, 'users_profile'), where(documentId(), 'in', slice))
          const querySnap = await getDocs(q)
          querySnap.forEach((docSnap) => {
            const data = docSnap.data()
            const campusVal: CampusId | null =
              data.campus === 'manila' || data.campus === 'qc' ? data.campus : null

            if (campusVal) {
              const name = data.full_name || data.name || 'TIP Student'
              result.push(
                withReputation(
                  {
                    id: docSnap.id,
                    name,
                    initials: initialsOf(name),
                    program: data.department || data.program || 'Student',
                    year: data.year || '1st Year',
                    campus: campusVal,
                    verified: true,
                  },
                  data,
                ),
              )
            }
          })
        }
      } catch (err) {
        console.warn('[TIPalit Firebase Profiles] Error fetching seller batch:', err)
      }

      return result
    },
  }
}
