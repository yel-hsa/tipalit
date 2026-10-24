import { SELLERS } from '../../data/seed'
import type { CampusId, Profile } from '../types'
import { loadProfiles } from './profiles'

/** Everyone the mock knows about: seeded sellers plus anyone who has signed in. */
export type Person = {
  userId: string
  name: string
  email: string
  campus: CampusId | null
  program: string
  year: string
  joinedAt: string | null
}

const emailFromName = (name: string) =>
  `${name.trim().toLowerCase().replace(/[^a-z\s]/g, '').split(/\s+/).join('.')}@tip.edu.ph`

const fromProfile = (profile: Profile): Person => ({
  userId: profile.userId,
  name: profile.name,
  email: profile.email ?? emailFromName(profile.name),
  campus: profile.campus,
  program: profile.program,
  year: profile.year,
  joinedAt: profile.joinedAt,
})

export const listPeople = (): Person[] => {
  const seeded: Person[] = SELLERS.map((seller) => ({
    userId: seller.id,
    name: seller.name,
    email: emailFromName(seller.name),
    campus: seller.campus,
    program: seller.program,
    year: seller.year,
    joinedAt: null,
  }))
  return [...seeded, ...Object.values(loadProfiles()).filter((profile) => profile.name.trim()).map(fromProfile)]
}

export const findPerson = (userId: string) => listPeople().find((person) => person.userId === userId) ?? null
