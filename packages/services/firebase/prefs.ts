import { getPlatform } from '../platform'
import type { Prefs, PrefsService } from '../types'

const PREFS_KEY = 'tipalit.v1.prefs'

const defaultPrefs: Prefs = {
  theme: 'light',
  introSeen: false,
}

export function createFirebasePrefs(): PrefsService {
  return {
    async get(): Promise<Prefs> {
      try {
        const stored = getPlatform().storage.getItem(PREFS_KEY)
        if (stored) {
          return { ...defaultPrefs, ...JSON.parse(stored) }
        }
      } catch (err) {
        console.warn('[TIPalit Prefs] Error reading local prefs:', err)
      }
      return defaultPrefs
    },

    async set(patch: Partial<Prefs>): Promise<Prefs> {
      try {
        const current = await this.get()
        const next = { ...current, ...patch }
        getPlatform().storage.setItem(PREFS_KEY, JSON.stringify(next))
        return next
      } catch (err) {
        console.warn('[TIPalit Prefs] Error saving local prefs:', err)
        return { ...defaultPrefs, ...patch }
      }
    },
  }
}
