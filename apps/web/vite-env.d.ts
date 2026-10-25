/// <reference types="vite/client" />

interface ImportMetaEnv {
  // "firebase" or "mock"; unset auto-detects firebase when the config vars are set
  readonly VITE_DATA_ADAPTER?: string
  // "true" enables reviewer tools for every session
  readonly VITE_REVIEWER_MODE?: string
  readonly VITE_FIREBASE_API_KEY?: string
  readonly VITE_FIREBASE_AUTH_DOMAIN?: string
  readonly VITE_FIREBASE_PROJECT_ID?: string
  readonly VITE_FIREBASE_STORAGE_BUCKET?: string
  readonly VITE_FIREBASE_MESSAGING_SENDER_ID?: string
  readonly VITE_FIREBASE_APP_ID?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
