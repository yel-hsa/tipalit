// host-provided storage and timers; web and native each install their own
export type KeyValueStore = {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
  removeItem(key: string): void
  keys(): string[]
}

export type Platform = {
  storage: KeyValueStore
  setTimeout: (fn: () => void, ms: number) => unknown
  clearTimeout: (handle: unknown) => void
  // native hosts register a Google sign-in handler (e.g. expo-auth-session ->
  // Firebase credential); when absent, the firebase adapter falls back to popup
  googleSignIn?: () => Promise<{ idToken: string } | null>
}

const memory = new Map<string, string>()

// fallback keeps the services importable in tests and on first render
const memoryStore: KeyValueStore = {
  getItem: (key) => memory.get(key) ?? null,
  setItem: (key, value) => void memory.set(key, value),
  removeItem: (key) => void memory.delete(key),
  keys: () => [...memory.keys()],
}

let current: Platform = {
  storage: memoryStore,
  setTimeout: (fn, ms) => globalThis.setTimeout(fn, ms),
  clearTimeout: (handle) => globalThis.clearTimeout(handle as ReturnType<typeof setTimeout>),
}

export const setPlatform = (platform: Platform): void => {
  current = platform
}

export const getPlatform = (): Platform => current
