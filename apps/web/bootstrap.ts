import {
  setFirebaseConfig,
  setFirebaseEmulatorConfig,
} from '@tipalit/services/firebase'
import { setDataAdapter } from '@tipalit/services'
import { setPlatform } from '@tipalit/services/platform'

// must run before anything imports @tipalit/services
setPlatform({
  storage: {
    getItem: (key) => localStorage.getItem(key),
    setItem: (key, value) => localStorage.setItem(key, value),
    removeItem: (key) => localStorage.removeItem(key),
    keys: () => Object.keys(localStorage),
  },
  setTimeout: (fn, ms) => window.setTimeout(fn, ms),
  clearTimeout: (handle) => window.clearTimeout(handle as number),
})

setFirebaseConfig({
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY ?? '',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID ?? '',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: import.meta.env.VITE_FIREBASE_APP_ID ?? '',
})

if (import.meta.env.VITE_FIREBASE_EMULATORS === 'true') {
  setFirebaseEmulatorConfig({
    host: import.meta.env.VITE_FIREBASE_EMULATOR_HOST ?? '127.0.0.1',
    authPort: 9099,
    firestorePort: 8080,
    functionsPort: 5001,
    storagePort: 9199,
  })
}

setDataAdapter(import.meta.env.VITE_DATA_ADAPTER)
