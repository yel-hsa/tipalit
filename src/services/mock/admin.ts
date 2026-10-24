import { buildSeedAudit, campusLabel } from '../../data/seed'
import { ServiceError } from '../errors'
import { createId } from '../ids'
import type { AdminService, AuditEntry, MemberSummary, Report } from '../types'
import { loadStatuses, requireAdmin, roleForEmail, writeStatus } from './accounts'
import { readSession } from './auth'
import { consumeOnce } from './controls'
import { findPerson, listPeople, type Person } from './directory'
import { delay } from './latency'
import { loadListings, saveListings } from './listings'
import { loadReports, saveReports } from './reports'
import { loadSpots, saveSpots } from './settings'
import { hasShape, isArrayOf, read, write } from './storage'

const isAudit = isArrayOf(hasShape<AuditEntry>({ id: 'string', at: 'string', action: 'string', summary: 'string' }))
const loadAudit = () => read<AuditEntry[]>('audit', () => buildSeedAudit(), isAudit)

const log = (entry: Omit<AuditEntry, 'id' | 'at'>) => {
  const record: AuditEntry = { id: createId('a'), at: new Date().toISOString(), ...entry }
  if (!record.note) delete record.note
  write('audit', [record, ...loadAudit()])
}

const admin = () => requireAdmin(readSession())

const failLoad = () => {
  if (consumeOnce('failNextLoad')) throw new ServiceError('network', "Couldn't load admin data.")
}

const summarize = (person: Person): MemberSummary => {
  const statuses = loadStatuses()
  return {
    ...person,
    role: roleForEmail(person.email),
    status: statuses[person.userId] ?? 'active',
    activeListings: loadListings().filter((listing) => listing.sellerId === person.userId && listing.status === 'active')
      .length,
    openReports: loadReports().filter((report) => report.subjectId === person.userId && report.status === 'open').length,
  }
}

const quoted = (report: Report) =>
  report.target.kind === 'listing' ? `\u201c${report.target.label}\u201d` : report.target.label

/**
 * Which other open reports the same decision settles: every open report on
 * the same target, for every action (parity with the Firebase adapter, which
 * cascades on target id). A dismissal cascades as a dismissal.
 */
const settles = (report: Report) => (other: Report) =>
  other.id !== report.id &&
  other.status === 'open' &&
  other.target.kind === report.target.kind &&
  other.target.id === report.target.id

export function createMockAdmin(): AdminService {
  return {
    async listReports() {
      admin()
      await delay()
      failLoad()
      return [...loadReports()].sort((a, b) => b.createdAt.localeCompare(a.createdAt))
    },

    async resolveReport(id, action, note) {
      const actor = admin()
      await delay(700)
      const reports = loadReports()
      const report = reports.find((item) => item.id === id)
      if (!report) throw new ServiceError('not_found', 'This report no longer exists.')
      if (report.status !== 'open') return report

      if (action === 'remove_listing') {
        if (report.target.kind !== 'listing') throw new ServiceError('invalid', 'Only listing reports can remove a listing.')
        saveListings(loadListings().filter((listing) => listing.id !== report.target.id))
        log({ action: 'listing_removed', actorName: actor.name, summary: `Removed ${quoted(report)} by ${report.subjectName}`, note })
      } else if (action === 'suspend_member') {
        const subject = findPerson(report.subjectId)
        if (subject && roleForEmail(subject.email) === 'admin') throw new ServiceError('forbidden', "Admins can't be suspended.")
        writeStatus(report.subjectId, 'suspended')
        log({ action: 'member_suspended', actorName: actor.name, summary: `Suspended ${report.subjectName}`, note: note || report.reason })
      } else {
        log({ action: 'report_dismissed', actorName: actor.name, summary: `Dismissed a report on ${quoted(report)}`, note })
      }

      const resolution = { action, note, byName: actor.name, at: new Date().toISOString() }
      const status: Report['status'] = action === 'dismiss' ? 'dismissed' : 'resolved'
      const isSettled = settles(report)
      const next = reports.map((item) =>
        item.id === id || isSettled(item) ? { ...item, status, resolution } : item,
      )
      saveReports(next)
      return next.find((item) => item.id === id) as Report
    },

    async listMembers() {
      admin()
      await delay(400)
      return listPeople()
        .map(summarize)
        .sort((a, b) => b.openReports - a.openReports || a.name.localeCompare(b.name))
    },

    async setMemberStatus(userId, status, note) {
      const actor = admin()
      await delay(600)
      const person = findPerson(userId)
      if (!person) throw new ServiceError('not_found', "We couldn't find that member.")
      if (roleForEmail(person.email) === 'admin') throw new ServiceError('forbidden', "Admins can't be suspended.")
      writeStatus(userId, status)
      log({
        action: status === 'suspended' ? 'member_suspended' : 'member_reinstated',
        actorName: actor.name,
        summary: `${status === 'suspended' ? 'Suspended' : 'Reinstated'} ${person.name}`,
        note,
      })
      return summarize(person)
    },

    async saveMeetupSpots(campus, spots) {
      const actor = admin()
      await delay(500)
      const cleaned = [...new Set(spots.map((spot) => spot.trim()).filter(Boolean))]
      if (cleaned.length === 0) throw new ServiceError('invalid', 'Each campus needs at least one meetup spot.')
      const previous = loadSpots()
      const next = { ...previous, [campus]: cleaned }
      saveSpots(next)
      const added = cleaned.filter((spot) => !previous[campus].includes(spot))
      const removed = previous[campus].filter((spot) => !cleaned.includes(spot))
      const change = [
        added.length ? `added ${added.join(', ')}` : '',
        removed.length ? `removed ${removed.join(', ')}` : '',
      ]
        .filter(Boolean)
        .join('; ')
      log({ action: 'spots_updated', actorName: actor.name, summary: `${campusLabel(campus)} spots: ${change || 'reordered'}` })
      return next
    },

    async listAudit() {
      admin()
      await delay(300)
      return loadAudit()
    },
  }
}
