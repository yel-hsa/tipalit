import type { CampusId, Profile } from './types'

export type CompleteProfile = Profile & { campus: CampusId }

export const isProfileComplete = (profile: Profile | null): profile is CompleteProfile =>
  !!profile && !!profile.name.trim() && !!profile.campus && !!profile.program && !!profile.year

export const initialsOf = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  if (parts.length === 0) return 'TS'
  const letters = parts.length > 1 ? parts[0][0] + parts[parts.length - 1][0] : parts[0].slice(0, 2)
  return letters.toUpperCase()
}

export const firstNameOf = (name: string) => name.trim().split(/\s+/)[0] || name
