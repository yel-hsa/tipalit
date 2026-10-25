import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { getFirestore } from 'firebase-admin/firestore'
import functionsTest from 'firebase-functions-test'

const PROJECT_ID = 'demo-tipalit'
const REPORT_REASON = 'Prohibited item'

process.env.GCLOUD_PROJECT = PROJECT_ID
process.env.FIREBASE_AUTH_EMULATOR_HOST ??= '127.0.0.1:9099'
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'

const adminApp = initializeApp(
  { credential: applicationDefault(), projectId: PROJECT_ID },
  'callable-integration-tests',
)
const db = getFirestore(adminApp)
const auth = getAuth(adminApp)
const fft = functionsTest({ projectId: PROJECT_ID })
const { resolveReport, submitReport } = await import('../lib/src/index.js')
const callSubmitReport = fft.wrap(submitReport)
const callResolveReport = fft.wrap(resolveReport)

const authData = (uid, claims = {}) => ({
  uid,
  token: {
    email: `${uid}@tip.edu.ph`,
    email_verified: true,
    ...claims,
  },
})

const seedProfile = async (uid, overrides = {}) => {
  await db.collection('users_profile').doc(uid).set({
    user_id: uid,
    email: `${uid}@tip.edu.ph`,
    full_name: `Student ${uid}`,
    campus: 'qc',
    role: 'member',
    status: 'active',
    ...overrides,
  })
}

const seedListing = async (id, sellerId, overrides = {}) => {
  await db.collection('listings').doc(id).set({
    seller_id: sellerId,
    seller_name: `Seller ${sellerId}`,
    title: `Listing ${id}`,
    campus: 'qc',
    status: 'active',
    report_count: 0,
    ...overrides,
  })
}

const submitListingReport = (uid, targetId) =>
  callSubmitReport({
    data: {
      kind: 'listing',
      targetId,
      reason: REPORT_REASON,
      details: `Details from ${uid}`,
    },
    auth: authData(uid),
  })

const expectHttpsCode = async (promise, code) => {
  await assert.rejects(promise, (error) => error?.code === code)
}

before(async () => {
  await db.listCollections().then((collections) =>
    Promise.all(collections.map((collection) => collection.listDocuments().then((docs) =>
      Promise.all(docs.map((doc) => doc.delete())),
    ))),
  )
})

beforeEach(async () => {
  const collections = await db.listCollections()
  await Promise.all(
    collections.map(async (collection) => {
      const docs = await collection.listDocuments()
      await Promise.all(docs.map((doc) => doc.delete()))
    }),
  )
})

after(async () => {
  fft.cleanup()
  await deleteApp(adminApp)
})

describe('submitReport callable', () => {
  test('creates an authoritative report, rate-limit entry, and listing count atomically', async () => {
    await seedProfile('seller')
    await seedProfile('reporter')
    await seedListing('listing-1', 'seller')

    const result = await submitListingReport('reporter', 'listing-1')
    const reportSnap = await db.collection('reports').doc(result.report.id).get()
    const listingSnap = await db.collection('listings').doc('listing-1').get()
    const rateLimitSnap = await db.collection('report_rate_limits').doc('reporter').get()

    assert.equal(result.report.status, 'open')
    assert.equal(reportSnap.data()?.reporter_id, 'reporter')
    assert.equal(reportSnap.data()?.subject_id, 'seller')
    assert.equal(reportSnap.data()?.target_id, 'listing-1')
    assert.equal(reportSnap.data()?.campus, 'qc')
    assert.equal(reportSnap.data()?.resolution, undefined)
    assert.equal(listingSnap.data()?.report_count, 1)
    assert.equal(rateLimitSnap.data()?.count, 1)
  })

  test('treats concurrent duplicate submissions as one report and one quota unit', async () => {
    await seedProfile('seller')
    await seedProfile('reporter')
    await seedListing('listing-1', 'seller')

    const [first, second] = await Promise.all([
      submitListingReport('reporter', 'listing-1'),
      submitListingReport('reporter', 'listing-1'),
    ])
    const reports = await db.collection('reports').get()
    const listingSnap = await db.collection('listings').doc('listing-1').get()
    const rateLimitSnap = await db.collection('report_rate_limits').doc('reporter').get()

    assert.equal(first.report.id, second.report.id)
    assert.equal(reports.size, 1)
    assert.equal(listingSnap.data()?.report_count, 1)
    assert.equal(rateLimitSnap.data()?.count, 1)
  })

  test('reopens a closed report without consuming quota or leaving stale resolution data', async () => {
    await seedProfile('seller')
    await seedProfile('reporter')
    await seedListing('listing-1', 'seller')

    const first = await submitListingReport('reporter', 'listing-1')
    await db.collection('reports').doc(first.report.id).update({
      status: 'dismissed',
      resolution: { action: 'dismiss', note: 'Reviewed' },
    })
    const reopened = await submitListingReport('reporter', 'listing-1')
    const reportSnap = await db.collection('reports').doc(reopened.report.id).get()
    const listingSnap = await db.collection('listings').doc('listing-1').get()
    const rateLimitSnap = await db.collection('report_rate_limits').doc('reporter').get()

    assert.equal(reopened.report.status, 'open')
    assert.equal(reportSnap.data()?.resolution, undefined)
    assert.equal(listingSnap.data()?.report_count, 1)
    assert.equal(rateLimitSnap.data()?.count, 1)
  })

  test('enforces per-account rate limits and auto-removes a listing at the report threshold', async () => {
    await seedProfile('seller')
    await seedListing('threshold-listing', 'seller')

    for (let index = 1; index <= 5; index += 1) {
      const reporterId = `reporter-${index}`
      await seedProfile(reporterId)
      await submitListingReport(reporterId, 'threshold-listing')
    }

    const listingSnap = await db.collection('listings').doc('threshold-listing').get()
    assert.equal(listingSnap.data()?.report_count, 5)
    assert.equal(listingSnap.data()?.status, 'removed')
    assert.equal(listingSnap.data()?.moderated_reason, 'report_threshold')

    await seedProfile('limited-reporter')
    for (let index = 1; index <= 6; index += 1) {
      await seedListing(`rate-listing-${index}`, 'seller')
    }
    for (let index = 1; index <= 5; index += 1) {
      await submitListingReport('limited-reporter', `rate-listing-${index}`)
    }
    await expectHttpsCode(
      submitListingReport('limited-reporter', 'rate-listing-6'),
      'resource-exhausted',
    )
    assert.equal((await db.collection('reports').get()).docs.filter(
      (doc) => doc.data().reporter_id === 'limited-reporter',
    ).length, 5)
  })
})

describe('resolveReport callable', () => {
  test('allows only active claimed administrators and commits moderation with its audit event', async () => {
    await seedProfile('seller')
    await seedProfile('reporter')
    await seedProfile('admin', { role: 'admin' })
    await seedProfile('suspended-admin', { role: 'admin', status: 'suspended' })
    await seedListing('listing-1', 'seller')
    const submitted = await submitListingReport('reporter', 'listing-1')
    const request = {
      reportId: submitted.report.id,
      action: 'remove_listing',
      note: 'Confirmed prohibited listing.',
    }

    await expectHttpsCode(
      callResolveReport({ data: request, auth: authData('admin') }),
      'permission-denied',
    )
    await expectHttpsCode(
      callResolveReport({
        data: request,
        auth: authData('suspended-admin', { admin: true }),
      }),
      'permission-denied',
    )

    const result = await callResolveReport({
      data: request,
      auth: authData('admin', { admin: true, name: 'OSA Admin' }),
    })
    const reportSnap = await db.collection('reports').doc(submitted.report.id).get()
    const listingSnap = await db.collection('listings').doc('listing-1').get()
    const auditSnap = await db.collection('audit_log').doc(`report_${submitted.report.id}`).get()

    assert.equal(result.report.status, 'resolved')
    assert.equal(reportSnap.data()?.status, 'resolved')
    assert.equal(listingSnap.data()?.status, 'removed')
    assert.equal(auditSnap.data()?.action, 'listing_removed')
    assert.equal(auditSnap.data()?.actor_id, 'admin')
  })

  test('permits only one concurrent resolution for sibling reports on the same target', async () => {
    await seedProfile('seller')
    await seedProfile('reporter-1')
    await seedProfile('reporter-2')
    await seedProfile('admin-1', { role: 'admin' })
    await seedProfile('admin-2', { role: 'admin' })
    await seedListing('listing-1', 'seller')
    const [first, second] = await Promise.all([
      submitListingReport('reporter-1', 'listing-1'),
      submitListingReport('reporter-2', 'listing-1'),
    ])

    const outcomes = await Promise.allSettled([
      callResolveReport({
        data: { reportId: first.report.id, action: 'remove_listing', note: 'First decision.' },
        auth: authData('admin-1', { admin: true }),
      }),
      callResolveReport({
        data: { reportId: second.report.id, action: 'remove_listing', note: 'Second decision.' },
        auth: authData('admin-2', { admin: true }),
      }),
    ])

    assert.equal(outcomes.filter((outcome) => outcome.status === 'fulfilled').length, 1)
    assert.equal(outcomes.filter((outcome) => outcome.status === 'rejected').length, 1)
    assert.ok(outcomes.some(
      (outcome) => outcome.status === 'rejected' && outcome.reason?.code === 'failed-precondition',
    ))
    assert.equal((await db.collection('audit_log').get()).size, 1)
    const reports = await db.collection('reports').get()
    assert.ok(reports.docs.every((doc) => doc.data().status === 'resolved'))
  })
})
