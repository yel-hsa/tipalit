import { collection, getDocs } from 'firebase/firestore'
import { ADMIN_EMAILS } from '../seed'
import { ServiceError } from '../errors'
import { callResolveReport, callSaveMeetupSpots, callSetMemberStatus } from './admin-callables'
import { toListing } from './listings'
import type {
  AccountStatus,
  AdminService,
  AuditEntry,
  CampusId,
  Listing,
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

  const checkAdmin = async () => {
    const user = auth.currentUser
    if (!user) {
      throw new ServiceError('unauthenticated', 'Sign in again to continue.')
    }
    const token = await user.getIdTokenResult()
    if (token.claims.admin !== true) {
      throw new ServiceError('forbidden', 'Only active administrators can do that.')
    }
    return user
  }

  return {
    async listReports(): Promise<Report[]> {
      await checkAdmin()
      if (!isFirebaseConfigured()) {
        return []
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
            subjectId: data.subjectId || data.subject_id || data.target_id || '',
            subjectName: data.subjectName || data.subject_name || 'Student',
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

        return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      } catch (err) {
        console.warn('[TIPalit Firebase Admin] listReports error:', err)
        throw new ServiceError('network', "Couldn't load reports.")
      }
    },

    async resolveReport(id: string, action: ReportAction, note: string): Promise<Report> {
      await checkAdmin()
      if (!isFirebaseConfigured()) {
        throw new ServiceError('network', 'Firebase is not configured.')
      }
      return callResolveReport(id, action, note)
    },

    async listMembers(): Promise<MemberSummary[]> {
      await checkAdmin()
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
        throw new ServiceError('network', "Couldn't load members.")
      }
    },

    async listListings(): Promise<Listing[]> {
      await checkAdmin()
      if (!isFirebaseConfigured()) {
        return []
      }

      try {
        const snapshot = await getDocs(collection(db, 'listings'))
        const items: Listing[] = []
        snapshot.forEach((d) => items.push(toListing(d.id, d.data())))
        return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      } catch (err) {
        console.warn('[TIPalit Firebase Admin] listListings error:', err)
        throw new ServiceError('network', "Couldn't load listings.")
      }
    },

    async setMemberStatus(userId: string, status: AccountStatus, note: string): Promise<MemberSummary> {
      await checkAdmin()
      if (!isFirebaseConfigured()) {
        throw new ServiceError('network', 'Firebase is not configured.')
      }
      return callSetMemberStatus(userId, status, note)
    },

    async saveMeetupSpots(campus: CampusId, spots: string[]): Promise<MeetupSpots> {
      await checkAdmin()
      if (!isFirebaseConfigured()) {
        throw new ServiceError('network', 'Firebase is not configured.')
      }
      return callSaveMeetupSpots(campus, spots)
    },

    async listAudit(): Promise<AuditEntry[]> {
      await checkAdmin()
      if (!isFirebaseConfigured()) {
        return []
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

        return entries.sort((a, b) => b.at.localeCompare(a.at))
      } catch (err) {
        console.warn('[TIPalit Firebase Admin] listAudit error:', err)
        throw new ServiceError('network', "Couldn't load the audit log.")
      }
    },
  }
}
