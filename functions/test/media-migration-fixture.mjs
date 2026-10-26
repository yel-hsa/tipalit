#!/usr/bin/env node

import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import path from 'node:path'

const PROJECT_ID = 'demo-tipalit'
const require = createRequire(path.resolve('functions/package.json'))
const { applicationDefault, deleteApp, initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage')

process.env.GCLOUD_PROJECT = PROJECT_ID
process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199'

const app = initializeApp(
  { credential: applicationDefault(), projectId: PROJECT_ID },
  `media-migration-fixture-${process.argv[2] ?? 'seed'}`,
)
const db = getFirestore(app)
const bucket = getStorage(app).bucket(`${PROJECT_ID}.appspot.com`)
const PNG = 'iVBORw0KGgoAAAANSUhEUgAAAAIAAAACCAYAAABytg0kAAAACXBIWXMAAAPoAAAD6AG1e1JrAAAAEUlEQVQImWP4eYLvPwgzwBgAZloLOTU+k7QAAAAASUVORK5CYII='
const dataUrl = `data:image/png;base64,${PNG}`

const mode = process.argv[2]

try {
  if (mode === 'seed') {
    await Promise.all([
      db.collection('listings').doc('legacy-inline').set({
        seller_id: 'seller-one',
        title: 'Legacy inline listing',
        image_ids: [dataUrl],
      }),
      db.collection('listings').doc('legacy-mixed').set({
        seller_id: 'seller-two',
        title: 'Mixed listing',
        image_ids: [dataUrl, 'https://example.com/external.jpg'],
      }),
    ])
  } else if (mode === 'verify-dry') {
    const inline = await db.collection('listings').doc('legacy-inline').get()
    assert.equal(inline.data()?.photos, undefined)
    assert.equal(inline.data()?.image_ids?.[0], dataUrl)
  } else if (mode === 'verify-apply') {
    const inline = await db.collection('listings').doc('legacy-inline').get()
    const mixed = await db.collection('listings').doc('legacy-mixed').get()
    const photos = inline.data()?.photos
    assert.equal(photos?.length, 1)
    assert.equal(photos[0].width, 2)
    assert.equal(photos[0].height, 2)
    assert.match(photos[0].thumbnail_path, /thumb-migrated-legacy-inline-0[.]webp$/)
    assert.equal(inline.data()?.media_paths?.length, 2)
    assert.equal(mixed.data()?.photos, undefined)
    assert.equal(mixed.data()?.image_ids?.[1], 'https://example.com/external.jpg')
    const [sourceExists] = await bucket.file(photos[0].storage_path).exists()
    const [thumbExists] = await bucket.file(photos[0].thumbnail_path).exists()
    assert.equal(sourceExists, true)
    assert.equal(thumbExists, true)
  } else {
    throw new Error(`Unknown mode: ${mode}`)
  }
} finally {
  await deleteApp(app)
}
