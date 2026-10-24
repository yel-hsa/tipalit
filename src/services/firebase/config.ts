import { initializeApp, getApps, type FirebaseApp } from 'firebase/app'
import { getAuth, type Auth } from 'firebase/auth'
import { getFirestore, type Firestore } from 'firebase/firestore'
import { getStorage, type FirebaseStorage } from 'firebase/storage'

export interface FirebaseConfig {
  apiKey: string
  authDomain: string
  projectId: string
  storageBucket: string
  messagingSenderId: string
  appId: string
}

export const getFirebaseConfig = (): FirebaseConfig => ({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '',
})

export const isFirebaseConfigured = (): boolean => {
  const config = getFirebaseConfig()
  return Boolean(config.apiKey && config.projectId)
}

let appInstance: FirebaseApp | null = null
let authInstance: Auth | null = null
let dbInstance: Firestore | null = null
let storageInstance: FirebaseStorage | null = null

export const getFirebaseApp = (): FirebaseApp => {
  if (appInstance) return appInstance
  const existingApps = getApps()
  if (existingApps.length > 0) {
    appInstance = existingApps[0]
    return appInstance
  }

  const config = getFirebaseConfig()
  // If not configured, use a placeholder project config so app doesn't crash on load
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
  }
  return authInstance
}

export const getFirebaseDb = (): Firestore => {
  if (!dbInstance) {
    dbInstance = getFirestore(getFirebaseApp())
  }
  return dbInstance
}

export const getFirebaseStorage = (): FirebaseStorage => {
  if (!storageInstance) {
    storageInstance = getStorage(getFirebaseApp())
  }
  return storageInstance
}
