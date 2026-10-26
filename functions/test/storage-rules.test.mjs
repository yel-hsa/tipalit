import { after, before, beforeEach, describe, test } from 'node:test'

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from '@firebase/rules-unit-testing'

const PROJECT_ID = 'demo-tipalit'
const BUCKET = `${PROJECT_ID}.appspot.com`

const emulatorEndpoint = (value, fallbackPort) => {
  const url = new URL(`http://${value ?? `127.0.0.1:${fallbackPort}`}`)
  return { host: url.hostname, port: Number(url.port) }
}

let environment
let owner
let member
let suspended
let admin
let suspendedAdmin
let anonymous
let sequence = 0

const createUser = (name, claims = {}) => {
  const uid = `storage-${name}`
  const email = `${name}@tip.edu.ph`
  return {
    uid,
    email,
    context: environment.authenticatedContext(uid, {
      email,
      email_verified: true,
      ...claims,
    }),
  }
}

const objectRef = (actor, path) =>
  actor.context.storage(`gs://${BUCKET}`).ref(path)

const upload = (
  actor,
  path,
  contentType = 'image/jpeg',
  bytes = 64,
) =>
  objectRef(actor, path).put(new Uint8Array(bytes), {
    contentType,
  })

const read = (actor, path) => objectRef(actor, path).getMetadata()
const remove = (actor, path) => objectRef(actor, path).delete()

const withAdmin = (callback) =>
  environment.withSecurityRulesDisabled((context) => callback({
    firestore: context.firestore(),
    storage: context.storage(`gs://${BUCKET}`),
  }))

const operationFixture = async ({
  actor = owner,
  state = 'reserved',
  expiresAt = new Date(Date.now() + 60_000),
  sizeBytes = 64,
} = {}) => {
  const listingId = `listing-${sequence}`
  const operationId = `operation-${sequence}`
  const fileName = `photo-${sequence}.jpg`
  const path = `item_photos/${actor.uid}/${listingId}/${operationId}/${fileName}`

  await withAdmin(async ({ firestore }) => {
    await firestore.collection('listing_media_operations').doc(operationId).set({
      owner_id: actor.uid,
      listing_id: listingId,
      state,
      expires_at: expiresAt,
      file_specs: {
        [fileName]: {
          photo_id: `photo-${sequence}`,
          content_type: 'image/jpeg',
          size_bytes: sizeBytes,
          sort_order: 0,
        },
      },
    })
  })

  return { actor, listingId, operationId, fileName, path, sizeBytes }
}

const finalizeFixture = async (fixture) => {
  await withAdmin(async ({ firestore }) => {
    await firestore.collection('listings').doc(fixture.listingId).set({
      seller_id: fixture.actor.uid,
      status: 'active',
      media_paths: [fixture.path],
    })
    await firestore.collection('listing_media_operations').doc(fixture.operationId).update({
      state: 'finalized',
    })
  })
}

before(async () => {
  environment = await initializeTestEnvironment({
    projectId: PROJECT_ID,
    firestore: emulatorEndpoint(
      process.env.FIRESTORE_EMULATOR_HOST,
      8080,
    ),
    storage: emulatorEndpoint(
      process.env.FIREBASE_STORAGE_EMULATOR_HOST,
      9199,
    ),
  })

  owner = createUser('owner')
  member = createUser('member')
  suspended = createUser('suspended')
  admin = createUser('admin', { admin: true })
  suspendedAdmin = createUser('suspended-admin', { admin: true })
  anonymous = { context: environment.unauthenticatedContext() }

  await withAdmin(async ({ firestore }) => {
    const profiles = firestore.collection('users_profile')
    await Promise.all([
      profiles.doc(owner.uid).set({ user_id: owner.uid, email: owner.email, status: 'active' }),
      profiles.doc(member.uid).set({ user_id: member.uid, email: member.email, status: 'active' }),
      profiles.doc(suspended.uid).set({ user_id: suspended.uid, email: suspended.email, status: 'suspended' }),
      profiles.doc(admin.uid).set({ user_id: admin.uid, email: admin.email, status: 'active' }),
      profiles.doc(suspendedAdmin.uid).set({ user_id: suspendedAdmin.uid, email: suspendedAdmin.email, status: 'suspended' }),
    ])
  })
})

beforeEach(() => {
  sequence += 1
})

after(async () => {
  await environment.cleanup()
})

describe('listing media Storage rules', () => {
  test('reserved owners can upload before a listing exists', async () => {
    const fixture = await operationFixture()
    await assertSucceeds(upload(owner, fixture.path, 'image/jpeg', fixture.sizeBytes))
    await assertSucceeds(read(owner, fixture.path))
    await assertFails(read(member, fixture.path))
  })

  test('rejects missing, wrong-owner, expired, and finalized reservations', async () => {
    const missing = `item_photos/${owner.uid}/listing-${sequence}/operation-${sequence}/photo.jpg`
    await assertFails(upload(owner, missing))

    const owned = await operationFixture()
    await assertFails(upload(member, owned.path))

    const expired = await operationFixture({ expiresAt: new Date(Date.now() - 1000) })
    await assertFails(upload(owner, expired.path))

    const finalized = await operationFixture({ state: 'finalized' })
    await assertFails(upload(owner, finalized.path))
  })

  test('requires exact reserved filename, content type, and size', async () => {
    const fixture = await operationFixture()
    const base = `item_photos/${owner.uid}/${fixture.listingId}/${fixture.operationId}`
    await assertFails(upload(owner, `${base}/other.jpg`))
    await assertFails(upload(owner, fixture.path, 'image/png', fixture.sizeBytes))
    await assertFails(upload(owner, fixture.path, 'image/jpeg', fixture.sizeBytes + 1))
    await assertFails(upload(owner, `${base}/nested/${fixture.fileName}`))
  })

  test('reserved objects are immutable and cannot be deleted by clients', async () => {
    const fixture = await operationFixture()
    await assertSucceeds(upload(owner, fixture.path, 'image/jpeg', fixture.sizeBytes))
    await assertFails(upload(owner, fixture.path, 'image/jpeg', fixture.sizeBytes))
    await assertFails(remove(owner, fixture.path))
    await assertFails(remove(admin, fixture.path))
  })

  test('active members can read only exact finalized listing media paths', async () => {
    const fixture = await operationFixture()
    await assertSucceeds(upload(owner, fixture.path, 'image/jpeg', fixture.sizeBytes))
    await finalizeFixture(fixture)
    await assertSucceeds(read(member, fixture.path))

    await withAdmin(async ({ firestore }) => {
      await firestore.collection('listings').doc(fixture.listingId).update({ media_paths: [] })
    })
    await assertFails(read(member, fixture.path))
  })

  test('suspended and unauthenticated accounts cannot access media', async () => {
    const fixture = await operationFixture()
    await assertFails(upload(suspended, fixture.path, 'image/jpeg', fixture.sizeBytes))
    await assertFails(upload(anonymous, fixture.path, 'image/jpeg', fixture.sizeBytes))
    await assertSucceeds(upload(owner, fixture.path, 'image/jpeg', fixture.sizeBytes))
    await finalizeFixture(fixture)
    await assertFails(read(suspended, fixture.path))
    await assertFails(read(anonymous, fixture.path))
  })
})

describe('legacy listing media Storage rules', () => {
  test('legacy paths are read/delete only for their listing owner or active admin', async () => {
    const listingId = `legacy-${sequence}`
    const path = `item_photos/${owner.uid}/${listingId}/legacy.jpg`
    await withAdmin(async ({ firestore, storage }) => {
      await firestore.collection('listings').doc(listingId).set({ seller_id: owner.uid })
      await storage.ref(path).put(new Uint8Array(64), { contentType: 'image/jpeg' })
    })
    await assertSucceeds(read(owner, path))
    await assertSucceeds(read(member, path))
    await assertFails(read(anonymous, path))
    await assertFails(upload(owner, `item_photos/${owner.uid}/${listingId}/new.jpg`))
    await assertSucceeds(remove(admin, path))
  })
})

describe('promotion asset Storage rules', () => {
  test('only active claimed admins can upload promotions', async () => {
    const memberPath = `promo_assets/member-${sequence}.webp`
    const suspendedAdminPath = `promo_assets/suspended-admin-${sequence}.webp`
    const adminPath = `promo_assets/admin-${sequence}.webp`
    await assertFails(upload(member, memberPath, 'image/webp'))
    await assertFails(upload(suspendedAdmin, suspendedAdminPath, 'image/webp'))
    await assertSucceeds(upload(admin, adminPath, 'image/webp'))
  })
})
