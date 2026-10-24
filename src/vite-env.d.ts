/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Data adapter to use. Only "mock" ships today. */
  readonly VITE_DATA_ADAPTER?: string
  /** "true" turns on reviewer tools for every session. */
  readonly VITE_REVIEWER_MODE?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
