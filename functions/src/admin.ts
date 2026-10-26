import type { DocumentData } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'

export const REPORT_ACTIONS = ['remove_listing', 'suspend_member', 'dismiss'] as const
export const ACCOUNT_STATUSES = ['active', 'suspended'] as const
export const CAMPUSES = ['qc', 'manila'] as const

export const LISTING_REPORT_REASONS = [
  'Scam or suspicious price',
  'Prohibited item',
  'Misleading photos or description',
  'Already sold',
  'Other',
] as const
export const USER_REPORT_REASONS = [
  'Not a TIP student',
  'Harassment or inappropriate messages',
  'No-show at meetup',
  'Scam attempt',
  'Other',
] as const
export const REPORT_RATE_LIMIT_MAX = 5
export const REPORT_RATE_LIMIT_WINDOW_MS = 60 * 60 * 1000
export const LISTING_PHOTO_CONTENT_TYPES = ['image/jpeg', 'image/png', 'image/webp'] as const
export const MAX_LISTING_PHOTOS = 5
export const MAX_LISTING_PHOTO_BYTES = 5 * 1024 * 1024

export type ReportAction = (typeof REPORT_ACTIONS)[number]
export type AccountStatus = (typeof ACCOUNT_STATUSES)[number]
export type CampusId = (typeof CAMPUSES)[number]
export type ListingPhotoContentType = (typeof LISTING_PHOTO_CONTENT_TYPES)[number]

type CallableAuth = {
  uid: string
  token: Record<string, unknown>
}

export function requireAdmin(auth: CallableAuth | undefined): CallableAuth {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign in again to continue.')
  }
  if (auth.token.admin !== true) {
    throw new HttpsError('permission-denied', 'Admins only.')
  }
  return auth
}

export function readRequiredString(value: unknown, field: string, maxLength: number): string {
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${field} is required.`)
  }
  const cleaned = value.trim()
  if (!cleaned || cleaned.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} must be between 1 and ${maxLength} characters.`)
  }
  return cleaned
}

export type ListingPhotoSpec = {
  id: string
  fileName: string
  contentType: ListingPhotoContentType
  sizeBytes: number
  sortOrder: number
}

export function parseListingPhotoSpecs(value: unknown): ListingPhotoSpec[] {
  if (!Array.isArray(value) || value.length > MAX_LISTING_PHOTOS) {
    throw new HttpsError('invalid-argument', `Provide at most ${MAX_LISTING_PHOTOS} listing photos.`)
  }

  const seenIds = new Set<string>()
  const seenOrders = new Set<number>()
  return value.map((candidate, index) => {
    if (!candidate || typeof candidate !== 'object') {
      throw new HttpsError('invalid-argument', `photos[${index}] must be an object.`)
    }
    const photo = candidate as Record<string, unknown>
    const id = readRequiredString(photo.id, `photos[${index}].id`, 80)
    const contentType = photo.contentType
    const sizeBytes = photo.sizeBytes
    const sortOrder = photo.sortOrder
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{0,79}$/.test(id)) {
      throw new HttpsError('invalid-argument', `photos[${index}].id is invalid.`)
    }
    if (!LISTING_PHOTO_CONTENT_TYPES.includes(contentType as ListingPhotoContentType)) {
      throw new HttpsError('invalid-argument', `photos[${index}].contentType is invalid.`)
    }
    if (!Number.isInteger(sizeBytes) || Number(sizeBytes) <= 0 || Number(sizeBytes) >= MAX_LISTING_PHOTO_BYTES) {
      throw new HttpsError('invalid-argument', `photos[${index}].sizeBytes is invalid.`)
    }
    if (!Number.isInteger(sortOrder) || Number(sortOrder) < 0 || Number(sortOrder) >= MAX_LISTING_PHOTOS) {
      throw new HttpsError('invalid-argument', `photos[${index}].sortOrder is invalid.`)
    }
    if (seenIds.has(id) || seenOrders.has(Number(sortOrder))) {
      throw new HttpsError('invalid-argument', 'Listing photo ids and sort orders must be unique.')
    }
    seenIds.add(id)
    seenOrders.add(Number(sortOrder))
    const extension = contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpg'
    return {
      id,
      fileName: `${id}.${extension}`,
      contentType: contentType as ListingPhotoContentType,
      sizeBytes: Number(sizeBytes),
      sortOrder: Number(sortOrder),
    }
  })
}

export function parseReportAction(value: unknown): ReportAction {
  if (!REPORT_ACTIONS.includes(value as ReportAction)) {
    throw new HttpsError('invalid-argument', 'Unsupported report action.')
  }
  return value as ReportAction
}

export function parseReportKind(value: unknown): 'listing' | 'user' {
  if (value !== 'listing' && value !== 'user') {
    throw new HttpsError('invalid-argument', 'Unsupported report target.')
  }
  return value
}

export function parseReportReason(kind: 'listing' | 'user', value: unknown): string {
  const reasons: readonly string[] = kind === 'listing' ? LISTING_REPORT_REASONS : USER_REPORT_REASONS
  if (typeof value !== 'string' || !reasons.includes(value)) {
    throw new HttpsError('invalid-argument', 'Unsupported report reason.')
  }
  return value
}

export function readOptionalString(value: unknown, field: string, maxLength: number): string {
  if (value === undefined || value === null || value === '') return ''
  if (typeof value !== 'string') {
    throw new HttpsError('invalid-argument', `${field} must be text.`)
  }
  const cleaned = value.trim()
  if (cleaned.length > maxLength) {
    throw new HttpsError('invalid-argument', `${field} must be at most ${maxLength} characters.`)
  }
  return cleaned
}

export function reportDocumentId(reporterId: string, kind: 'listing' | 'user', targetId: string): string {
  const input = `${reporterId}|${kind}|${targetId}`
  let first = 0x811c9dc5
  let second = 0x01000193
  for (let index = 0; index < input.length; index += 1) {
    const code = input.charCodeAt(index)
    first ^= code
    first = Math.imul(first, 0x01000193) >>> 0
    second = (second + code) >>> 0
    second = Math.imul(second, 0x85ebca6b) >>> 0
    second ^= second >>> 13
  }
  return `r-${first.toString(36)}${second.toString(36)}`
}

export function reportRateLimitState(
  data: DocumentData | undefined,
  nowMs: number,
  consumesQuota = true,
): { count: number; windowStartedAtMs: number } {
  const existingStart =
    typeof data?.window_started_at_ms === 'number' ? data.window_started_at_ms : nowMs
  const insideWindow = nowMs - existingStart < REPORT_RATE_LIMIT_WINDOW_MS
  const count = insideWindow && typeof data?.count === 'number' ? data.count : 0
  if (consumesQuota && count >= REPORT_RATE_LIMIT_MAX) {
    throw new HttpsError('resource-exhausted', 'Too many reports. Please try again later.')
  }
  return {
    count: count + (consumesQuota ? 1 : 0),
    windowStartedAtMs: insideWindow ? existingStart : nowMs,
  }
}

export function parseAccountStatus(value: unknown): AccountStatus {
  if (!ACCOUNT_STATUSES.includes(value as AccountStatus)) {
    throw new HttpsError('invalid-argument', 'Unsupported account status.')
  }
  return value as AccountStatus
}

export function parseCampus(value: unknown): CampusId {
  if (!CAMPUSES.includes(value as CampusId)) {
    throw new HttpsError('invalid-argument', 'Unsupported campus.')
  }
  return value as CampusId
}

export function parseMeetupSpots(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new HttpsError('invalid-argument', 'spots must be an array.')
  }
  const spots = value.map((spot) => readRequiredString(spot, 'spot', 120))
  const unique = [...new Set(spots)]
  if (unique.length === 0 || unique.length > 25) {
    throw new HttpsError('invalid-argument', 'Provide between 1 and 25 unique meetup spots.')
  }
  return unique
}

export function readStoredMeetupSpots(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((spot): spot is string => typeof spot === 'string').map((spot) => spot.trim()).filter(Boolean)
  }
  if (typeof value !== 'string' || !value.trim()) return []

  const trimmed = value.trim()
  if (trimmed.startsWith('[')) {
    try {
      return readStoredMeetupSpots(JSON.parse(trimmed))
    } catch {
      return trimmed
        .slice(1, trimmed.endsWith(']') ? -1 : undefined)
        .split(',')
        .map((spot) => spot.trim().replace(/^['"]|['"]$/g, ''))
        .filter(Boolean)
    }
  }
  return trimmed.split(',').map((spot) => spot.trim()).filter(Boolean)
}

export function reportTarget(report: DocumentData): { kind: 'listing' | 'user'; id: string; label: string } {
  const nested = report.target && typeof report.target === 'object' ? report.target : {}
  const kind =
    report.target_type === 'user'
      ? 'user'
      : report.target_type === 'listing'
        ? 'listing'
        : nested.kind === 'user'
          ? 'user'
          : 'listing'
  const id = typeof report.target_id === 'string' ? report.target_id : nested.id
  if (typeof id !== 'string' || !id) {
    throw new HttpsError('failed-precondition', 'The report target is invalid.')
  }
  const label = typeof nested.label === 'string' && nested.label ? nested.label : kind === 'listing' ? 'Listing' : 'Member'
  return { kind, id, label }
}

export function reportSubjectId(report: DocumentData, targetId: string): string {
  const value = report.subjectId ?? report.subject_id ?? targetId
  if (typeof value !== 'string' || !value) {
    throw new HttpsError('failed-precondition', 'The report subject is invalid.')
  }
  return value
}
