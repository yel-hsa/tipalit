import { ServiceError } from '../errors'

const NAMESPACE = 'tipalit.'
// bump on any stored shape change; older keys are purged and reseed
const VERSION = 'v2'
const PREFIX = `${NAMESPACE}${VERSION}.`

const safeStorage = (): Storage | null => {
  try {
    return window.localStorage
  } catch {
    return null
  }
}

const storageKeys = (store: Storage) => Array.from({ length: store.length }, (_, index) => store.key(index) ?? '')

// missing, corrupt, or invalid data is replaced by `fallback()`
export function read<T>(key: string, fallback: () => T, isValid: (value: unknown) => value is T): T {
  const store = safeStorage()
  const raw = store?.getItem(PREFIX + key) ?? null
  if (raw !== null) {
    try {
      const parsed: unknown = JSON.parse(raw)
      if (isValid(parsed)) return parsed
    } catch {
      // falls through to the reset below
    }
    console.warn(`[TIPalit] Stored "${key}" was unreadable and has been reset.`)
  }
  const value = fallback()
  if (value !== null && value !== undefined) write(key, value)
  else store?.removeItem(PREFIX + key)
  return value
}

export function write(key: string, value: unknown) {
  try {
    safeStorage()?.setItem(PREFIX + key, JSON.stringify(value))
  } catch {
    throw new ServiceError('storage', 'Storage is full or unavailable.')
  }
}

export function remove(key: string) {
  safeStorage()?.removeItem(PREFIX + key)
}

// current version only; other versions are left for purgeOldVersions
export function clearAll() {
  const store = safeStorage()
  if (!store) return
  storageKeys(store)
    .filter((key) => key.startsWith(PREFIX))
    .forEach((key) => store.removeItem(key))
}

// runs on startup so stale shapes never reach read()
export function purgeOldVersions() {
  const store = safeStorage()
  if (!store) return
  storageKeys(store)
    .filter((key) => key.startsWith(NAMESPACE) && !key.startsWith(PREFIX))
    .forEach((key) => store.removeItem(key))
}

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null

export const isRecordOf =
  <T>(isItem: (value: unknown) => value is T) =>
  (value: unknown): value is Record<string, T> =>
    isObject(value) && !Array.isArray(value) && Object.values(value).every(isItem)

export const isArrayOf =
  <T>(isItem: (value: unknown) => value is T) =>
  (value: unknown): value is T[] =>
    Array.isArray(value) && value.every(isItem)

// shallow check only; extra keys are allowed
export const hasShape =
  <T>(shape: Record<string, 'string' | 'number' | 'boolean' | 'object'>) =>
  (value: unknown): value is T =>
    isObject(value) && Object.entries(shape).every(([key, type]) => typeof value[key] === type && value[key] !== null)
