import { createFirebaseServices, isFirebaseConfigured } from './firebase'
import { createMockServices } from './mock'
import type { Services } from './types'

const pickAdapter = (): Services => {
  const adapter = import.meta.env.VITE_DATA_ADAPTER

  if (adapter === 'firebase') {
    return createFirebaseServices()
  }

  if (adapter === 'mock') {
    return createMockServices()
  }

  // unset VITE_DATA_ADAPTER falls back to firebase when its config vars exist
  if (isFirebaseConfigured()) {
    return createFirebaseServices()
  }

  return createMockServices()
}

export const services: Services = pickAdapter()

export * from './types'
export { ServiceError } from './errors'
