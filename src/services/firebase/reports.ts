import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore'
import { ServiceError } from '../errors'
import type { Report, ReportInput, ReportService } from '../types'
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './config'

export function createFirebaseReports(): ReportService {
  const db = getFirebaseDb()
  const auth = getFirebaseAuth()

  return {
    async submit(input: ReportInput): Promise<Report> {
      const currentUser = auth.currentUser
      if (!currentUser) {
        throw new ServiceError('unauthenticated', 'Sign in again to send a report.')
      }

      const reporterId = currentUser.uid
      const reporterName = currentUser.displayName || currentUser.email || 'TIP Student'
      let subjectLabel = 'Reported Item'
      let subjectId = input.target.id
      let subjectName = 'Student'
      let campus: 'qc' | 'manila' = 'qc'

      if (isFirebaseConfigured()) {
        try {
          if (input.target.kind === 'listing') {
            const listingSnap = await getDoc(doc(db, 'listings', input.target.id))
            if (listingSnap.exists()) {
              const lData = listingSnap.data()
              subjectLabel = lData.title || subjectLabel
              subjectId = lData.seller_id || lData.sellerId || subjectId
              campus = lData.campus === 'manila' ? 'manila' : 'qc'
              // report_count increments and auto-hide are server-side: the
              // listings update rule reserves report_count for the Cloud
              // Function, so a client write would be rejected.
            }
          } else {
            const userSnap = await getDoc(doc(db, 'users_profile', input.target.id))
            if (userSnap.exists()) {
              const uData = userSnap.data()
              subjectName = uData.full_name || uData.name || subjectName
              subjectLabel = subjectName
              campus = uData.campus === 'manila' ? 'manila' : 'qc'
            }
          }

          // Save report document into Firestore 'reports' collection per PRD Section 5.1 Collection 6.
          // The create rule requires a reporter-owned doc with status 'open'.
          const reportDocRef = doc(db, 'reports', input.id)
          const nowIso = new Date().toISOString()
          await setDoc(reportDocRef, {
            id: input.id,
            target_type: input.target.kind,
            target_id: input.target.id,
            target: {
              kind: input.target.kind,
              id: input.target.id,
              label: subjectLabel,
            },
            reporter_id: reporterId,
            reporterId,
            reporter_name: reporterName,
            reporterName,
            subjectId,
            subjectName,
            campus,
            reason: input.reason,
            details: input.details || '',
            status: 'open',
            created_at: nowIso,
            server_timestamp: serverTimestamp(),
          })
        } catch (err) {
          console.error('[TIPalit Firebase Reports] Submit error:', err)
          throw new ServiceError('network', "Couldn't send report. Check your connection.")
        }
      }

      return {
        id: input.id,
        target: { kind: input.target.kind, id: input.target.id, label: subjectLabel },
        subjectId,
        subjectName,
        campus,
        reason: input.reason,
        details: input.details,
        reporterId,
        reporterName,
        createdAt: new Date().toISOString(),
        status: 'open',
      }
    },
  }
}
