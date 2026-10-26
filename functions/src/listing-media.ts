import { createHash, randomUUID } from 'node:crypto'
import { getStorage } from 'firebase-admin/storage'
import sharp from 'sharp'
import { FieldValue, Timestamp, type DocumentData } from 'firebase-admin/firestore'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import {
  MAX_LISTING_PHOTOS,
  parseCampus,
  parseListingPhotoSpecs,
  readOptionalString,
  readRequiredString,
  type ListingPhotoSpec,
} from './admin'

type ActiveMember = {
  auth: { uid: string; token: Record<string, unknown> }
  profile: DocumentData
}

type MediaDependencies = {
  db: FirebaseFirestore.Firestore
  assertActiveMember: (auth: ActiveMember['auth'] | undefined) => Promise<ActiveMember>
}

type ListingMutation = {
  title: string
  description: string
  price: number
  transaction_type: 'sale' | 'free' | 'trade'
  subject_code: string
  category: string
  department: string
  condition: string
  meetup_spot: string
  campus: 'qc' | 'manila'
}

type RetainedPhoto = {
  id: string
  storage_path: string
  download_url: string
  thumbnail_path: string | null
  thumbnail_url: string | null
  width: number
  height: number
  content_type: string
  size_bytes: number
  sort_order: number
  schema_version: number
}

const RESERVATION_MS = 30 * 60 * 1000
const KINDS = ['create', 'update'] as const
const TRANSACTION_TYPES = ['sale', 'free', 'trade'] as const
const CONDITIONS = ['New', 'Like New', 'Good', 'Fair'] as const
const CATEGORIES = [
  'Textbooks',
  'Calculators',
  'Uniforms',
  'Lab Gear',
  'Drafting Tools',
  'Electronics',
  'School Supplies',
  'Others',
] as const

const readEnum = <T extends string>(value: unknown, values: readonly T[], field: string): T => {
  if (!values.includes(value as T)) {
    throw new HttpsError('invalid-argument', `${field} is invalid.`)
  }
  return value as T
}

const readNumber = (value: unknown, field: string): number => {
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    throw new HttpsError('invalid-argument', `${field} is invalid.`)
  }
  return value
}

const parseMutation = (value: unknown, profile: DocumentData): ListingMutation => {
  if (!value || typeof value !== 'object') {
    throw new HttpsError('invalid-argument', 'mutation is required.')
  }
  const data = value as Record<string, unknown>
  const transactionType = readEnum(data.transactionType, TRANSACTION_TYPES, 'transactionType')
  const subjectCode = readRequiredString(data.courseCode, 'courseCode', 40).toUpperCase()
  return {
    title: readRequiredString(data.title, 'title', 100),
    description: readOptionalString(data.description, 'description', 1000) || 'No description provided.',
    price: transactionType === 'sale' ? readNumber(data.price, 'price') : 0,
    transaction_type: transactionType,
    subject_code: subjectCode,
    category: readEnum(data.category, CATEGORIES, 'category'),
    department: readRequiredString(data.department, 'department', 80),
    condition: readEnum(data.condition, CONDITIONS, 'condition'),
    meetup_spot: readRequiredString(data.meetupSpot, 'meetupSpot', 120),
    campus: parseCampus(data.campus ?? profile.campus),
  }
}

const stableHash = (value: unknown): string =>
  createHash('sha256').update(JSON.stringify(value)).digest('hex')

const operationPath = (
  ownerId: string,
  listingId: string,
  operationId: string,
  fileName: string,
): string => `item_photos/${ownerId}/${listingId}/${operationId}/${fileName}`

const downloadUrlFor = (bucket: string, storagePath: string, token: string): string =>
  `https://firebasestorage.googleapis.com/v0/b/${encodeURIComponent(bucket)}/o/${encodeURIComponent(storagePath)}?alt=media&token=${encodeURIComponent(token)}`

const THUMBNAIL_SIZE = 640

const sharpFormatFor = (contentType: string): 'jpeg' | 'png' | 'webp' =>
  contentType === 'image/png' ? 'png' : contentType === 'image/webp' ? 'webp' : 'jpeg'

const verifyAndCreateThumbnail = async (
  file: ReturnType<ReturnType<typeof getStorage>['bucket']> extends infer B
    ? B extends { file(path: string): infer F } ? F : never
    : never,
  contentType: string,
): Promise<{
  width: number
  height: number
  thumbnailBytes: Buffer
}> => {
  const [bytes] = await file.download()
  let metadata
  try {
    metadata = await sharp(bytes).metadata()
  } catch {
    throw new HttpsError('failed-precondition', 'An uploaded file is not a valid image.')
  }
  const actualFormat = metadata.format
  const expectedFormat = sharpFormatFor(contentType)
  if (!metadata.width || !metadata.height || actualFormat !== expectedFormat) {
    throw new HttpsError('failed-precondition', 'An uploaded image does not match its declared format.')
  }
  const thumbnailBytes = await sharp(bytes)
    .rotate()
    .resize({ width: THUMBNAIL_SIZE, height: THUMBNAIL_SIZE, fit: 'inside', withoutEnlargement: true })
    .webp({ quality: 78 })
    .toBuffer()
  return { width: metadata.width, height: metadata.height, thumbnailBytes }
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? value as Record<string, unknown> : {}

const readExistingPhotos = (data: DocumentData | undefined): RetainedPhoto[] => {
  if (!Array.isArray(data?.photos)) return []
  return data.photos.filter((photo: unknown): photo is RetainedPhoto => {
    const item = asRecord(photo)
    return typeof item.id === 'string' && typeof item.storage_path === 'string'
  })
}

const reservationResult = (
  operationId: string,
  ownerId: string,
  operation: FirebaseFirestore.DocumentData,
) => ({
  operationId,
  listingId: operation.listing_id,
  expiresAtMs: operation.expires_at.toMillis(),
  uploads: Object.entries(operation.file_specs ?? {})
    .sort(([, left], [, right]) =>
      Number(asRecord(left).sort_order) - Number(asRecord(right).sort_order),
    )
    .map(([fileName, spec]) => ({
      fileName,
      path: operationPath(ownerId, operation.listing_id, operationId, fileName),
      contentType: asRecord(spec).content_type,
      sizeBytes: asRecord(spec).size_bytes,
    })),
})

const cleanupJobId = (operationId: string): string => `media-${operationId}`

const cleanupJob = (listingId: string, operationId: string, paths: string[]) => ({
  schema_version: 1,
  state: 'pending',
  listing_id: listingId,
  operation_id: operationId,
  paths: [...new Set(paths)].sort(),
  attempts: 0,
  not_before: FieldValue.serverTimestamp(),
  created_at: FieldValue.serverTimestamp(),
})

const photoSpecMap = (specs: ListingPhotoSpec[]) =>
  Object.fromEntries(specs.map((spec) => [spec.fileName, {
    photo_id: spec.id,
    content_type: spec.contentType,
    size_bytes: spec.sizeBytes,
    sort_order: spec.sortOrder,
  }]))

const parseRetainedIds = (value: unknown): string[] => {
  if (!Array.isArray(value) || value.length > MAX_LISTING_PHOTOS) {
    throw new HttpsError('invalid-argument', `retainedPhotoIds must contain at most ${MAX_LISTING_PHOTOS} entries.`)
  }
  const ids = value.map((id, index) => readRequiredString(id, `retainedPhotoIds[${index}]`, 80))
  if (new Set(ids).size !== ids.length) {
    throw new HttpsError('invalid-argument', 'retainedPhotoIds must be unique.')
  }
  return ids
}

const resultFrom = (listingId: string, listingVersion: number) => ({
  listingId,
  listingVersion,
})

export const createListingMediaCallables = ({ db, assertActiveMember }: MediaDependencies) => {
  const reserveListingMedia = onCall(async (request) => {
    const { auth, profile } = await assertActiveMember(request.auth)
    const data = asRecord(request.data)
    const operationId = readRequiredString(data.operationId, 'operationId', 128)
    if (!/^[A-Za-z0-9][A-Za-z0-9_-]{7,127}$/.test(operationId)) {
      throw new HttpsError('invalid-argument', 'operationId is invalid.')
    }
    const kind = readEnum(data.kind, KINDS, 'kind')
    const expectedListingVersion = kind === 'create' ? 0 : readNumber(data.expectedListingVersion, 'expectedListingVersion')
    if (!Number.isInteger(expectedListingVersion)) {
      throw new HttpsError('invalid-argument', 'expectedListingVersion must be an integer.')
    }
    const listingId = kind === 'create'
      ? db.collection('listings').doc().id
      : readRequiredString(data.listingId, 'listingId', 128)
    const mutation = parseMutation(data.mutation, profile)
    const retainedPhotoIds = kind === 'create' ? [] : parseRetainedIds(data.retainedPhotoIds ?? [])
    const photos = parseListingPhotoSpecs(data.photos)
    if (retainedPhotoIds.length + photos.length > MAX_LISTING_PHOTOS) {
      throw new HttpsError('invalid-argument', `A listing can have at most ${MAX_LISTING_PHOTOS} photos.`)
    }

    const requestBody = {
      kind,
      listingId: kind === 'update' ? listingId : null,
      expectedListingVersion,
      mutation,
      retainedPhotoIds,
      photos,
    }
    const requestHash = stableHash(requestBody)
    const operationRef = db.collection('listing_media_operations').doc(operationId)
    const existingOperation = await operationRef.get()
    if (existingOperation.exists) {
      const existing = existingOperation.data()!
      if (existing.owner_id !== auth.uid || existing.request_hash !== requestHash) {
        throw new HttpsError('already-exists', 'That media operation id is already in use.')
      }
      return reservationResult(operationId, auth.uid, existing)
    }

    if (kind === 'update') {
      const listingSnap = await db.collection('listings').doc(listingId).get()
      if (!listingSnap.exists || listingSnap.data()?.seller_id !== auth.uid) {
        throw new HttpsError('not-found', 'That listing no longer exists.')
      }
      const currentVersion = listingSnap.data()?.listing_version ?? 0
      if (currentVersion !== expectedListingVersion) {
        throw new HttpsError('failed-precondition', 'The listing changed. Reload it before editing.')
      }
      const currentIds = new Set(readExistingPhotos(listingSnap.data()).map((photo) => photo.id))
      if (retainedPhotoIds.some((id) => !currentIds.has(id))) {
        throw new HttpsError('invalid-argument', 'A retained photo is no longer part of this listing.')
      }
    }

    const expiresAt = Timestamp.fromMillis(Date.now() + RESERVATION_MS)
    const fileSpecs = photoSpecMap(photos)
    let reservation: FirebaseFirestore.DocumentData = {
      listing_id: listingId,
      expires_at: expiresAt,
      file_specs: fileSpecs,
    }
    try {
      await operationRef.create({
        schema_version: 1,
        owner_id: auth.uid,
        listing_id: listingId,
        kind,
        expected_listing_version: expectedListingVersion,
        request_hash: requestHash,
        state: 'reserved',
        mutation,
        retained_photo_ids: retainedPhotoIds,
        file_specs: fileSpecs,
        created_at: FieldValue.serverTimestamp(),
        expires_at: expiresAt,
      })
    } catch (error) {
      const raced = await operationRef.get()
      if (!raced.exists || raced.data()?.owner_id !== auth.uid || raced.data()?.request_hash !== requestHash) {
        throw error
      }
      reservation = raced.data()!
    }

    return reservationResult(operationId, auth.uid, reservation)
  })

  const finalizeListingMedia = onCall(async (request) => {
    const { auth } = await assertActiveMember(request.auth)
    const operationId = readRequiredString(asRecord(request.data).operationId, 'operationId', 128)
    const operationRef = db.collection('listing_media_operations').doc(operationId)
    const operationSnap = await operationRef.get()
    if (!operationSnap.exists || operationSnap.data()?.owner_id !== auth.uid) {
      throw new HttpsError('not-found', 'That media operation no longer exists.')
    }
    const operation = operationSnap.data()!
    if (operation.state === 'finalized') return operation.result
    if (operation.state !== 'reserved') {
      throw new HttpsError('failed-precondition', 'That media operation is no longer active.')
    }
    if (operation.expires_at.toMillis() <= Date.now()) {
      throw new HttpsError('deadline-exceeded', 'That media upload reservation expired.')
    }

    const bucket = getStorage().bucket(`${process.env.GCLOUD_PROJECT ?? 'demo-tipalit'}.appspot.com`)
    const verifiedPhotos = await Promise.all(
      Object.entries(operation.file_specs ?? {}).map(async ([fileName, rawSpec]) => {
        const spec = asRecord(rawSpec)
        const storagePath = operationPath(auth.uid, operation.listing_id, operationId, fileName)
        const file = bucket.file(storagePath)
        const [exists] = await file.exists()
        if (!exists) {
          throw new HttpsError('failed-precondition', `Upload ${fileName} before publishing.`)
        }
        const [metadata] = await file.getMetadata()
        if (metadata.contentType !== spec.content_type || Number(metadata.size) !== spec.size_bytes) {
          throw new HttpsError('failed-precondition', `Upload ${fileName} does not match its reservation.`)
        }
        const existingMetadata = asRecord(metadata.metadata)
        const token = typeof existingMetadata.firebaseStorageDownloadTokens === 'string'
          ? existingMetadata.firebaseStorageDownloadTokens.split(',')[0]
          : randomUUID()
        if (existingMetadata.firebaseStorageDownloadTokens !== token) {
          await file.setMetadata({ metadata: { ...existingMetadata, firebaseStorageDownloadTokens: token } })
        }
        const image = await verifyAndCreateThumbnail(file, String(spec.content_type))
        const thumbnailPath = operationPath(
          auth.uid,
          operation.listing_id,
          operationId,
          `thumb-${String(spec.photo_id)}.webp`,
        )
        const thumbnailToken = randomUUID()
        await bucket.file(thumbnailPath).save(image.thumbnailBytes, {
          contentType: 'image/webp',
          metadata: { metadata: { firebaseStorageDownloadTokens: thumbnailToken } },
        })
        return {
          id: spec.photo_id,
          storage_path: storagePath,
          download_url: downloadUrlFor(bucket.name, storagePath, token),
          thumbnail_path: thumbnailPath,
          thumbnail_url: downloadUrlFor(bucket.name, thumbnailPath, thumbnailToken),
          width: image.width,
          height: image.height,
          content_type: spec.content_type,
          size_bytes: spec.size_bytes,
          sort_order: spec.sort_order,
          schema_version: 1,
        }
      }),
    )

    let conflict = false
    const result = await db.runTransaction(async (tx) => {
      const freshOperationSnap = await tx.get(operationRef)
      if (!freshOperationSnap.exists || freshOperationSnap.data()?.owner_id !== auth.uid) {
        throw new HttpsError('not-found', 'That media operation no longer exists.')
      }
      const freshOperation = freshOperationSnap.data()!
      if (freshOperation.state === 'finalized') return freshOperation.result
      if (freshOperation.state !== 'reserved') {
        throw new HttpsError('failed-precondition', 'That media operation is no longer active.')
      }

      const listingRef = db.collection('listings').doc(freshOperation.listing_id)
      const listingSnap = await tx.get(listingRef)
      const existing = listingSnap.data()
      const currentVersion = existing?.listing_version ?? 0
      const wrongOwner = listingSnap.exists && existing?.seller_id !== auth.uid
      const versionConflict = freshOperation.kind === 'create'
        ? listingSnap.exists
        : !listingSnap.exists || currentVersion !== freshOperation.expected_listing_version

      if (wrongOwner || versionConflict) {
        conflict = true
        const paths = verifiedPhotos.flatMap((photo) => [
          photo.storage_path,
          photo.thumbnail_path,
        ])
        const jobId = cleanupJobId(operationId)
        tx.set(db.collection('media_cleanup_jobs').doc(jobId), cleanupJob(freshOperation.listing_id, operationId, paths))
        tx.update(operationRef, { state: 'conflict', cleanup_job_id: jobId, finalized_at: FieldValue.serverTimestamp() })
        return null
      }

      const existingPhotos = readExistingPhotos(existing)
      const retainedIds = new Set<string>(freshOperation.retained_photo_ids ?? [])
      const retainedPhotos = existingPhotos.filter((photo) => retainedIds.has(photo.id))
      const photos = [...retainedPhotos, ...verifiedPhotos]
        .sort((a, b) => Number(a.sort_order) - Number(b.sort_order))
        .map((photo, sortOrder) => ({ ...photo, sort_order: sortOrder }))
      const retiredPaths = existingPhotos
        .filter((photo) => !retainedIds.has(photo.id))
        .flatMap((photo) => [photo.storage_path, photo.thumbnail_path].filter(Boolean)) as string[]
      const listingVersion = currentVersion + 1
      const mutation = freshOperation.mutation as ListingMutation
      const listingData = {
        ...mutation,
        seller_id: auth.uid,
        image_ids: photos.map((photo) => photo.download_url),
        photos,
        media_paths: photos.flatMap((photo) => [photo.storage_path, photo.thumbnail_path].filter(Boolean)),
        photo_schema_version: photos.length > 0 ? 1 : 0,
        listing_version: listingVersion,
        updated_at: FieldValue.serverTimestamp(),
        ...(freshOperation.kind === 'create' ? {
          status: 'active',
          report_count: 0,
          is_boosted: false,
          boost_until: null,
          created_at: new Date().toISOString(),
          server_timestamp: FieldValue.serverTimestamp(),
        } : {}),
      }
      tx.set(listingRef, listingData, { merge: freshOperation.kind === 'update' })
      if (retiredPaths.length > 0) {
        const jobId = cleanupJobId(operationId)
        tx.set(db.collection('media_cleanup_jobs').doc(jobId), cleanupJob(freshOperation.listing_id, operationId, retiredPaths))
      }
      const operationResult = resultFrom(freshOperation.listing_id, listingVersion)
      tx.update(operationRef, {
        state: 'finalized',
        finalized_at: FieldValue.serverTimestamp(),
        result: operationResult,
      })
      return operationResult
    })

    if (conflict || !result) {
      throw new HttpsError('aborted', 'The listing changed. Reload it before editing.')
    }
    return result
  })

  const deleteListingMedia = onCall(async (request) => {
    const { auth } = await assertActiveMember(request.auth)
    const data = asRecord(request.data)
    const listingId = readRequiredString(data.listingId, 'listingId', 128)
    const expectedListingVersion = readNumber(data.expectedListingVersion, 'expectedListingVersion')
    const operationId = typeof data.operationId === 'string' && data.operationId.trim()
      ? readRequiredString(data.operationId, 'operationId', 128)
      : randomUUID()
    const listingRef = db.collection('listings').doc(listingId)

    await db.runTransaction(async (tx) => {
      const listingSnap = await tx.get(listingRef)
      if (!listingSnap.exists || listingSnap.data()?.seller_id !== auth.uid) {
        throw new HttpsError('not-found', 'That listing no longer exists.')
      }
      const listing = listingSnap.data()!
      if ((listing.listing_version ?? 0) !== expectedListingVersion) {
        throw new HttpsError('failed-precondition', 'The listing changed. Reload it before deleting.')
      }
      const paths = Array.isArray(listing.media_paths)
        ? listing.media_paths.filter((path): path is string => typeof path === 'string')
        : readExistingPhotos(listing).flatMap((photo) => [photo.storage_path, photo.thumbnail_path].filter(Boolean)) as string[]
      if (paths.length > 0) {
        tx.set(
          db.collection('media_cleanup_jobs').doc(`delete-${listingId}-${operationId}`),
          cleanupJob(listingId, operationId, paths),
        )
      }
      tx.delete(listingRef)
    })

    return { listingId }
  })

  return { reserveListingMedia, finalizeListingMedia, deleteListingMedia }
}
