import { createFirebaseServices, isFirebaseConfigured } from './firebase'
import { createMockServices } from './mock'
import type { Services } from './types'

// host apps set this before importing the services; unset auto-detects
let adapterOverride: string | undefined
let servicesInstance: Services | null = null

export const setDataAdapter = (adapter: string | undefined): void => {
  adapterOverride = adapter
  servicesInstance = null
}

const pickAdapter = (): Services => {
  const adapter = adapterOverride

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

export const services: Services = new Proxy({} as Services, {
  get(_target, property) {
    servicesInstance ??= pickAdapter()
    return servicesInstance[property as keyof Services]
  },
})

export * from './types'
export { ServiceError } from './errors'
