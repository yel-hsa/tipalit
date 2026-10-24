import { doc, getDoc } from 'firebase/firestore'
import { MEETUP_SPOTS } from '../../data/seed'
import type { MeetupSpots, SettingsService } from '../types'
import { getFirebaseDb, isFirebaseConfigured } from './config'

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
        const spotsDocRef = doc(db, 'settings', 'meetup_spots')
        const snapshot = await getDoc(spotsDocRef)

        if (snapshot.exists()) {
          const data = snapshot.data()
          if (Array.isArray(data.qc) && Array.isArray(data.manila)) {
            return {
              qc: data.qc,
              manila: data.manila,
            }
          }
        }
      } catch (err) {
        console.warn('[TIPalit Firebase Settings] Error loading meetup spots:', err)
      }

      return defaultSpots
    },
  }
}
