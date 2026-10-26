import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import {
  connectAuthEmulator,
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
  authPort?: number
  firestorePort?: number
  functionsPort?: number
  storagePort?: number
}

const EMPTY_CONFIG: FirebaseConfig = {
  apiKey: '',
  authDomain: '',
  projectId: '',
  storageBucket: '',
  messagingSenderId: '',
  appId: '',
}

// host apps inject their config; vite reads import.meta.env, expo reads process.env
let injectedConfig: FirebaseConfig | null = null
let emulatorConfig: FirebaseEmulatorConfig | null = null

export const setFirebaseConfig = (config: FirebaseConfig): void => {
  injectedConfig = config
}

export const setFirebaseEmulatorConfig = (
  config: FirebaseEmulatorConfig | null,
): void => {
  emulatorConfig = config
}

export const getFirebaseConfig = (): FirebaseConfig => injectedConfig ?? EMPTY_CONFIG

export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig()
  return Boolean(config.apiKey && config.projectId)
}

let appInstance: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let functionsInstance: Functions | null = null
let storageInstance: FirebaseStorage | null = null

export const getFirebaseApp = (): FirebaseApp => {
  if (appInstance) return appInstance
  const existingApps = getApps()
  if (existingApps.length > 0) {
    appInstance = existingApps[0]
    return appInstance
  }

  const config = getFirebaseConfig()
  // placeholder config keeps the app from crashing when env vars are missing
  const effectiveConfig = isFirebaseConfigured()
    ? config
    : {
        apiKey: 'AIzaSyDemoPlaceholderKeyForTIPalitApp',
        authDomain: 'tipalit-campus.firebaseapp.com',
        projectId: 'tipalit-campus',
        storageBucket: 'tipalit-campus.appspot.com',
        messagingSenderId: '123456789012',
        appId: '1:123456789012:web:abcdef1234567890',
      }

  appInstance = initializeApp(effectiveConfig)
  return appInstance
}

export const getFirebaseAuth = (): Auth => {
  if (!authInstance) {
    authInstance = getAuth(getFirebaseApp())
    if (emulatorConfig?.authPort) {
      connectAuthEmulator(
        authInstance,
        `http://${emulatorConfig.host}:${emulatorConfig.authPort}`,
        { disableWarnings: true },
      )
    }
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
