import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase-admin/app'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

initializeApp()
const db = getFirestore()

// reports before a listing auto-hides pending review
const AUTO_HIDE_THRESHOLD = 5

// report_count is server-only; clients can never write it
export const onReportCreated = onDocumentCreated('reports/{reportId}', async (event) => {
  const report = event.data?.data()
  if (!report || report.target?.kind !== 'listing') return

  const listingRef = db.collection('listings').doc(report.target.id)
  await db.runTransaction(async (tx) => {
    const listingSnap = await tx.get(listingRef)
    if (!listingSnap.exists) return
    const newCount = (listingSnap.data()?.report_count ?? 0) + 1
    const patch: Record<string, unknown> = { report_count: newCount }
    if (newCount >= AUTO_HIDE_THRESHOLD && listingSnap.data()?.status !== 'hidden') {
      patch.status = 'hidden'
    }
    tx.set(listingRef, patch, { merge: true })
  })
})

// aggregates are server-computed; clients never write them
export const onReviewWritten = onDocumentWritten('reviews/{reviewId}', async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!after) return // deleted; aggregates left as-is
  if (before?.rating === after.rating) return

  const revieweeId = after.reviewee_id as string
  const rating = after.rating as number
  const profileRef = db.collection('users_profile').doc(revieweeId)
  await db.runTransaction(async (tx) => {
    const profileSnap = await tx.get(profileRef)
    if (!profileSnap.exists) return
    const data = profileSnap.data()!
    const prevTotal = (data.total_reviews ?? 0) as number
    const prevAvg = (data.average_rating ?? 0) as number
    const total = before ? prevTotal : prevTotal + 1
    const average = before
      ? (prevAvg * prevTotal - (before.rating as number) + rating) / Math.max(total, 1)
      : (prevAvg * prevTotal + rating) / Math.max(total, 1)
    tx.set(
      profileRef,
      {
        average_rating: Math.round(average * 10) / 10,
        total_reviews: total,
      },
      { merge: true },
    )
  })
})

const ADMIN_EMAILS = ['osa.admin@tip.edu.ph']

const assertAdmin = (email: string | undefined) => {
  if (!email || !email.endsWith('@tip.edu.ph') || !ADMIN_EMAILS.includes(email)) {
    throw new HttpsError('permission-denied', 'Admins only.')
  }
}

// moderation is server-only so the client cannot forge the audit trail
export const resolveReport = onCall(async (request) => {
  assertAdmin(request.auth?.token.email as string | undefined)

  const { reportId, action, note } = request.data as {
    reportId: string
    action: 'remove_listing' | 'suspend_member' | 'dismiss'
    note: string
  }
  if (!reportId || !action || typeof note !== 'string') {
    throw new HttpsError('invalid-argument', 'reportId, action and note are required.')
  }

  const actorName = 'Office of Student Affairs'
  const at = new Date().toISOString()

  await db.runTransaction(async (tx) => {
    const reportRef = db.collection('reports').doc(reportId)
    const reportSnap = await tx.get(reportRef)
    if (!reportSnap.exists) throw new HttpsError('not-found', 'Report not found.')
    const report = reportSnap.data()!

    const resolution = { action, note, byName: actorName, at }
    tx.set(reportRef, { status: action === 'dismiss' ? 'dismissed' : 'resolved', resolution }, { merge: true })

    // resolving one report closes the rest on the same target
    const siblings = await db
      .collection('reports')
      .where('target.id', '==', report.target.id)
      .where('status', '==', 'open')
      .get()
    siblings.forEach((sibling) => {
      if (sibling.id !== reportId) {
        tx.set(sibling.ref, { status: 'resolved', resolution }, { merge: true })
      }
    })

    if (action === 'remove_listing' && report.target.kind === 'listing') {
      tx.set(
        db.collection('listings').doc(report.target.id),
        { status: 'hidden', hidden_reason: 'reports' },
        { merge: true },
      )
    }
    if (action === 'suspend_member') {
      tx.set(
        db.collection('users_profile').doc(report.subject_id),
        { status: 'suspended' },
        { merge: true },
      )
    }

    tx.set(db.collection('audit_log').doc(), {
      at,
      actor_name: actorName,
      action:
        action === 'remove_listing'
          ? 'listing_removed'
          : action === 'suspend_member'
            ? 'member_suspended'
            : 'report_dismissed',
      summary: `${actorName} resolved a report (${action}).`,
      note,
      report_id: reportId,
    })
  })

  return { ok: true }
})
