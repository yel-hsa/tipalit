import { SEED_ADMIN_PROFILES, SELLERS } from '../../data/seed'
import { initialsOf } from '../profile'
import type { Profile, ProfileService, Seller } from '../types'
import { loadReviews } from './chat'
import { delay } from './latency'
import { hasShape, isRecordOf, read, write } from './storage'

const isProfiles = isRecordOf(hasShape<Profile>({ userId: 'string', name: 'string', program: 'string', year: 'string' }))

const seedProfiles = () => Object.fromEntries(SEED_ADMIN_PROFILES().map((profile) => [profile.userId, profile]))

/** Profiles saved by onboarding or edits, i.e. the writable half of the store. */
const loadStored = () => read<Record<string, Profile>>('profiles', () => ({}), isProfiles)
/** Stored profiles, plus staff profiles that exist before their first sign-in. */
export const loadProfiles = (): Record<string, Profile> => ({ ...seedProfiles(), ...loadStored() })

export const saveProfile = (profile: Profile): Profile => {
  write('profiles', { ...loadStored(), [profile.userId]: profile })
  return profile
}

/*
 * First sign-in stub, mirroring the Firebase create: the required shape for
 * hasShape (userId/name/program/year) but no campus, so isProfileComplete()
 * stays false and onboarding runs. Roles are never stored here — the session
 * derives them from the email.
 */
export const createSignInProfile = (userId: string, name: string, email: string): Profile => ({
  userId,
  name,
  email,
  campus: null,
  program: '',
  year: '',
  joinedAt: new Date().toISOString(),
})

/** Average stars + count of reviews the given user has received. */
const reputationFor = (userId: string): Pick<Seller, 'rating' | 'reviews'> | null => {
  const received = Object.values(loadReviews()).filter((review) => review.revieweeId === userId)
  if (received.length === 0) return null
  const total = received.reduce((sum, review) => sum + review.rating, 0)
  return { rating: Math.round((total / received.length) * 10) / 10, reviews: received.length }
}
const load = loadProfiles

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
        ...reputationFor(profile.userId),
      }
    : null

export function createMockProfiles(): ProfileService {
  return {
    async get(userId) {
      await delay(300)
      return load()[userId] ?? null
    },

    async save(profile) {
      await delay()
      return saveProfile(profile)
    },

    async getSellers(ids) {
      await delay(150)
      const profiles = load()
      return ids
        .map((id) => {
          const seedSeller = SELLERS.find((seller) => seller.id === id)
          const base = seedSeller ?? (profiles[id] ? toSeller(profiles[id]) : null)
          if (!base) return null
          // Live reviews outweigh the seed aggregate once the store has them.
          const live = reputationFor(id)
          return live ? { ...base, ...live } : base
        })
        .filter((seller): seller is Seller => !!seller)
    },
  }
}
