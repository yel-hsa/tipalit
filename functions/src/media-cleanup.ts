import { getStorage } from 'firebase-admin/storage'
import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import { onSchedule } from 'firebase-functions/v2/scheduler'
import { error as logError } from 'firebase-functions/logger'

const CLEANUP_BATCH_SIZE = 25
const CLEANUP_RETRY_MS = 5 * 60 * 1000

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

const bucketName = (): string =>
  `${process.env.GCLOUD_PROJECT ?? 'demo-tipalit'}.appspot.com`

type MediaBucket = {
  file(path: string): {
    delete(options: { ignoreNotFound: boolean }): Promise<unknown>
  }
}

const referencedPathsFor = async (
  db: FirebaseFirestore.Firestore,
  listingId: string,
): Promise<Set<string>> => {
  const listingSnap = await db.collection('listings').doc(listingId).get()
  return new Set<string>(
    Array.isArray(listingSnap.data()?.media_paths)
      ? listingSnap.data()!.media_paths.filter(
          (path: unknown): path is string => typeof path === 'string',
        )
      : [],
  )
}

export const runMediaCleanup = async (
  db: FirebaseFirestore.Firestore,
  bucket: MediaBucket = getStorage().bucket(bucketName()),
): Promise<void> => {
  const now = Timestamp.now()
  const expired = await db
    .collection('listing_media_operations')
    .where('state', '==', 'reserved')
    .where('expires_at', '<=', now)
    .limit(CLEANUP_BATCH_SIZE)
    .get()

  for (const operationSnap of expired.docs) {
    await db.runTransaction(async (tx) => {
      const fresh = await tx.get(operationSnap.ref)
      if (!fresh.exists || fresh.data()?.state !== 'reserved') return
      const operation = fresh.data()!
      const paths = Object.keys(operation.file_specs ?? {}).map(
        (fileName) =>
          `item_photos/${operation.owner_id}/${operation.listing_id}/${fresh.id}/${fileName}`,
      )
      const jobId = `expired-${fresh.id}`
      tx.set(
        db.collection('media_cleanup_jobs').doc(jobId),
        cleanupJob(operation.listing_id, fresh.id, paths),
        { merge: false },
      )
      tx.update(fresh.ref, {
        state: 'expired',
        cleanup_job_id: jobId,
        finalized_at: FieldValue.serverTimestamp(),
      })
    })
  }

  const jobs = await db
    .collection('media_cleanup_jobs')
    .where('state', '==', 'pending')
    .where('not_before', '<=', now)
    .limit(CLEANUP_BATCH_SIZE)
    .get()
  for (const jobSnap of jobs.docs) {
    const job = jobSnap.data()
    const failures: string[] = []
    for (const path of Array.isArray(job.paths) ? job.paths : []) {
      if (typeof path !== 'string') continue
      const referencedPaths = await referencedPathsFor(db, job.listing_id)
      if (referencedPaths.has(path)) continue
      try {
        await bucket.file(path).delete({ ignoreNotFound: true })
      } catch (error) {
        failures.push(path)
        logError('Listing media cleanup failed.', {
          jobId: jobSnap.id,
          path,
          error,
        })
      }
    }

    if (failures.length === 0) {
      await jobSnap.ref.update({
        state: 'done',
        completed_at: FieldValue.serverTimestamp(),
        last_error: FieldValue.delete(),
      })
    } else {
      await jobSnap.ref.update({
        state: 'pending',
        attempts: FieldValue.increment(1),
        not_before: Timestamp.fromMillis(Date.now() + CLEANUP_RETRY_MS),
        last_error: `${failures.length} object deletion(s) failed`,
      })
    }
  }
}

export const createMediaCleanupWorker = (db: FirebaseFirestore.Firestore) =>
  onSchedule('every 15 minutes', async () => runMediaCleanup(db))
