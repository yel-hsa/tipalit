import { doc, getDoc, setDoc, serverTimestamp, getDocs, collection, query, where, documentId } from 'firebase/firestore'
import { SEED_ADMIN_PROFILES, SELLERS } from '../seed'
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

// spark plan: no cloud function maintains average_rating, so ratings are aggregated on read
const fetchReputation = async (db: ReturnType<typeof getFirebaseDb>, ids: string[]) => {
  const aggregation = new Map<string, { total: number; count: number }>()

  // one query per seller; App.tsx caches cards by id, so cost is bounded
  const perSeller = await Promise.all(
    ids.map(async (id) => {
      try {
        const snapshot = await getDocs(query(collection(db, 'reviews'), where('reviewee_id', '==', id)))
        const ratings: number[] = []
        snapshot.forEach((docSnap) => {
          const value = Number(docSnap.data().rating)
          if (Number.isFinite(value)) ratings.push(value)
        })
        return { id, ratings }
      } catch (err) {
        console.warn(`[TIPalit Firebase Profiles] Error reading reviews for ${id}:`, err)
        return { id, ratings: [] as number[] }
      }
    }),
  )
  for (const { id, ratings } of perSeller) {
    const total = ratings.reduce((sum, value) => sum + value, 0)
    aggregation.set(id, { total, count: ratings.length })
  }
  return aggregation
}

// no reviews means the base card (seed aggregate or none) stands
const withReputation = (
  seller: Seller,
  reputation: { total: number; count: number } | undefined,
): Seller => {
  if (!reputation || reputation.count <= 0) return seller
  // one decimal, matching the mock adapter
  const rating = Math.round((reputation.total / reputation.count) * 10) / 10
  return { ...seller, rating, reviews: reputation.count }
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

        // seed admins have no users_profile doc
        return seedProfilesMap()[userId] ?? null
      } catch (err) {
        console.warn(`[TIPalit Firebase Profiles] Error getting profile for ${userId}:`, err)
        return seedProfilesMap()[userId] ?? null
      }
    },

    async save(profile: Profile): Promise<Profile> {
      try {
        const docRef = doc(db, 'users_profile', profile.userId)
        // rules only allow identity and role fields on create, so updates send base alone
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

      // ratings come from reviews, never the stale profile aggregate
      const reputation = await fetchReputation(db, ids)
      const reputationOf = (id: string) => reputation.get(id)

      const result: Seller[] = []
      const missingIds: string[] = []

      // seed sellers have no users_profile doc
      for (const id of ids) {
        const seedSeller = SELLERS.find((s) => s.id === id)
        if (seedSeller) {
          result.push(withReputation(seedSeller, reputationOf(id)))
        } else {
          missingIds.push(id)
        }
      }

      if (missingIds.length === 0) return result

      try {
        // firestore 'in' queries are capped at 30 ids
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
                  reputationOf(docSnap.id),
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
