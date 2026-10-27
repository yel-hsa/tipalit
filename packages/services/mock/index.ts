import type { Services } from '../types'
import { createFirebaseAuth } from '../firebase/auth'
import { createMockAdmin } from './admin'
import { createMockAnalytics } from './analytics'
import { createMockChat } from './chat'
import { DEFAULT_CONTROLS, mockControls } from './controls'
import { createMockListings } from './listings'
import { createMockPrefs } from './prefs'
import { createMockProfiles } from './profiles'
import { createMockPromotions } from './promotions'
import { createMockReports } from './reports'
import { createMockSettings } from './settings'
import { clearAll, purgeOldVersions } from './storage'

export function createMockServices(): Services {
  purgeOldVersions()
  const chat = createMockChat()

  return {
    auth: createFirebaseAuth(),
    profiles: createMockProfiles(),
    listings: createMockListings(),
    chat: chat.service,
    prefs: createMockPrefs(),
    reports: createMockReports(),
    settings: createMockSettings(),
    admin: createMockAdmin(),
    promotions: createMockPromotions(),
    analytics: createMockAnalytics(),
    demo: {
      getControls: () => ({ ...mockControls }),
      setControl: (key, value) => {
        mockControls[key] = value
      },
      async reset() {
        chat.cancelPending()
        clearAll()
        Object.assign(mockControls, DEFAULT_CONTROLS)
      },
      registerAccountPicker: () => {},
    },
  }
}
