import type { Services } from '../types'
import { createFirebaseAdmin } from './admin'
import { createFirebaseAnalytics } from './analytics'
import { createFirebaseAuth } from './auth'
import { createFirebaseChat } from './chat'
import { createFirebaseListings } from './listings'
import { createFirebasePrefs } from './prefs'
import { createFirebaseProfiles } from './profiles'
import { createFirebasePromotions } from './promotions'
import { createFirebaseReports } from './reports'
import { createFirebaseSettings } from './settings'

export function createFirebaseServices(): Services {
  return {
    auth: createFirebaseAuth(),
    profiles: createFirebaseProfiles(),
    listings: createFirebaseListings(),
    chat: createFirebaseChat(),
    prefs: createFirebasePrefs(),
    reports: createFirebaseReports(),
    settings: createFirebaseSettings(),
    admin: createFirebaseAdmin(),
    promotions: createFirebasePromotions(),
    analytics: createFirebaseAnalytics(),
  }
}

export * from './config'
