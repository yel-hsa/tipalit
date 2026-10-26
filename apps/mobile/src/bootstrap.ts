import { setDataAdapter } from '@tipalit/services'
import {
  setFirebaseConfig,
  setFirebaseEmulatorConfig,
} from '@tipalit/services/firebase'
import { setPlatform } from '@tipalit/services/platform'

// expo inlines EXPO_PUBLIC_* at build time; unset vars fall back to the mock adapter
setFirebaseConfig({
  apiKey: process.env.EXPO_PUBLIC_FIREBASE_API_KEY ?? '',
  authDomain: process.env.EXPO_PUBLIC_FIREBASE_AUTH_DOMAIN ?? '',
  projectId: process.env.EXPO_PUBLIC_FIREBASE_PROJECT_ID ?? '',
  storageBucket: process.env.EXPO_PUBLIC_FIREBASE_STORAGE_BUCKET ?? '',
  messagingSenderId: process.env.EXPO_PUBLIC_FIREBASE_MESSAGING_SENDER_ID ?? '',
  appId: process.env.EXPO_PUBLIC_FIREBASE_APP_ID ?? '',
})

if (process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === 'true') {
  setFirebaseEmulatorConfig({
    host: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ?? '127.0.0.1',
    authPort: 9099,
    firestorePort: 8080,
    functionsPort: 5001,
    storagePort: 9199,
  })
}

setDataAdapter(process.env.EXPO_PUBLIC_DATA_ADAPTER)

// in-memory until a native key-value store is wired; sessions do not survive a restart
const memory = new Map<string, string>()

setPlatform({
  storage: {
    getItem: (key) => memory.get(key) ?? null,
    setItem: (key, value) => void memory.set(key, value),
    removeItem: (key) => void memory.delete(key),
    keys: () => [...memory.keys()],
  },
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  // TODO(native-google-auth): signInWithPopup cannot run on Expo native. Wire a
  // real handler here once Google OAuth client IDs are configured (expo-auth-
  // session's useAuthRequest with EXPO_PUBLIC_GOOGLE_* client IDs, exchanged
  // for a Firebase credential). It must resolve { idToken } or null on cancel:
  //   googleSignIn: async () => { ... return { idToken } }
  // Until then the firebase adapter's signInWithGoogle surfaces a network
  // failure on native; students should sign in on web or via the handler above.
})
