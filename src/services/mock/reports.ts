import { buildSeedReports } from '../../data/seed'
import { ServiceError } from '../errors'
import type { Report, ReportService } from '../types'
import { readSession } from './auth'
import { findPerson } from './directory'
import { delay } from './latency'
import { loadListings } from './listings'
import { hasShape, isArrayOf, read, write } from './storage'

const isReports = isArrayOf(
  hasShape<Report>({ id: 'string', reason: 'string', status: 'string', createdAt: 'string', target: 'object' }),
)

export const loadReports = () => read<Report[]>('reports', () => buildSeedReports(), isReports)
export const saveReports = (reports: Report[]) => write('reports', reports)

export function createMockReports(): ReportService {
  return {
    async submit({ id, target, reason, details }) {
      await delay()
      const session = readSession()
      if (!session) throw new ServiceError('unauthenticated', 'Sign in again to send a report.')
      const reporterName = findPerson(session.userId)?.name ?? session.name

      let subject: { label: string; subjectId: string; subjectName: string; campus: Report['campus'] }
      if (target.kind === 'listing') {
        const listing = loadListings().find((item) => item.id === target.id)
        if (!listing) throw new ServiceError('not_found', 'This listing no longer exists.')
        const seller = findPerson(listing.sellerId)
        subject = {
          label: listing.title,
          subjectId: listing.sellerId,
          subjectName: seller?.name ?? 'TIP Student',
          campus: listing.campus,
        }
      } else {
        const person = findPerson(target.id)
        if (!person) throw new ServiceError('not_found', "We couldn't find that member.")
        subject = { label: person.name, subjectId: person.userId, subjectName: person.name, campus: person.campus ?? 'qc' }
      }

      // Dedupe parity with the Firebase adapter (deterministic reporter+target
      // id): a repeat while the report is open is a no-op; a repeat after it
      // was closed re-opens the same report instead of filing a duplicate.
      const reports = loadReports()
      const existing = reports.find(
        (item) => item.reporterId === session.userId && item.target.kind === target.kind && item.target.id === target.id,
      )
      if (existing && existing.status === 'open') return existing

      const report: Report = existing
        ? { ...existing, reason, details, status: 'open', resolution: undefined }
        : {
            id,
            target: { kind: target.kind, id: target.id, label: subject.label },
            subjectId: subject.subjectId,
            subjectName: subject.subjectName,
            campus: subject.campus,
            reason,
            details,
            reporterId: session.userId,
            reporterName,
            createdAt: new Date().toISOString(),
            status: 'open',
          }
      saveReports([report, ...reports.filter((item) => item.id !== report.id)])
      return report
    },
  }
}
