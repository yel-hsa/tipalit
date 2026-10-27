import { initializeApp, getApps, deleteApp, type FirebaseApp } from 'firebase/app'
import {
  getAuth,
  type Auth,
} from 'firebase/auth'
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from 'firebase/firestore'
import {
  connectFunctionsEmulator,
  getFunctions,
  type Functions,
} from 'firebase/functions'
import {
  connectStorageEmulator,
  getStorage,
  type FirebaseStorage,
} from 'firebase/storage'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export interface FirebaseEmulatorConfig {
  host: string
  firestorePort?: number
  functionsPort?: number
  storagePort?: number
}

export const DEFAULT_FIREBASE_CONFIG: FirebaseConfig = {
  apiKey: 'AIzaSyCN9VA0PrVQ6H4To99DQk4Q2eY-kU8cyHE',
  authDomain: 'tipalit-firebase.firebaseapp.com',
  projectId: 'tipalit-firebase',
  storageBucket: 'tipalit-firebase.firebasestorage.app',
  messagingSenderId: '783597964977',
  appId: '1:783597964977:web:99410091ea244b88f25c90',
}

// host apps inject their config; vite reads import.meta.env, expo reads process.env
let injectedConfig: Partial<FirebaseConfig> | null = null
let emulatorConfig: FirebaseEmulatorConfig | null = null

export const resetFirebaseInstances = async (): Promise<void> => {
  authInstance = null
  dbInstance = null
  functionsInstance = null
  storageInstance = null
  if (appInstance) {
    try {
      await deleteApp(appInstance)
    } catch {}
    appInstance = null
  }
}

export const setFirebaseConfig = (config: FirebaseConfig): void => {
  const filtered: Partial<FirebaseConfig> = {}
  for (const [key, val] of Object.entries(config)) {
    if (val && typeof val === 'string' && val.trim() !== '') {
      filtered[key as keyof FirebaseConfig] = val.trim()
    }
  }

  // If appInstance already exists with a different apiKey/projectId, reset it so new config takes effect
  if (appInstance && (filtered.apiKey || filtered.projectId)) {
    const currentOptions = appInstance.options
    if (
      (filtered.apiKey && filtered.apiKey !== currentOptions.apiKey) ||
      (filtered.projectId && filtered.projectId !== currentOptions.projectId)
    ) {
      deleteApp(appInstance).catch(() => {})
      appInstance = null
      authInstance = null
      dbInstance = null
      functionsInstance = null
      storageInstance = null
    }
  }

  injectedConfig = {
    ...injectedConfig,
    ...filtered,
  }
}

export const setFirebaseEmulatorConfig = (
  config: FirebaseEmulatorConfig | null,
): void => {
  emulatorConfig = config
}

export const getFirebaseConfig = (): FirebaseConfig => {
  const env = (typeof process !== 'undefined' ? (process.env as Record<string, string | undefined> | undefined) : undefined) ?? {}

  const apiKey =
    injectedConfig?.apiKey ||
    env.EXPO_PUBLIC_FIREBASE_API_KEY ||
    env.VITE_FIREBASE_API_KEY ||
    DEFAULT_FIREBASE_CONFIG.apiKey

  const authDomain =
    injectedConfig?.authDomain ||
    env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ||
    env.VITE_FIREBASE_AUTH_DOMAIN ||
    DEFAULT_FIREBASE_CONFIG.authDomain

  const projectId =
    injectedConfig?.projectId ||
    env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ||
    env.VITE_FIREBASE_PROJECT_ID ||
    DEFAULT_FIREBASE_CONFIG.projectId

  const storageBucket =
    injectedConfig?.storageBucket ||
    env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ||
    env.VITE_FIREBASE_STORAGE_BUCKET ||
    DEFAULT_FIREBASE_CONFIG.storageBucket

  const messagingSenderId =
    injectedConfig?.messagingSenderId ||
    env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ||
    env.VITE_FIREBASE_MESSAGING_SENDER_ID ||
    DEFAULT_FIREBASE_CONFIG.messagingSenderId

  const appId =
    injectedConfig?.appId ||
    env.EXPO_PUBLIC_FIREBASE_APP_ID ||
    env.VITE_FIREBASE_APP_ID ||
    DEFAULT_FIREBASE_CONFIG.appId

  return {
    apiKey,
    authDomain,
    projectId,
    storageBucket,
    messagingSenderId,
    appId,
  }
}

export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig()
  return Boolean((config.apiKey && config.projectId) || emulatorConfig)
}

let appInstance: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let functionsInstance: Functions | null = null
let storageInstance: FirebaseStorage | null = null

export const getFirebaseApp = (): FirebaseApp => {
  if (appInstance) return appInstance

  const config = getFirebaseConfig()

  const existingApps = getApps()
  if (existingApps.length > 0) {
    const existing = existingApps[0]
    // Clean up any stale placeholder or mismatched app
    if (
      existing.options.apiKey === 'AIzaSyDemoPlaceholderKeyForTIPalitApp' ||
      (config.apiKey && existing.options.apiKey !== config.apiKey)
    ) {
      deleteApp(existing).catch(() => {})
    } else {
      appInstance = existing
      return appInstance
    }
  }

  appInstance = initializeApp(config)
  return appInstance
}

export const getFirebaseAuth = (): Auth => {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp())
  }
  return authInstance
}

export const getFirebaseDb = (): Firestore => {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp())
    if (emulatorConfig?.firestorePort) {
      connectFirestoreEmulator(
        dbInstance,
        emulatorConfig.host,
        emulatorConfig.firestorePort,
      )
    }
  }
  return dbInstance
}

export const getFirebaseFunctions = (): Functions => {
  if (!functionsInstance) {
    functionsInstance = getFunctions(getFirebaseApp())
    if (emulatorConfig?.functionsPort) {
      connectFunctionsEmulator(
        functionsInstance,
        emulatorConfig.host,
        emulatorConfig.functionsPort,
      )
    }
  }
  return functionsInstance
}

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp())
    if (emulatorConfig?.storagePort) {
      connectStorageEmulator(
        storageInstance,
        emulatorConfig.host,
        emulatorConfig.storagePort,
      )
    }
  }
  return storageInstance
}
