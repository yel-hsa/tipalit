import { doc, getDoc } from 'firebase/firestore'
import { MEETUP_SPOTS } from '../../data/seed'
import type { CampusId, MeetupSpots, SettingsService } from '../types'
import { getFirebaseDb, isFirebaseConfigured } from './config'

/**
 * Live Firestore document that holds the admin-approved meetup spots.
 * Historical note: the code once read/wrote `settings/meetup_spots`, but the
 * live database holds `settings/campus_meetup_spots` — saved spots were never
 * read and every campus silently fell back to seed values.
 */
export const MEETUP_SPOTS_DOC_ID = 'campus_meetup_spots'

const CAMPUSES: CampusId[] = ['qc', 'manila']

/**
 * Normalises a single campus value into a string array.
 *
 * Live data stores spots as a *stringified* array, in two shapes:
 *   - '["Arlegui Gate 1","Casal Student Lounge"]'  (JSON)
 *   - '[Arlegui Gate 1, Casal Student Lounge]'     (bracketed, unquoted)
 * Real arrays (what the admin write path stores) are used as-is.
 * Anything that yields no usable entries returns an empty array so the caller
 * can fall back to defaults.
 */
export function parseSpotList(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value
      .filter((spot): spot is string => typeof spot === 'string')
      .map((spot) => spot.trim())
      .filter((spot) => spot.length > 0)
  }

  if (typeof value !== 'string') {
    return []
  }

  const trimmed = value.trim()
  if (!trimmed) {
    return []
  }

  // JSON array: '["a","b"]' (also tolerates single-quoted strings inside).
  if (trimmed.startsWith('[')) {
    try {
      const parsed: unknown = JSON.parse(trimmed)
      if (Array.isArray(parsed)) {
        return parseSpotList(parsed)
      }
    } catch {
      // Not valid JSON — fall through to the bracketed/unquoted split below.
    }

    const inner = trimmed.slice(1, trimmed.endsWith(']') ? -1 : undefined)
    return splitBracketedList(inner)
  }

  // Bare comma-separated string: 'a, b'.
  return splitBracketedList(trimmed)
}

const splitBracketedList = (inner: string): string[] =>
  inner
    .split(',')
    .map((spot) => stripQuotes(spot.trim()))
    .filter((spot) => spot.length > 0)

const stripQuotes = (spot: string): string => {
  if (spot.length >= 2) {
    const first = spot[0]
    const last = spot[spot.length - 1]
    if ((first === '"' && last === '"') || (first === "'" && last === "'")) {
      return spot.slice(1, -1).trim()
    }
  }
  return spot
}

/**
 * Tolerantly reads the meetup spots document data into `MeetupSpots`.
 * Per-campus values that parse to nothing fall back to the seed defaults.
 */
export function readMeetupSpots(
  data: Record<string, unknown> | undefined,
  fallback: MeetupSpots,
): MeetupSpots {
  const result: MeetupSpots = { qc: [...fallback.qc], manila: [...fallback.manila] }

  if (!data) {
    return result
  }

  for (const campus of CAMPUSES) {
    const spots = parseSpotList(data[campus])
    if (spots.length > 0) {
      result[campus] = spots
    }
  }

  return result
}

export function createFirebaseSettings(): SettingsService {
  const db = getFirebaseDb()

  return {
    async getMeetupSpots(): Promise<MeetupSpots> {
      const defaultSpots: MeetupSpots = {
        qc: [...MEETUP_SPOTS.qc],
        manila: [...MEETUP_SPOTS.manila],
      }

      if (!isFirebaseConfigured()) {
        return defaultSpots
      }

      try {
        const spotsDocRef = doc(db, 'settings', MEETUP_SPOTS_DOC_ID)
        const snapshot = await getDoc(spotsDocRef)

        if (snapshot.exists()) {
          return readMeetupSpots(snapshot.data(), defaultSpots)
        }
      } catch (err) {
        console.warn('[TIPalit Firebase Settings] Error loading meetup spots:', err)
      }

      return defaultSpots
    },
  }
}
