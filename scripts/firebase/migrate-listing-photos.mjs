#!/usr/bin/env node

import { createRequire } from 'node:module'
import { randomUUID } from 'node:crypto'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(SCRIPT_DIR, '..', '..')
const ALLOWED_PROJECT = /^[a-z][a-z0-9-]{4,29}$/
const MAX_PHOTOS = 5
const MAX_BYTES = 5 * 1024 * 1024

const fail = (message) => {
  console.error(`[migrate-listing-photos] ${message}`)
  process.exit(1)
}

const parseArgs = (argv) => {
  const values = new Map()
  const flags = new Set()
  for (const arg of argv) {
    if (arg.startsWith('--') && arg.includes('=')) {
      const separator = arg.indexOf('=')
      values.set(arg.slice(2, separator), arg.slice(separator + 1))
    } else if (arg.startsWith('--')) {
      flags.add(arg.slice(2))
    } else {
      fail(`Unexpected argument: ${arg}`)
    }
  }
  return { values, flags }
}

const { values, flags } = parseArgs(process.argv.slice(2))
const projectId = values.get('project')?.trim()
const confirmProject = values.get('confirm-project')?.trim()
const limit = Number(values.get('limit') ?? '100')
const apply = flags.has('apply')
const allowLive = flags.has('allow-live')

if (!projectId || !ALLOWED_PROJECT.test(projectId)) {
  fail('Provide a valid --project=<Firebase project ID>.')
}
if (!Number.isInteger(limit) || limit < 1 || limit > 1000) {
  fail('--limit must be an integer from 1 to 1000.')
}
if (apply && confirmProject !== projectId) {
  fail('Apply mode requires --confirm-project=<same project ID>.')
}
if (!projectId.startsWith('demo-') && apply && !allowLive) {
  fail('Live apply requires --allow-live in addition to project confirmation.')
}
if (projectId.startsWith('demo-')) {
  process.env.FIRESTORE_EMULATOR_HOST ??= '127.0.0.1:8080'
  process.env.FIREBASE_STORAGE_EMULATOR_HOST ??= '127.0.0.1:9199'
}
process.env.GCLOUD_PROJECT = projectId

const require = createRequire(path.join(REPO_ROOT, 'functions', 'package.json'))
const { applicationDefault, deleteApp, initializeApp } = require('firebase-admin/app')
const { getFirestore } = require('firebase-admin/firestore')
const { getStorage } = require('firebase-admin/storage')
const sharp = require('sharp')

const app = initializeApp(
  { credential: applicationDefault(), projectId },
  'listing-photo-migration',
)
const db = getFirestore(app)
const bucket = getStorage(app).bucket(`${projectId}.appspot.com`)

const asStrings = (value) => {
  if (Array.isArray(value)) {
    return value.filter(
      (entry) => typeof entry === 'string' && entry.trim().length > 0,
    )
  }
  if (typeof value !== 'string' || !value.trim()) return []
  const text = value.trim()
  if (!text.startsWith('[')) return [text]
  try {
    return asStrings(JSON.parse(text))
  } catch {
    return text
      .replace(/^\[|\]$/g, '')
      .split(/[,\s]+/)
      .map((entry) => entry.trim().replace(/^["']|["']$/g, ''))
      .filter(Boolean)
  }
}

const decodeDataUrl = (value) => {
  const match = /^data:(image\/(?:jpeg|png|webp));base64,([A-Za-z0-9+/=\s]+)$/.exec(
    value,
  )
  if (!match) return null
  const bytes = Buffer.from(match[2].replace(/\s/g, ''), 'base64')
  if (bytes.length === 0 || bytes.length >= MAX_BYTES) return null
  return { contentType: match[1], bytes }
}

const extensionFor = (contentType) =>
  contentType === 'image/png'
    ? 'png'
    : contentType === 'image/webp'
      ? 'webp'
      : 'jpg'

const dimensionsFromImage = async (bytes, contentType) => {
  const metadata = await sharp(bytes).metadata()
  const expectedFormat =
    contentType === 'image/png'
      ? 'png'
      : contentType === 'image/webp'
        ? 'webp'
        : 'jpeg'
  if (!metadata.width || !metadata.height || metadata.format !== expectedFormat) {
    throw new Error(`Invalid ${contentType} image data.`)
  }
  return { width: metadata.width, height: metadata.height }
}

const thumbnailFromImage = (bytes) =>
  sharp(bytes)
    .rotate()
    .resize({ width: 640, height: 640, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer()

const migrateListing = async (snapshot) => {
  const data = snapshot.data() ?? {}
  if (Array.isArray(data.photos) && data.photo_schema_version === 1) {
    return { state: 'current', id: snapshot.id }
  }

  const sellerId = typeof data.seller_id === 'string' ? data.seller_id : ''
  if (!sellerId || sellerId.includes('/')) {
    return { state: 'blocked', id: snapshot.id, reason: 'missing seller_id' }
  }

  const urls = asStrings(data.image_ids).slice(0, MAX_PHOTOS)
  if (urls.some((value) => !decodeDataUrl(value))) {
    return {
      state: 'blocked',
      id: snapshot.id,
      reason: 'mixed inline/external photos require manual review',
    }
  }
  const inline = urls
    .map((value, sortOrder) => ({ value, sortOrder, decoded: decodeDataUrl(value) }))
    .filter((entry) => entry.decoded)
  if (inline.length === 0) {
    return { state: 'unchanged', id: snapshot.id }
  }

  const uploaded = []
  const replacements = new Map()
  try {
    for (const entry of inline) {
      const id = `migrated-${snapshot.id}-${entry.sortOrder}`
      const extension = extensionFor(entry.decoded.contentType)
      const storagePath = `item_photos/${sellerId}/${snapshot.id}/migration-${snapshot.id}/${id}.${extension}`
      const thumbnailPath = `item_photos/${sellerId}/${snapshot.id}/migration-${snapshot.id}/thumb-${id}.webp`
      const file = bucket.file(storagePath)
      const thumbnailFile = bucket.file(thumbnailPath)
      const [exists] = await file.exists()
      const [thumbnailExists] = await thumbnailFile.exists()
      const downloadToken = randomUUID()
      const thumbnailToken = randomUUID()
      if (apply && !exists) {
        await file.save(entry.decoded.bytes, {
          resumable: false,
          metadata: {
            contentType: entry.decoded.contentType,
            metadata: { firebaseStorageDownloadTokens: downloadToken },
          },
        })
        uploaded.push(file)
      }
      if (apply && !thumbnailExists) {
        await thumbnailFile.save(await thumbnailFromImage(entry.decoded.bytes), {
          resumable: false,
          metadata: {
            contentType: 'image/webp',
            metadata: { firebaseStorageDownloadTokens: thumbnailToken },
          },
        })
        uploaded.push(thumbnailFile)
      }
      let token = downloadToken
      let storedThumbnailToken = thumbnailToken
      if (exists && apply) {
        const [metadata] = await file.getMetadata()
        token =
          metadata.metadata?.firebaseStorageDownloadTokens
            ?.split(',')[0]
            ?.trim() || token
      }
      if (thumbnailExists && apply) {
        const [metadata] = await thumbnailFile.getMetadata()
        storedThumbnailToken =
          metadata.metadata?.firebaseStorageDownloadTokens
            ?.split(',')[0]
            ?.trim() || storedThumbnailToken
      }
      const downloadUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`
      const thumbnailUrl = `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket.name)}/o/${encodeURIComponent(thumbnailPath)}?alt=media&token=${encodeURIComponent(storedThumbnailToken)}`
      replacements.set(entry.sortOrder, downloadUrl)
      const dimensions = await dimensionsFromImage(entry.decoded.bytes, entry.decoded.contentType)
      entry.photo = {
        id,
        storage_path: storagePath,
        download_url: downloadUrl,
        thumbnail_path: thumbnailPath,
        thumbnail_url: thumbnailUrl,
        width: dimensions.width,
        height: dimensions.height,
        content_type: entry.decoded.contentType,
        size_bytes: entry.decoded.bytes.length,
        sort_order: entry.sortOrder,
        schema_version: 1,
      }
    }

    const imageIds = urls.map(
      (value, index) => replacements.get(index) ?? value,
    )
    const photos = inline.map((entry) => entry.photo)
    if (apply) {
      await snapshot.ref.update({
        image_ids: imageIds,
        photos,
        media_paths: photos.flatMap((photo) => [photo.storage_path, photo.thumbnail_path]),
        photo_schema_version: 1,
        listing_version: typeof data.listing_version === 'number' ? data.listing_version : 0,
        photo_migrated_at: new Date(),
      })
    }
    return { state: apply ? 'migrated' : 'planned', id: snapshot.id, count: photos.length }
  } catch (error) {
    if (apply) {
      await Promise.allSettled(uploaded.map((file) => file.delete()))
    }
    throw error
  }
}

try {
  const snapshot = await db.collection('listings').limit(limit).get()
  const summary = { current: 0, unchanged: 0, blocked: 0, planned: 0, migrated: 0 }

  console.log(`TIPalit listing-photo migration — ${apply ? 'APPLY' : 'DRY RUN'}`)
  console.log(`Project: ${projectId}`)
  console.log(`Mode: ${projectId.startsWith('demo-') ? 'emulator' : 'live project'}`)
  console.log(`Scan limit: ${limit}`)

  for (const listing of snapshot.docs) {
    const result = await migrateListing(listing)
    summary[result.state] += 1
    const detail = result.count ? ` (${result.count} photo(s))` : ''
    const reason = result.reason ? ` — ${result.reason}` : ''
    console.log(`  ${result.id}: ${result.state}${detail}${reason}`)
  }

  console.log('\nSummary')
  Object.entries(summary).forEach(([key, value]) =>
    console.log(`  ${key}: ${value}`),
  )
  if (!apply) {
    console.log(
      `\nDry run only. Apply requires --apply --confirm-project=${projectId}${
        projectId.startsWith('demo-') ? '' : ' --allow-live'
      }.`,
    )
  }
} finally {
  await deleteApp(app)
}
