import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  serverTimestamp,
} from 'firebase/firestore'
import { ADMIN_EMAILS, buildSeedAudit, buildSeedReports, campusLabel } from '../../data/seed'
import { ServiceError } from '../errors'
import { createId } from '../ids'
import type {
  AccountStatus,
  AdminService,
  AuditAction,
  AuditEntry,
  CampusId,
  MeetupSpots,
  MemberSummary,
  Report,
  ReportAction,
  Role,
} from '../types'
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './config'

const roleForEmail = (email: string): Role =>
  ADMIN_EMAILS.includes(email.toLowerCase()) ? 'admin' : 'member'

export function createFirebaseAdmin(): AdminService {
  const db = getFirebaseDb()
  const auth = getFirebaseAuth()

  const checkAdmin = () => {
    const user = auth.currentUser
    if (!user) {
      throw new ServiceError('unauthenticated', 'Sign in again to continue.')
    }
    const email = (user.email || '').toLowerCase()
    if (!ADMIN_EMAILS.includes(email)) {
      throw new ServiceError('forbidden', 'Only admins can do that.')
    }
    return user
  }

  const logAudit = async (action: AuditAction, summary: string, note?: string) => {
    const user = auth.currentUser
    const actorName = user?.displayName || user?.email || 'Admin Staff'
    const entry: AuditEntry = {
      id: createId('a'),
      at: new Date().toISOString(),
      action,
      actorName,
      summary,
      note,
    }

    if (isFirebaseConfigured()) {
      try {
        const auditDocRef = doc(db, 'audit_log', entry.id)
        await setDoc(auditDocRef, {
          ...entry,
          server_timestamp: serverTimestamp(),
        })
      } catch (err) {
        console.warn('[TIPalit Firebase Admin] Failed to log audit entry:', err)
      }
    }
  }

  return {
    async listReports(): Promise<Report[]> {
      checkAdmin()
      if (!isFirebaseConfigured()) {
        return buildSeedReports()
      }

      try {
        const reportsCol = collection(db, 'reports')
        const snapshot = await getDocs(reportsCol)
        const items: Report[] = []

        snapshot.forEach((d) => {
          const data = d.data()
          items.push({
            id: d.id,
            target: {
              kind: data.target_type || data.target?.kind || 'listing',
              id: data.target_id || data.target?.id || '',
              label: data.target?.label || 'Reported Item',
            },
            subjectId: data.subjectId || data.target_id || '',
            subjectName: data.subjectName || 'Student',
            campus: data.campus || 'qc',
            reason: data.reason || 'Other',
            details: data.details || '',
            reporterId: data.reporter_id || data.reporterId || '',
            reporterName: data.reporter_name || data.reporterName || 'Anonymous',
            createdAt: data.created_at || data.createdAt || new Date().toISOString(),
            status: data.status === 'resolved' || data.status === 'dismissed' ? data.status : 'open',
            resolution: data.resolution,
          })
        })

        if (items.length === 0) {
          return buildSeedReports()
        }

        return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      } catch (err) {
        console.warn('[TIPalit Firebase Admin] listReports error, fallback to seed:', err)
        return buildSeedReports()
      }
    },

    async resolveReport(id: string, action: ReportAction, note: string): Promise<Report> {
      const adminUser = checkAdmin()
      const adminName = adminUser.displayName || adminUser.email || 'Admin Staff'
      const nowIso = new Date().toISOString()

      let report: Report | null = null

      if (isFirebaseConfigured()) {
        try {
          const reportRef = doc(db, 'reports', id)
          const snap = await getDoc(reportRef)
          if (snap.exists()) {
            const data = snap.data()
            const targetKind = data.target_type || data.target?.kind
            const targetId = data.target_id || data.target?.id

            // Apply decision action
            // Rules reserve 'hidden' for server-side moderation, so an admin
            // takedown marks the listing 'removed' instead.
            if (action === 'remove_listing' && targetKind === 'listing') {
              const listingRef = doc(db, 'listings', targetId)
              await updateDoc(listingRef, { status: 'removed', updated_at: nowIso })
              await logAudit('listing_removed', `Removed listing "${data.target?.label}"`, note)
            } else if (action === 'suspend_member') {
              const memberId = data.subjectId || targetId
              const userRef = doc(db, 'users_profile', memberId)
              await updateDoc(userRef, { status: 'suspended', updated_at: nowIso })
              await logAudit('member_suspended', `Suspended member ${data.subjectName}`, note)
            } else if (action === 'dismiss') {
              await logAudit('report_dismissed', `Dismissed report #${id.slice(0, 6)}`, note)
            }

            const resolution = { action, note, byName: adminName, at: nowIso }
            const newStatus = action === 'dismiss' ? 'dismissed' : 'resolved'
            await updateDoc(reportRef, {
              status: newStatus,
              resolution,
              updated_at: serverTimestamp(),
            })

            report = {
              id,
              target: {
                kind: targetKind,
                id: targetId,
                label: data.target?.label || 'Item',
              },
              subjectId: data.subjectId || targetId,
              subjectName: data.subjectName || 'Student',
              campus: data.campus || 'qc',
              reason: data.reason || 'Other',
              details: data.details || '',
              reporterId: data.reporterId || '',
              reporterName: data.reporterName || 'Reporter',
              createdAt: data.createdAt || nowIso,
              status: newStatus,
              resolution,
            }
          }
        } catch (err) {
          console.error('[TIPalit Firebase Admin] resolveReport error:', err)
          throw new ServiceError('network', "Couldn't update report.")
        }
      }

      if (!report) {
        report = {
          id,
          target: { kind: 'listing', id: 'unknown', label: 'Item' },
          subjectId: 'unknown',
          subjectName: 'Student',
          campus: 'qc',
          reason: 'Other',
          details: '',
          reporterId: '',
          reporterName: 'Reporter',
          createdAt: nowIso,
          status: action === 'dismiss' ? 'dismissed' : 'resolved',
          resolution: { action, note, byName: adminName, at: nowIso },
        }
      }

      return report
    },

    async listMembers(): Promise<MemberSummary[]> {
      checkAdmin()
      if (!isFirebaseConfigured()) {
        return []
      }

      try {
        const usersCol = collection(db, 'users_profile')
        const snapshot = await getDocs(usersCol)
        const members: MemberSummary[] = []

        snapshot.forEach((d) => {
          const data = d.data()
          const email = data.email || ''
          members.push({
            userId: d.id,
            name: data.full_name || data.name || 'TIP Student',
            email,
            campus: data.campus || 'qc',
            program: data.department || data.program || 'Student',
            year: data.year || '1st Year',
            role: data.role || roleForEmail(email),
            status: data.status || 'active',
            joinedAt: data.joinedAt || null,
            activeListings: 0,
            openReports: 0,
          })
        })

        return members
      } catch (err) {
        console.warn('[TIPalit Firebase Admin] listMembers error:', err)
        return []
      }
    },

    async setMemberStatus(userId: string, status: AccountStatus, note: string): Promise<MemberSummary> {
      checkAdmin()
      if (isFirebaseConfigured()) {
        try {
          const userRef = doc(db, 'users_profile', userId)
          await updateDoc(userRef, {
            status,
            updated_at: serverTimestamp(),
          })
          const action: AuditAction = status === 'suspended' ? 'member_suspended' : 'member_reinstated'
          await logAudit(action, `${status === 'suspended' ? 'Suspended' : 'Reinstated'} member`, note)

          const snap = await getDoc(userRef)
          if (snap.exists()) {
            const data = snap.data()
            return {
              userId,
              name: data.full_name || data.name || 'TIP Student',
              email: data.email || '',
              campus: data.campus || 'qc',
              program: data.department || data.program || '',
              year: data.year || '',
              role: data.role || 'member',
              status,
              joinedAt: data.joinedAt || null,
              activeListings: 0,
              openReports: 0,
            }
          }
        } catch (err) {
          console.error('[TIPalit Firebase Admin] setMemberStatus error:', err)
          throw new ServiceError('network', "Couldn't update member status.")
        }
      }

      return {
        userId,
        name: 'TIP Student',
        email: '',
        campus: 'qc',
        program: '',
        year: '',
        role: 'member',
        status,
        joinedAt: null,
        activeListings: 0,
        openReports: 0,
      }
    },

    async saveMeetupSpots(campus: CampusId, spots: string[]): Promise<MeetupSpots> {
      checkAdmin()
      const spotsDocRef = doc(db, 'settings', 'meetup_spots')

      try {
        await setDoc(spotsDocRef, { [campus]: spots }, { merge: true })
        await logAudit('spots_updated', `Updated approved meetup spots for ${campusLabel(campus)}`)
        const snap = await getDoc(spotsDocRef)
        const data = snap.data() || {}
        return {
          qc: data.qc || [],
          manila: data.manila || [],
        }
      } catch (err) {
        console.error('[TIPalit Firebase Admin] saveMeetupSpots error:', err)
        throw new ServiceError('network', "Couldn't save meetup spots.")
      }
    },

    async listAudit(): Promise<AuditEntry[]> {
      checkAdmin()
      if (!isFirebaseConfigured()) {
        return buildSeedAudit()
      }

      try {
        const auditCol = collection(db, 'audit_log')
        const snapshot = await getDocs(auditCol)
        const entries: AuditEntry[] = []

        snapshot.forEach((d) => {
          const data = d.data()
          entries.push({
            id: d.id,
            at: data.at || new Date().toISOString(),
            action: data.action,
            actorName: data.actorName || 'Admin',
            summary: data.summary || '',
            note: data.note,
          })
        })

        if (entries.length === 0) {
          return buildSeedAudit()
        }

        return entries.sort((a, b) => b.at.localeCompare(a.at))
      } catch (err) {
        console.warn('[TIPalit Firebase Admin] listAudit error, fallback to seed:', err)
        return buildSeedAudit()
      }
    },
  }
}
