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

      const report: Report = {
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
      saveReports([report, ...loadReports().filter((item) => item.id !== id)])
      return report
    },
  }
}
