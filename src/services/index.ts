import { createFirebaseServices, isFirebaseConfigured } from './firebase'
import { createMockServices } from './mock'
import type { Services } from './types'

/**
 * The one place the app picks its data adapter.
 * Select 'firebase' or 'mock' with VITE_DATA_ADAPTER.
 * Defaults to 'firebase' when Firebase configuration is detected, otherwise 'mock'.
 */
const pickAdapter = (): Services => {
  const adapter = import.meta.env.VITE_DATA_ADAPTER

  if (adapter === 'firebase') {
    return createFirebaseServices()
  }

  if (adapter === 'mock') {
    return createMockServices()
  }

  // Auto-detect: if Firebase environment variables are configured, use Firebase
  if (isFirebaseConfigured()) {
    return createFirebaseServices()
  }

  return createMockServices()
}

export const services: Services = pickAdapter()

export * from './types'
export { ServiceError } from './errors'
