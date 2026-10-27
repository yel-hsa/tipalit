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
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCN9VA0PrVQ6H4To99DQk4Q2eY-kU8cyHE',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'tipalit-firebase.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'tipalit-firebase',
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'tipalit-firebase.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '783597964977',
  appId: import.meta.env.VITE_FIREBASE_APP_ID || '1:783597964977:web:99410091ea244b88f25c90',
})

const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const useEmulators =
  import.meta.env.VITE_FIREBASE_EMULATORS === 'true' ||
  searchParams?.get('emulators') === 'true'

// clear legacy localStorage flag
if (typeof localStorage !== 'undefined' && searchParams?.get('emulators') !== 'true') {
  try {
    localStorage.removeItem('tipalit_emulators')
  } catch {}
}

if (useEmulators) {
  setFirebaseEmulatorConfig({
    host: import.meta.env.VITE_FIREBASE_EMULATOR_HOST ?? '127.0.0.1',
    firestorePort: 8080,
    functionsPort: 5001,
    storagePort: 9199,
  })
}

const adapter =
  import.meta.env.VITE_DATA_ADAPTER ||
  (searchParams?.get('adapter') as string | undefined) ||
  'firebase'

setDataAdapter(adapter)
