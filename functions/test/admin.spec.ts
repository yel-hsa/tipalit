import test from 'node:test'
import assert from 'node:assert/strict'

import { HttpsError } from 'firebase-functions/v2/https'
import {
  parseAccountStatus,
  parseCampus,
  parseMeetupSpots,
  parseReportAction,
  parseReportKind,
  parseReportReason,
  readOptionalString,
  readRequiredString,
  readStoredMeetupSpots,
  reportDocumentId,
  reportRateLimitState,
  reportSubjectId,
  reportTarget,
  requireAdmin,
} from '../src/admin'

const expectHttpsCode = (fn: () => unknown, code: string) => {
  assert.throws(fn, (error) => error instanceof HttpsError && error.code === code)
}

test('requireAdmin trusts only the custom admin claim', () => {
  expectHttpsCode(() => requireAdmin(undefined), 'unauthenticated')
  expectHttpsCode(
    () => requireAdmin({ uid: 'email-only', token: { email: 'osa.admin@tip.edu.ph' } }),
    'permission-denied',
  )
  const auth = requireAdmin({ uid: 'claimed', token: { admin: true } })
  assert.equal(auth.uid, 'claimed')
})

test('callable inputs reject unsupported actions, statuses, campuses, and oversized values', () => {
  assert.equal(parseReportAction('remove_listing'), 'remove_listing')
  assert.equal(parseAccountStatus('suspended'), 'suspended')
  assert.equal(parseCampus('qc'), 'qc')
  assert.deepEqual(parseMeetupSpots([' Library Plaza ', 'Library Plaza', 'Main Lobby']), [
    'Library Plaza',
    'Main Lobby',
  ])
  assert.deepEqual(readStoredMeetupSpots('[Library Plaza, "Main Lobby"]'), [
    'Library Plaza',
    'Main Lobby',
  ])
  expectHttpsCode(() => parseReportAction('delete_everything'), 'invalid-argument')
  expectHttpsCode(() => parseAccountStatus('banned'), 'invalid-argument')
  expectHttpsCode(() => parseCampus('outside'), 'invalid-argument')
  expectHttpsCode(() => parseMeetupSpots([]), 'invalid-argument')
  expectHttpsCode(() => parseMeetupSpots(['x'.repeat(121)]), 'invalid-argument')
  expectHttpsCode(() => readRequiredString(' '.repeat(3), 'note', 1000), 'invalid-argument')
  expectHttpsCode(() => readRequiredString('x'.repeat(1001), 'note', 1000), 'invalid-argument')
})

test('report submission validation accepts only known targets and reason codes', () => {
  assert.equal(parseReportKind('listing'), 'listing')
  assert.equal(parseReportReason('listing', 'Prohibited item'), 'Prohibited item')
  assert.equal(readOptionalString('  context  ', 'details', 300), 'context')
  assert.equal(readOptionalString(undefined, 'details', 300), '')
  expectHttpsCode(() => parseReportKind('message'), 'invalid-argument')
  expectHttpsCode(() => parseReportReason('user', 'Prohibited item'), 'invalid-argument')
  expectHttpsCode(() => readOptionalString('x'.repeat(301), 'details', 300), 'invalid-argument')
})

test('report ids and rate limits are deterministic and bounded', () => {
  const id = reportDocumentId('reporter-1', 'listing', 'listing-1')
  assert.equal(id, reportDocumentId('reporter-1', 'listing', 'listing-1'))
  assert.notEqual(id, reportDocumentId('reporter-2', 'listing', 'listing-1'))
  assert.deepEqual(reportRateLimitState(undefined, 1_000), { count: 1, windowStartedAtMs: 1_000 })
  assert.deepEqual(reportRateLimitState({ count: 3, window_started_at_ms: 1_000 }, 2_000), {
    count: 4,
    windowStartedAtMs: 1_000,
  })
  expectHttpsCode(
    () => reportRateLimitState({ count: 5, window_started_at_ms: 1_000 }, 2_000),
    'resource-exhausted',
  )
  assert.deepEqual(reportRateLimitState({ count: 5, window_started_at_ms: 1_000 }, 2_000, false), {
    count: 5,
    windowStartedAtMs: 1_000,
  })
  assert.deepEqual(reportRateLimitState({ count: 5, window_started_at_ms: 1_000 }, 3_602_000), {
    count: 1,
    windowStartedAtMs: 3_602_000,
  })
})

test('report target and subject metadata are derived from stored report data', () => {
  const target = reportTarget({
    target_type: 'listing',
    target_id: 'listing-7',
    target: { kind: 'user', id: 'forged-id', label: 'Statics' },
  })
  assert.deepEqual(target, { kind: 'listing', id: 'listing-7', label: 'Statics' })
  assert.equal(reportSubjectId({ subject_id: 'seller-1' }, target.id), 'seller-1')
})

test('invalid stored report metadata fails closed', () => {
  expectHttpsCode(() => reportTarget({ target: {} }), 'failed-precondition')
  expectHttpsCode(() => reportSubjectId({ subject_id: '' }, ''), 'failed-precondition')
})
