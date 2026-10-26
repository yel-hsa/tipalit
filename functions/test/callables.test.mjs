import { after, before, beforeEach, describe, test } from 'node:test'
import assert from 'node:assert/strict'

import { applicationDefault, deleteApp, initializeApp } from 'firebase-admin/app'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, Timestamp, getFirestore } from 'firebase-admin/firestore'
import { getStorage } from 'firebase-admin/storage'
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
const {
  deleteListingMedia,
  finalizeListingMedia,
  removeListingAsAdmin,
  reserveListingMedia,
  resolveReport,
  submitReport,
} = await import('../lib/src/index.js')
const { runMediaCleanup } = await import('../lib/src/media-cleanup.js')
const callSubmitReport = fft.wrap(submitReport)
const callResolveReport = fft.wrap(resolveReport)
const callReserveListingMedia = fft.wrap(reserveListingMedia)
const callFinalizeListingMedia = fft.wrap(finalizeListingMedia)
const callRemoveListingAsAdmin = fft.wrap(removeListingAsAdmin)
const callDeleteListingMedia = fft.wrap(deleteListingMedia)
const bucket = getStorage(adminApp).bucket(`${PROJECT_ID}.appspot.com`)

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

const mediaMutation = (overrides = {}) => ({
  title: 'Statics, 14th Ed.',
  description: 'Light pencil notes.',
  price: 850,
  transactionType: 'sale',
  courseCode: 'CIV 101',
  category: 'Textbooks',
  department: 'Engineering',
  condition: 'Good',
  meetupSpot: 'Library Plaza',
  campus: 'qc',
  ...overrides,
})

const reserveMedia = (uid, input = {}) => callReserveListingMedia({
  data: {
    operationId: input.operationId ?? `operation-${uid}-12345678`,
    kind: input.kind ?? 'create',
    listingId: input.listingId,
    expectedListingVersion: input.expectedListingVersion ?? 0,
    mutation: input.mutation ?? mediaMutation(),
    retainedPhotoIds: input.retainedPhotoIds ?? [],
    photos: input.photos ?? [],
  },
  auth: authData(uid),
})

const finalizeMedia = (uid, operationId) => callFinalizeListingMedia({
  data: { operationId },
  auth: authData(uid),
})

const JPEG_BYTES = Buffer.from(
  '/9j/2wBDAAYEBQYFBAYGBQYHBwYIChAKCgkJChQODwwQFxQYGBcUFhYaHSUfGhsjHBYWICwgIyYnKSopGR8tMC0oMCUoKSj/2wBDAQcHBwoIChMKChMoGhYaKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCgoKCj/wAARCAACAAIDASIAAhEBAxEB/8QAFQABAQAAAAAAAAAAAAAAAAAAAAf/xAAUEAEAAAAAAAAAAAAAAAAAAAAA/8QAFQEBAQAAAAAAAAAAAAAAAAAABgf/xAAUEQEAAAAAAAAAAAAAAAAAAAAA/9oADAMBAAIRAxEAPwCrgIYXP//Z',
  'base64',
)

const uploadReserved = async (reservation, bytes = JPEG_BYTES, contentType = 'image/jpeg') => {
  const upload = reservation.uploads[0]
  await bucket.file(upload.path).save(bytes, { contentType })
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
  await bucket.deleteFiles({ force: true })
})

after(async () => {
  fft.cleanup()
  await deleteApp(adminApp)
})

describe('listing media callables', () => {
  test('reserves uploads before listing creation and finalizes idempotently', async () => {
    await seedProfile('seller')
    const operationId = 'media-create-idempotent'
    const photo = { id: 'photo-one', contentType: 'image/jpeg', sizeBytes: JPEG_BYTES.length, sortOrder: 0 }
    const firstReservation = await reserveMedia('seller', { operationId, photos: [photo] })
    const duplicateReservation = await reserveMedia('seller', { operationId, photos: [photo] })
    assert.equal(firstReservation.listingId, duplicateReservation.listingId)
    assert.equal(firstReservation.uploads[0].path, duplicateReservation.uploads[0].path)

    await uploadReserved(firstReservation)
    const first = await finalizeMedia('seller', operationId)
    const retry = await finalizeMedia('seller', operationId)
    const listingSnap = await db.collection('listings').doc(first.listingId).get()

    assert.deepEqual(retry, first)
    assert.equal(first.listingVersion, 1)
    assert.equal(listingSnap.data()?.seller_id, 'seller')
    assert.equal(listingSnap.data()?.photos?.length, 1)
    assert.equal(listingSnap.data()?.media_paths?.[0], firstReservation.uploads[0].path)
    assert.match(listingSnap.data()?.media_paths?.[1], /thumb-photo-one[.]webp$/)
    assert.equal(listingSnap.data()?.photos?.[0]?.width, 2)
    assert.equal(listingSnap.data()?.photos?.[0]?.height, 2)
    assert.match(
      listingSnap.data()?.photos?.[0]?.download_url ?? '',
      /^http:\/\/127[.]0[.]0[.]1:9199\/v0\/b\//,
    )
  })

  test('returns the persisted reservation after a concurrent duplicate create', async () => {
    await seedProfile('seller')
    const operationId = 'media-concurrent-reservation'
    const photo = {
      id: 'photo-race',
      contentType: 'image/jpeg',
      sizeBytes: JPEG_BYTES.length,
      sortOrder: 0,
    }

    const [first, second] = await Promise.all([
      reserveMedia('seller', { operationId, photos: [photo] }),
      reserveMedia('seller', { operationId, photos: [photo] }),
    ])

    assert.equal(first.listingId, second.listingId)
    assert.equal(first.expiresAtMs, second.expiresAtMs)
    assert.deepEqual(first.uploads, second.uploads)
    const operations = await db.collection('listing_media_operations').get()
    assert.equal(operations.size, 1)
    assert.equal(operations.docs[0].data().listing_id, first.listingId)
  })

  test('rejects finalization when an upload is missing or mismatched', async () => {
    await seedProfile('seller')
    const missing = await reserveMedia('seller', {
      operationId: 'media-missing-upload',
      photos: [{ id: 'missing-photo', contentType: 'image/jpeg', sizeBytes: 64, sortOrder: 0 }],
    })
    await expectHttpsCode(finalizeMedia('seller', 'media-missing-upload'), 'failed-precondition')

    await bucket.file(missing.uploads[0].path).save(Buffer.alloc(63), { contentType: 'image/jpeg' })
    await expectHttpsCode(finalizeMedia('seller', 'media-missing-upload'), 'failed-precondition')
  })

  test('only one concurrent update at a listing version wins', async () => {
    await seedProfile('seller')
    await seedListing('listing-media-update', 'seller', {
      listing_version: 1,
      photos: [],
      media_paths: [],
      photo_schema_version: 0,
    })
    const firstOperation = 'media-update-first'
    const secondOperation = 'media-update-second'
    await reserveMedia('seller', {
      operationId: firstOperation,
      kind: 'update',
      listingId: 'listing-media-update',
      expectedListingVersion: 1,
      mutation: mediaMutation({ title: 'First edit' }),
    })
    await reserveMedia('seller', {
      operationId: secondOperation,
      kind: 'update',
      listingId: 'listing-media-update',
      expectedListingVersion: 1,
      mutation: mediaMutation({ title: 'Second edit' }),
    })

    const settled = await Promise.allSettled([
      finalizeMedia('seller', firstOperation),
      finalizeMedia('seller', secondOperation),
    ])
    const fulfilled = settled.filter((result) => result.status === 'fulfilled')
    const rejected = settled.filter((result) => result.status === 'rejected')
    const listingSnap = await db.collection('listings').doc('listing-media-update').get()

    assert.equal(fulfilled.length, 1)
    assert.equal(rejected.length, 1)
    assert.equal(rejected[0].reason?.code, 'aborted')
    assert.equal(listingSnap.data()?.listing_version, 2)
    assert.ok(['First edit', 'Second edit'].includes(listingSnap.data()?.title))

    const conflictOperations = await db
      .collection('listing_media_operations')
      .where('state', '==', 'conflict')
      .get()
    assert.equal(conflictOperations.size, 1)
    const conflictId = conflictOperations.docs[0].id
    const cleanupSnap = await db.collection('media_cleanup_jobs').doc(`media-${conflictId}`).get()
    const conflictPaths = cleanupSnap.data()?.paths ?? []
    assert.equal(conflictPaths.length, 0)
  })

  test('queues both original and thumbnail paths for a conflicting update', async () => {
    await seedProfile('seller')
    await seedListing('listing-media-photo-conflict', 'seller', {
      listing_version: 1,
      photos: [],
      media_paths: [],
      photo_schema_version: 0,
    })
    const firstOperation = 'media-photo-update-first'
    const secondOperation = 'media-photo-update-second'
    const first = await reserveMedia('seller', {
      operationId: firstOperation,
      kind: 'update',
      listingId: 'listing-media-photo-conflict',
      expectedListingVersion: 1,
      mutation: mediaMutation({ title: 'First photo edit' }),
      photos: [
        {
          id: 'photo-first',
          contentType: 'image/jpeg',
          sizeBytes: JPEG_BYTES.length,
          sortOrder: 0,
        },
      ],
    })
    const second = await reserveMedia('seller', {
      operationId: secondOperation,
      kind: 'update',
      listingId: 'listing-media-photo-conflict',
      expectedListingVersion: 1,
      mutation: mediaMutation({ title: 'Second photo edit' }),
      photos: [
        {
          id: 'photo-second',
          contentType: 'image/jpeg',
          sizeBytes: JPEG_BYTES.length,
          sortOrder: 0,
        },
      ],
    })
    await Promise.all([uploadReserved(first), uploadReserved(second)])

    const settled = await Promise.allSettled([
      finalizeMedia('seller', firstOperation),
      finalizeMedia('seller', secondOperation),
    ])
    const rejected = settled.find((result) => result.status === 'rejected')
    assert.equal(rejected?.reason?.code, 'aborted')

    const conflictOperations = await db
      .collection('listing_media_operations')
      .where('state', '==', 'conflict')
      .get()
    assert.equal(conflictOperations.size, 1)
    const conflictId = conflictOperations.docs[0].id
    const conflictPhotoId = conflictId === firstOperation ? 'photo-first' : 'photo-second'
    const cleanupSnap = await db.collection('media_cleanup_jobs').doc(`media-${conflictId}`).get()
    assert.deepEqual(cleanupSnap.data()?.paths, [
      `item_photos/seller/listing-media-photo-conflict/${conflictId}/${conflictPhotoId}.jpg`,
      `item_photos/seller/listing-media-photo-conflict/${conflictId}/thumb-${conflictPhotoId}.webp`,
    ])
  })

  test('deleting a listing atomically creates durable cleanup work', async () => {
    await seedProfile('seller')
    await seedListing('listing-media-delete', 'seller', {
      listing_version: 3,
      media_paths: ['item_photos/seller/listing-media-delete/op/photo.jpg'],
    })
    await callDeleteListingMedia({
      data: {
        listingId: 'listing-media-delete',
        expectedListingVersion: 3,
        operationId: 'delete-operation-12345678',
      },
      auth: authData('seller'),
    })
    const listingSnap = await db.collection('listings').doc('listing-media-delete').get()
    const jobs = await db.collection('media_cleanup_jobs').get()

    assert.equal(listingSnap.exists, false)
    assert.equal(jobs.size, 1)
    assert.deepEqual(jobs.docs[0].data().paths, ['item_photos/seller/listing-media-delete/op/photo.jpg'])
  })
})

describe('listing media cleanup', () => {
  test('expires reservations and idempotently removes uploaded objects', async () => {
    const operationId = 'media-expired-reservation'
    const listingId = 'listing-expired-reservation'
    const fileName = 'photo-expired.jpg'
    const storagePath = `item_photos/seller/${listingId}/${operationId}/${fileName}`
    await bucket.file(storagePath).save(JPEG_BYTES, { contentType: 'image/jpeg' })
    await db.collection('listing_media_operations').doc(operationId).set({
      schema_version: 1,
      owner_id: 'seller',
      listing_id: listingId,
      state: 'reserved',
      file_specs: {
        [fileName]: {
          photo_id: 'expired',
          content_type: 'image/jpeg',
          size_bytes: JPEG_BYTES.length,
          sort_order: 0,
        },
      },
      expires_at: Timestamp.fromMillis(Date.now() - 60_000),
    })

    await runMediaCleanup(db, bucket)
    await runMediaCleanup(db, bucket)
    await runMediaCleanup(db, bucket)

    const operationSnap = await db.collection('listing_media_operations').doc(operationId).get()
    const jobSnap = await db.collection('media_cleanup_jobs').doc(`expired-${operationId}`).get()
    const [exists] = await bucket.file(storagePath).exists()
    assert.equal(operationSnap.data()?.state, 'expired')
    assert.equal(jobSnap.data()?.state, 'done')
    assert.equal(exists, false)
  })

  test('retries deletion failures and succeeds when the object is already absent', async () => {
    const jobRef = db.collection('media_cleanup_jobs').doc('cleanup-retry')
    const storagePath = 'item_photos/seller/listing-retry/op/photo.jpg'
    await jobRef.set({
      schema_version: 1,
      state: 'pending',
      listing_id: 'listing-retry',
      operation_id: 'op',
      paths: [storagePath],
      attempts: 0,
      not_before: Timestamp.fromMillis(0),
      created_at: FieldValue.serverTimestamp(),
    })
    const failingBucket = {
      file: () => ({
        delete: async () => {
          throw new Error('temporary storage failure')
        },
      }),
    }

    await runMediaCleanup(db, failingBucket)
    let jobSnap = await jobRef.get()
    assert.equal(jobSnap.data()?.state, 'pending')
    assert.equal(jobSnap.data()?.attempts, 1)
    assert.equal(jobSnap.data()?.last_error, '1 object deletion(s) failed')

    await jobRef.update({ not_before: Timestamp.fromMillis(0) })
    await runMediaCleanup(db, bucket)
    jobSnap = await jobRef.get()
    assert.equal(jobSnap.data()?.state, 'done')
    assert.equal(jobSnap.data()?.attempts, 1)
    assert.equal(jobSnap.data()?.last_error, undefined)
  })

  test('rechecks listing references immediately before each deletion', async () => {
    const listingId = 'listing-reference-recheck'
    const firstPath = `item_photos/seller/${listingId}/op/first.jpg`
    const secondPath = `item_photos/seller/${listingId}/op/second.jpg`
    const listingRef = db.collection('listings').doc(listingId)
    await listingRef.set({ seller_id: 'seller', media_paths: [] })
    await db.collection('media_cleanup_jobs').doc('cleanup-reference-recheck').set({
      schema_version: 1,
      state: 'pending',
      listing_id: listingId,
      operation_id: 'op',
      paths: [firstPath, secondPath],
      attempts: 0,
      not_before: Timestamp.fromMillis(0),
      created_at: FieldValue.serverTimestamp(),
    })
    const deleted = []
    const changingBucket = {
      file: (storagePath) => ({
        delete: async () => {
          deleted.push(storagePath)
          if (storagePath === firstPath) {
            await listingRef.update({ media_paths: [secondPath] })
          }
        },
      }),
    }

    await runMediaCleanup(db, changingBucket)

    const jobSnap = await db
      .collection('media_cleanup_jobs')
      .doc('cleanup-reference-recheck')
      .get()
    assert.deepEqual(deleted, [firstPath])
    assert.equal(jobSnap.data()?.state, 'done')
  })
})

describe('administrator listing moderation', () => {
  test('removes a listing through an active claimed administrator and records audit', async () => {
    await seedProfile('administrator', { role: 'admin' })
    await seedProfile('seller')
    await seedListing('listing-admin-remove', 'seller')

    await callRemoveListingAsAdmin({
      data: {
        listingId: 'listing-admin-remove',
        note: 'Prohibited listing in the demo queue.',
      },
      auth: authData('administrator', { admin: true }),
    })

    const listingSnap = await db.collection('listings').doc('listing-admin-remove').get()
    const audit = await db
      .collection('audit_log')
      .where('listing_id', '==', 'listing-admin-remove')
      .get()
    assert.equal(listingSnap.data()?.status, 'removed')
    assert.equal(audit.size, 1)
    assert.equal(audit.docs[0].data().action, 'listing_removed')
  })

  test('rejects ordinary members removing another seller listing', async () => {
    await seedProfile('member')
    await seedListing('listing-admin-denied', 'seller')

    await expectHttpsCode(
      callRemoveListingAsAdmin({
        data: {
          listingId: 'listing-admin-denied',
          note: 'Unauthorized removal attempt.',
        },
        auth: authData('member'),
      }),
      'permission-denied',
    )
  })
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
