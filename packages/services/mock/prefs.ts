import type { Prefs, PrefsService } from '../types'
import { delay } from './latency'
import { hasShape, read, write } from './storage'

const DEFAULT_PREFS: Prefs = { theme: 'light', introSeen: false }

const isPrefs = hasShape<Prefs>({ theme: 'string', introSeen: 'boolean' })

const load = () => read<Prefs>('prefs', () => ({ ...DEFAULT_PREFS }), isPrefs)

export function createMockPrefs(): PrefsService {
  return {
    async get() {
      await delay(150)
      return load()
    },
    async set(patch) {
      const next = { ...load(), ...patch }
      write('prefs', next)
      return next
    },
  }
}
