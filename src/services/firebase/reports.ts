import { doc, getDoc, setDoc, updateDoc, serverTimestamp } from 'firebase/firestore'
import { ServiceError } from '../errors'
import type { Report, ReportInput, ReportService } from '../types'
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './config'

// one doc per reporter per target, so a repeat is an update not a duplicate
const hashId = (input: string): string => {
  let a = 0x811c9dc5
  let b = 0x01000193
  for (let i = 0; i < input.length; i += 1) {
    const code = input.charCodeAt(i)
    a ^= code
    a = Math.imul(a, 0x01000193) >>> 0
    b = (b + code) >>> 0
    b = Math.imul(b, 0x85ebca6b) >>> 0
    b ^= b >>> 13
  }
  return `${a.toString(36)}${b.toString(36)}`
}

// doc ids may not contain '/', so the parts are hashed rather than concatenated
export const reportDocId = (reporterId: string, kind: string, targetId: string) =>
  `r-${hashId(`${reporterId}|${kind}|${targetId}`)}`

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

      // caller pre-generates an id for optimistic UI; live docs use the deterministic id
      const draftId = input.id

      if (!isFirebaseConfigured()) {
        return {
          id: draftId,
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
      }

      try {
        if (input.target.kind === 'listing') {
          const listingSnap = await getDoc(doc(db, 'listings', input.target.id))
          if (listingSnap.exists()) {
            const lData = listingSnap.data()
            subjectLabel = lData.title || subjectLabel
            subjectId = lData.seller_id || lData.sellerId || subjectId
            campus = lData.campus === 'manila' ? 'manila' : 'qc'
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

        const id = reportDocId(reporterId, input.target.kind, input.target.id)
        const reportDocRef = doc(db, 'reports', id)
        const existing = await getDoc(reportDocRef)

        // re-opening an open report would bump it in the admin queue
        if (existing.exists() && existing.data().status === 'open') {
          const data = existing.data()
          return {
            id,
            target: { kind: input.target.kind, id: input.target.id, label: data.target?.label || subjectLabel },
            subjectId: data.subjectId || subjectId,
            subjectName: data.subjectName || subjectName,
            campus: (data.campus === 'manila' ? 'manila' : 'qc') as 'qc' | 'manila',
            reason: data.reason || input.reason,
            details: data.details || '',
            reporterId,
            reporterName: data.reporter_name || data.reporterName || reporterName,
            createdAt: data.created_at || data.createdAt || new Date().toISOString(),
            status: 'open',
          }
        }

        const nowIso = new Date().toISOString()

        // a closed report is re-opened with the new evidence, never duplicated
        if (existing.exists()) {
          const previous = existing.data()
          await updateDoc(reportDocRef, {
            reason: input.reason,
            details: input.details || '',
            status: 'open',
            resolution: null,
            recreated_at: nowIso,
            updated_at: serverTimestamp(),
          })
          return {
            id,
            target: { kind: input.target.kind, id: input.target.id, label: previous.target?.label || subjectLabel },
            subjectId: previous.subjectId || subjectId,
            subjectName: previous.subjectName || subjectName,
            campus: (previous.campus === 'manila' ? 'manila' : 'qc') as 'qc' | 'manila',
            reason: input.reason,
            details: input.details || '',
            reporterId,
            reporterName: previous.reporter_name || previous.reporterName || reporterName,
            createdAt: previous.created_at || previous.createdAt || nowIso,
            status: 'open',
          }
        }

        // rules pin reporter_id to the caller; report_count is server-only
        await setDoc(reportDocRef, {
          id,
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

        return {
          id,
          target: { kind: input.target.kind, id: input.target.id, label: subjectLabel },
          subjectId,
          subjectName,
          campus,
          reason: input.reason,
          details: input.details,
          reporterId,
          reporterName,
          createdAt: nowIso,
          status: 'open',
        }
      } catch (err) {
        console.error('[TIPalit Firebase Reports] Submit error:', err)
        if (err instanceof ServiceError) throw err
        throw new ServiceError('network', "Couldn't send report. Check your connection.")
      }
    },
  }
}
