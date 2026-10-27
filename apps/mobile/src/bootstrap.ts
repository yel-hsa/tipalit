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

const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
const useEmulators =
  process.env.EXPO_PUBLIC_FIREBASE_EMULATORS === 'true' ||
  searchParams?.get('emulators') === 'true'

// clear legacy localStorage flag
if (typeof localStorage !== 'undefined' && searchParams?.get('emulators') !== 'true') {
  try {
    localStorage.removeItem('tipalit_emulators')
  } catch {}
}

import { Platform } from 'react-native'
import * as WebBrowser from 'expo-web-browser'
import * as AuthSession from 'expo-auth-session'

if (Platform.OS !== 'web') {
  WebBrowser.maybeCompleteAuthSession()
}

if (useEmulators) {
  setFirebaseEmulatorConfig({
    host: process.env.EXPO_PUBLIC_FIREBASE_EMULATOR_HOST ?? '127.0.0.1',
    firestorePort: 8080,
    functionsPort: 5001,
    storagePort: 9199,
  })
}

const adapter =
  process.env.EXPO_PUBLIC_DATA_ADAPTER ||
  (searchParams?.get('adapter') as string | undefined) ||
  'firebase'

setDataAdapter(adapter)

// in-memory until a native key-value store is wired; on web, delegate to localStorage
const memory = new Map<string, string>()
const hasLocalStorage = typeof localStorage !== 'undefined'

setPlatform({
  storage: {
    getItem: (key) => (hasLocalStorage ? localStorage.getItem(key) : (memory.get(key) ?? null)),
    setItem: (key, value) => {
      if (hasLocalStorage) localStorage.setItem(key, value)
      else memory.set(key, value)
    },
    removeItem: (key) => {
      if (hasLocalStorage) localStorage.removeItem(key)
      else memory.delete(key)
    },
    keys: () => (hasLocalStorage ? Object.keys(localStorage) : [...memory.keys()]),
  },
  setTimeout: (fn, ms) => setTimeout(fn, ms),
  clearTimeout: (handle) => clearTimeout(handle as ReturnType<typeof setTimeout>),
  googleSignIn:
    Platform.OS === 'web'
      ? undefined
      : async () => {
          try {
            const clientId =
              process.env.EXPO_PUBLIC_GOOGLE_CLIENT_ID ||
              process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID ||
              process.env.EXPO_PUBLIC_FIREBASE_CLIENT_ID ||
              ''

            if (!clientId) {
              console.warn(
                '[TIPalit Mobile] Native Google OAuth Client ID not configured in EXPO_PUBLIC_GOOGLE_CLIENT_ID.',
              )
              return null
            }

            const redirectUri = AuthSession.makeRedirectUri({
              scheme: 'tipalit',
            })

            const discovery = {
              authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
              tokenEndpoint: 'https://oauth2.googleapis.com/token',
              revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
            }

            const request = new AuthSession.AuthRequest({
              clientId,
              redirectUri,
              scopes: ['openid', 'profile', 'email'],
              responseType: AuthSession.ResponseType.IdToken,
              extraParams: {
                hd: 'tip.edu.ph',
                prompt: 'select_account',
              },
            })

            const result = await request.promptAsync(discovery)
            if (result.type === 'success' && result.params?.id_token) {
              return { idToken: result.params.id_token }
            }
            return null
          } catch (err) {
            console.error('[TIPalit Mobile] Native Google sign in error:', err)
            return null
          }
        },
})

// inject Google Fonts for Instrument Sans when running in browser / Expo web
if (typeof document !== 'undefined') {
  const fontId = 'instrument-sans-web-font'
  if (!document.getElementById(fontId)) {
    const link = document.createElement('link')
    link.id = fontId
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Instrument+Sans:wght@400;450;500;600;700&display=swap'
    document.head?.appendChild(link)
  }
}

