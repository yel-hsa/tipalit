import { onDocumentWritten } from 'firebase-functions/v2/firestore'
import { getAuth } from 'firebase-admin/auth'
import { FieldValue, getFirestore } from 'firebase-admin/firestore'
import { initializeApp } from 'firebase-admin/app'
import { HttpsError, onCall } from 'firebase-functions/v2/https'
import { error as logError } from 'firebase-functions/logger'
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
} from './admin'
import { createListingMediaCallables } from './listing-media'
import { createMediaCleanupWorker } from './media-cleanup'

initializeApp()
const db = getFirestore()

const AUTO_HIDE_THRESHOLD = 5

export const onReviewWritten = onDocumentWritten('reviews/{reviewId}', async (event) => {
  const before = event.data?.before.data()
  const after = event.data?.after.data()
  if (!after) return
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

const actorNameFrom = (token: Record<string, unknown>): string => {
  if (typeof token.name === 'string' && token.name.trim()) return token.name.trim()
  if (typeof token.email === 'string' && token.email.trim()) return token.email.trim()
  return 'Admin Staff'
}

const assertActiveMember = async (auth: Parameters<typeof requireAdmin>[0]) => {
  if (!auth) {
    throw new HttpsError('unauthenticated', 'Sign in again to continue.')
  }
  const email = typeof auth.token.email === 'string' ? auth.token.email.toLowerCase() : ''
  if (auth.token.email_verified !== true || !email.endsWith('@tip.edu.ph')) {
    throw new HttpsError('permission-denied', 'A verified TIP account is required.')
  }
  const profile = await db.collection('users_profile').doc(auth.uid).get()
  if (!profile.exists || profile.data()?.status !== 'active') {
    throw new HttpsError('permission-denied', 'This account is not active.')
  }
  return { auth, profile: profile.data()! }
}

const assertActiveAdmin = async (auth: Parameters<typeof requireAdmin>[0]) => {
  const verified = requireAdmin(auth)
  const profile = await db.collection('users_profile').doc(verified.uid).get()
  if (!profile.exists || profile.data()?.status !== 'active') {
    throw new HttpsError('permission-denied', 'This administrator account is not active.')
  }
  return verified
}

const revokeRefreshTokensAfterCommit = async (userId: string, operation: string) => {
  try {
    await getAuth().revokeRefreshTokens(userId)
  } catch (error) {
    logError('Refresh token revocation failed after a committed account-state change.', {
      userId,
      operation,
      error,
    })
  }
}

const reportFromData = (
  id: string,
  data: FirebaseFirestore.DocumentData,
  status: 'resolved' | 'dismissed',
  resolution: { action: 'remove_listing' | 'suspend_member' | 'dismiss'; note: string; byName: string; at: string },
) => {
  const target = reportTarget(data)
  return {
    id,
    target,
    subjectId: reportSubjectId(data, target.id),
    subjectName: data.subjectName || data.subject_name || 'Student',
    campus: data.campus === 'manila' ? 'manila' : 'qc',
    reason: data.reason || 'Other',
    details: data.details || '',
    reporterId: data.reporter_id || data.reporterId || '',
    reporterName: data.reporter_name || data.reporterName || 'Reporter',
    createdAt: data.created_at || data.createdAt || resolution.at,
    status,
    resolution,
  }
}

const openReportFromData = (id: string, data: FirebaseFirestore.DocumentData) => {
  const target = reportTarget(data)
  return {
    id,
    target,
    subjectId: reportSubjectId(data, target.id),
    subjectName: data.subjectName || data.subject_name || 'Student',
    campus: data.campus === 'manila' ? 'manila' : 'qc',
    reason: data.reason || 'Other',
    details: data.details || '',
    reporterId: data.reporter_id || data.reporterId || '',
    reporterName: data.reporter_name || data.reporterName || 'Reporter',
    createdAt: data.created_at || data.createdAt || new Date().toISOString(),
    status: 'open' as const,
  }
}

export const submitReport = onCall(async (request) => {
  const { auth, profile } = await assertActiveMember(request.auth)
  const data = request.data as Record<string, unknown>
  const kind = parseReportKind(data.kind)
  const targetId = readRequiredString(data.targetId, 'targetId', 180)
  const reason = parseReportReason(kind, data.reason)
  const details = readOptionalString(data.details, 'details', 300)
  if (targetId === auth.uid && kind === 'user') {
    throw new HttpsError('failed-precondition', "You can't report your own account.")
  }

  const targetRef = db.collection(kind === 'listing' ? 'listings' : 'users_profile').doc(targetId)
  const reportId = reportDocumentId(auth.uid, kind, targetId)
  const reportRef = db.collection('reports').doc(reportId)
  const rateLimitRef = db.collection('report_rate_limits').doc(auth.uid)
  const nowMs = Date.now()
  const nowIso = new Date(nowMs).toISOString()
  let reportData: FirebaseFirestore.DocumentData = {}

  await db.runTransaction(async (tx) => {
    const [targetSnap, reportSnap, rateLimitSnap] = await Promise.all([
      tx.get(targetRef),
      tx.get(reportRef),
      tx.get(rateLimitRef),
    ])
    if (!targetSnap.exists) {
      throw new HttpsError('not-found', kind === 'listing' ? 'Listing not found.' : 'Member not found.')
    }
    if (reportSnap.exists && reportSnap.data()?.status === 'open') {
      reportData = reportSnap.data()!
      return
    }

    const targetData = targetSnap.data()!
    if (kind === 'listing' && targetData.seller_id === auth.uid) {
      throw new HttpsError('failed-precondition', "You can't report your own listing.")
    }
    const isReopen = reportSnap.exists
    const rateLimit = reportRateLimitState(rateLimitSnap.data(), nowMs, !isReopen)
    const subjectId = kind === 'listing' ? targetData.seller_id : targetId
    if (typeof subjectId !== 'string' || !subjectId) {
      throw new HttpsError('failed-precondition', 'The report subject is invalid.')
    }
    const subject = targetData
    const label = kind === 'listing' ? targetData.title || 'Listing' : subject.full_name || subject.name || 'Member'
    const reporterName = profile.full_name || profile.name || auth.token.name || auth.token.email || 'TIP Student'
    const campus = (kind === 'listing' ? targetData.campus : subject.campus) === 'manila' ? 'manila' : 'qc'
    const subjectName =
      kind === 'listing'
        ? typeof targetData.seller_name === 'string' && targetData.seller_name
          ? targetData.seller_name
          : 'TIP Student'
        : subject.full_name || subject.name || 'TIP Student'
    reportData = {
      id: reportId,
      target_type: kind,
      target_id: targetId,
      target: { kind, id: targetId, label },
      reporter_id: auth.uid,
      reporterId: auth.uid,
      reporter_name: reporterName,
      reporterName,
      subject_id: subjectId,
      subjectId,
      subject_name: subjectName,
      subjectName,
      campus,
      reason,
      details,
      status: 'open',
      created_at: nowIso,
      updated_at: FieldValue.serverTimestamp(),
      server_timestamp: FieldValue.serverTimestamp(),
    }
    if (isReopen) {
      tx.set(reportRef, { ...reportData, resolution: FieldValue.delete() }, { merge: true })
    } else {
      tx.create(reportRef, reportData)
    }
    if (!isReopen) {
      tx.set(
        rateLimitRef,
        {
          count: rateLimit.count,
          window_started_at_ms: rateLimit.windowStartedAtMs,
          updated_at: FieldValue.serverTimestamp(),
        },
        { merge: true },
      )
    }
    if (kind === 'listing' && !isReopen) {
      const nextReportCount =
        (typeof targetData.report_count === 'number' ? targetData.report_count : 0) + 1
      const listingPatch: Record<string, unknown> = { report_count: nextReportCount }
      if (nextReportCount >= AUTO_HIDE_THRESHOLD && targetData.status !== 'removed') {
        listingPatch.status = 'removed'
        listingPatch.moderated_at = FieldValue.serverTimestamp()
        listingPatch.moderated_reason = 'report_threshold'
      }
      tx.set(targetRef, listingPatch, { merge: true })
    }
  })

  return { report: openReportFromData(reportId, reportData) }
})

export const resolveReport = onCall(async (request) => {
  const admin = await assertActiveAdmin(request.auth)
  const data = request.data as Record<string, unknown>
  const reportId = readRequiredString(data.reportId, 'reportId', 180)
  const action = parseReportAction(data.action)
  const note = readRequiredString(data.note, 'note', 1000)
  const actorName = actorNameFrom(admin.token)
  const at = new Date().toISOString()

  const reportRef = db.collection('reports').doc(reportId)
  const reportSnap = await reportRef.get()
  if (!reportSnap.exists) throw new HttpsError('not-found', 'Report not found.')
  const report = reportSnap.data()!

  const target = reportTarget(report)
  const subjectId = reportSubjectId(report, target.id)
  if (action === 'remove_listing' && target.kind !== 'listing') {
    throw new HttpsError('failed-precondition', 'Only listing reports can remove a listing.')
  }

  const [nestedSiblings, flatSiblings] = await Promise.all([
    db.collection('reports').where('target.id', '==', target.id).where('status', '==', 'open').get(),
    db.collection('reports').where('target_id', '==', target.id).where('status', '==', 'open').get(),
  ])
  const siblingRefs = new Map<string, FirebaseFirestore.DocumentReference>()
  nestedSiblings.forEach((snapshot) => siblingRefs.set(snapshot.id, snapshot.ref))
  flatSiblings.forEach((snapshot) => siblingRefs.set(snapshot.id, snapshot.ref))
  siblingRefs.set(reportRef.id, reportRef)

  const resolution = { action, note, byName: actorName, at }
  const status = action === 'dismiss' ? 'dismissed' : 'resolved'
  const auditRef = db.collection('audit_log').doc(`report_${reportId}`)
  await db.runTransaction(async (tx) => {
    const siblingSnaps = await tx.getAll(...siblingRefs.values())
    const currentSnap = siblingSnaps.find((snapshot) => snapshot.id === reportId)
    if (!currentSnap?.exists) throw new HttpsError('not-found', 'Report not found.')
    if (currentSnap.data()?.status !== 'open') {
      throw new HttpsError('failed-precondition', 'This report has already been resolved.')
    }
    if (siblingSnaps.some((snapshot) => snapshot.exists && snapshot.data()?.status !== 'open')) {
      throw new HttpsError('failed-precondition', 'A report for this target has already been resolved.')
    }

    siblingSnaps.forEach((snapshot) =>
      tx.set(snapshot.ref, { status, resolution, updated_at: FieldValue.serverTimestamp() }, { merge: true }),
    )

    if (action === 'remove_listing') {
      tx.set(
        db.collection('listings').doc(target.id),
        { status: 'removed', moderated_at: FieldValue.serverTimestamp(), moderated_by: admin.uid },
        { merge: true },
      )
    } else if (action === 'suspend_member') {
      tx.set(
        db.collection('users_profile').doc(subjectId),
        { status: 'suspended', updated_at: FieldValue.serverTimestamp() },
        { merge: true },
      )
    }

    tx.set(auditRef, {
      at,
      actor_id: admin.uid,
      actorName,
      action:
        action === 'remove_listing'
          ? 'listing_removed'
          : action === 'suspend_member'
            ? 'member_suspended'
            : 'report_dismissed',
      summary: `${actorName} resolved report ${reportId}.`,
      note,
      report_id: reportId,
      target,
      server_timestamp: FieldValue.serverTimestamp(),
    })
  })

  if (action === 'suspend_member') {
    await revokeRefreshTokensAfterCommit(subjectId, 'resolveReport')
  }

  return { report: reportFromData(reportId, report, status, resolution) }
})

export const removeListingAsAdmin = onCall(async (request) => {
  const admin = await assertActiveAdmin(request.auth)
  const data = request.data as Record<string, unknown>
  const listingId = readRequiredString(data.listingId, 'listingId', 180)
  const note = readRequiredString(data.note, 'note', 1000)
  const listingRef = db.collection('listings').doc(listingId)
  const actorName = actorNameFrom(admin.token)
  const auditRef = db.collection('audit_log').doc()
  const at = new Date().toISOString()

  await db.runTransaction(async (tx) => {
    const listingSnap = await tx.get(listingRef)
    if (!listingSnap.exists) {
      throw new HttpsError('not-found', 'Listing not found.')
    }
    if (listingSnap.data()?.status === 'removed') return

    tx.update(listingRef, {
      status: 'removed',
      moderated_at: FieldValue.serverTimestamp(),
      moderated_by: admin.uid,
      moderated_reason: 'admin_action',
      updated_at: FieldValue.serverTimestamp(),
    })
    tx.create(auditRef, {
      at,
      actor_id: admin.uid,
      actorName,
      action: 'listing_removed',
      summary: `${actorName} removed listing ${listingId}.`,
      note,
      listing_id: listingId,
      server_timestamp: FieldValue.serverTimestamp(),
    })
  })
})

export const setMemberStatus = onCall(async (request) => {
  const admin = await assertActiveAdmin(request.auth)
  const data = request.data as Record<string, unknown>
  const userId = readRequiredString(data.userId, 'userId', 180)
  const status = parseAccountStatus(data.status)
  const note = readRequiredString(data.note, 'note', 1000)
  if (userId === admin.uid && status === 'suspended') {
    throw new HttpsError('failed-precondition', "Administrators can't suspend their own account.")
  }

  const userRef = db.collection('users_profile').doc(userId)
  const actorName = actorNameFrom(admin.token)
  const at = new Date().toISOString()
  const action = status === 'suspended' ? 'member_suspended' : 'member_reinstated'
  const auditRef = db.collection('audit_log').doc()
  let user: FirebaseFirestore.DocumentData = {}
  await db.runTransaction(async (tx) => {
    const userSnap = await tx.get(userRef)
    if (!userSnap.exists) throw new HttpsError('not-found', 'Member not found.')
    user = userSnap.data()!
    if (user.role === 'admin' && status === 'suspended') {
      throw new HttpsError('failed-precondition', "Administrators can't be suspended from the member queue.")
    }

    if (user.status === status) return

    tx.update(userRef, { status, updated_at: FieldValue.serverTimestamp() })
    tx.create(auditRef, {
      at,
      actor_id: admin.uid,
      actorName,
      action,
      summary: `${status === 'suspended' ? 'Suspended' : 'Reinstated'} member ${userId}.`,
      note,
      subject_id: userId,
      server_timestamp: FieldValue.serverTimestamp(),
    })
  })

  if (status === 'suspended') {
    await revokeRefreshTokensAfterCommit(userId, 'setMemberStatus')
  }

  return {
    member: {
      userId,
      name: user.full_name || user.name || 'TIP Student',
      email: user.email || '',
      campus: user.campus === 'manila' ? 'manila' : user.campus === 'qc' ? 'qc' : null,
      program: user.department || user.program || '',
      year: user.year || '',
      role: user.role === 'admin' ? 'admin' : 'member',
      status,
      joinedAt: user.joinedAt || null,
      activeListings: 0,
      openReports: 0,
      rating: typeof user.average_rating === 'number' ? user.average_rating : undefined,
      reviews: typeof user.total_reviews === 'number' ? user.total_reviews : undefined,
    },
  }
})

export const saveMeetupSpots = onCall(async (request) => {
  const admin = await assertActiveAdmin(request.auth)
  const data = request.data as Record<string, unknown>
  const campus = parseCampus(data.campus)
  const spots = parseMeetupSpots(data.spots)
  const actorName = actorNameFrom(admin.token)
  const at = new Date().toISOString()
  const settingsRef = db.collection('settings').doc('campus_meetup_spots')
  const auditRef = db.collection('audit_log').doc()
  let allSpots: { qc: string[]; manila: string[] } = { qc: [], manila: [] }

  await db.runTransaction(async (tx) => {
    const settingsSnap = await tx.get(settingsRef)
    const current = settingsSnap.data() ?? {}
    const otherCampus = campus === 'qc' ? 'manila' : 'qc'
    const currentOther = readStoredMeetupSpots(current[otherCampus])
    allSpots = {
      qc: campus === 'qc' ? spots : currentOther,
      manila: campus === 'manila' ? spots : currentOther,
    }

    tx.set(settingsRef, { [campus]: spots, updated_at: FieldValue.serverTimestamp() }, { merge: true })
    tx.set(
      auditRef,
      {
        at,
        actor_id: admin.uid,
        actorName,
        action: 'spots_updated',
        summary: `Updated approved meetup spots for ${campus === 'qc' ? 'Quezon City' : 'Manila'}.`,
        campus,
        spots,
        server_timestamp: FieldValue.serverTimestamp(),
      },
      { merge: true },
    )
  })

  return { spots: allSpots }
})

export const {
  reserveListingMedia,
  finalizeListingMedia,
  deleteListingMedia,
} = createListingMediaCallables({ db, assertActiveMember })

export const cleanupListingMedia = createMediaCleanupWorker(db)
