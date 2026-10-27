import { Avatar, Badge, InputField, Tabs } from '@figma/astraui'
import { ChevronRight, History, Package, Search, ShieldCheck, UserRound, UserSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { AUDIT_ICON, KIND_LABEL, reportBadge } from '../components/admin/adminLabels'
import MeetupSpotsEditor from '../components/admin/MeetupSpotsEditor'
import MemberSheet from '../components/admin/MemberSheet'
import ReportReviewSheet from '../components/admin/ReportReviewSheet'
import EmptyState from '../components/EmptyState'
import FilterPills from '../components/FilterPills'
import LoadError from '../components/LoadError'
import Pressable from '../components/Pressable'
import ScreenHeader from '../components/ScreenHeader'
import Skeleton, { ChatRowSkeleton } from '../components/Skeleton'
import { campusLabel, timeAgo } from '@tipalit/services/seed'
import { initialsOf } from '@tipalit/services/profile'
import type {
  AccountStatus,
  AnalyticsOverview,
  AuditEntry,
  CampusId,
  MeetupSpots,
  MemberSummary,
  Report,
  ReportAction,
} from '@tipalit/services/types'

export type AdminTab = 'reports' | 'members' | 'spots' | 'log'

type AdminScreenProps = {
  reports: Report[]
  members: MemberSummary[]
  audit: AuditEntry[]
  spots: MeetupSpots
  // undefined while loading
  overview?: AnalyticsOverview
  loading: boolean
  error: boolean
  onRetry: () => void
  initialTab: AdminTab
  onTabChange: (tab: AdminTab) => void
  listingAvailable: (listingId: string) => boolean
  onResolveReport: (reportId: string, action: ReportAction, note: string) => Promise<boolean>
  onSetMemberStatus: (userId: string, status: AccountStatus, note: string) => Promise<boolean>
  onSaveSpots: (campus: CampusId, spots: string[]) => Promise<boolean>
  onViewListing: (listingId: string) => void
}

type ReportFilter = 'open' | 'closed'
type MemberFilter = 'all' | 'flagged' | 'suspended'

function Stat({
  value,
  label,
  highlight,
}: {
  value: number | string
  label: string
  highlight?: boolean
}) {
  return (
    <div
      className={`group relative flex flex-col items-center justify-center gap-1 rounded-2xl p-4 text-center border transition-all duration-200 hover:-translate-y-0.5 hover:shadow-xs cursor-default ${
        highlight
          ? 'bg-accent-soft/90 border-accent/40 shadow-xs'
          : 'bg-surface-bg border-border-secondary/80 hover:border-border-primary/60'
      }`}
    >
      <span
        className={`text-2xl font-bold tracking-tight font-sans ${
          highlight ? 'text-brand-dark' : 'text-text-primary'
        }`}
      >
        {value}
      </span>
      <span className={`text-xs font-medium ${highlight ? 'text-brand-secondary' : 'text-text-secondary'}`}>
        {label}
      </span>
    </div>
  )
}

function AdminSkeleton() {
  return (
    <div role="status" aria-label="Loading admin data" className="flex flex-col gap-xl">
      <div className="grid grid-cols-3 gap-md">
        {[0, 1, 2].map((key) => (
          <Skeleton key={key} className="h-20 rounded-corner-lg" />
        ))}
      </div>
      <Skeleton className="h-10 w-full" />
      <div className="overflow-hidden rounded-corner-lg bg-surface-bg">
        {[0, 1, 2].map((key) => (
          <ChatRowSkeleton key={key} />
        ))}
      </div>
    </div>
  )
}

export default function AdminScreen({
  reports,
  members,
  audit,
  spots,
  overview,
  loading,
  error,
  onRetry,
  initialTab,
  onTabChange,
  listingAvailable,
  onResolveReport,
  onSetMemberStatus,
  onSaveSpots,
  onViewListing,
}: AdminScreenProps) {
  const [reportFilter, setReportFilter] = useState<ReportFilter>('open')
  const [memberQuery, setMemberQuery] = useState('')
  const [memberFilter, setMemberFilter] = useState<MemberFilter>('all')
  const [spotsCampus, setSpotsCampus] = useState<CampusId>('qc')
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null)
  const [selectedMemberId, setSelectedMemberId] = useState<string | null>(null)

  const openReports = reports.filter((report) => report.status === 'open')
  const closedReports = reports.filter((report) => report.status !== 'open')
  const flagged = members.filter((member) => member.openReports > 0)
  const suspended = members.filter((member) => member.status === 'suspended')
  const memberById = (id: string) => members.find((member) => member.userId === id)

  const visibleMembers = useMemo(() => {
    const q = memberQuery.trim().toLowerCase()
    const pool = memberFilter === 'flagged' ? flagged : memberFilter === 'suspended' ? suspended : members
    return q ? pool.filter((member) => `${member.name} ${member.email}`.toLowerCase().includes(q)) : pool
  }, [members, flagged, suspended, memberFilter, memberQuery])

  const selectedReport = selectedReportId ? reports.find((report) => report.id === selectedReportId) : undefined
  const selectedMember = selectedMemberId ? memberById(selectedMemberId) : undefined

  const reportList = reportFilter === 'open' ? openReports : closedReports

  const reportsTab = (
    <div className="flex flex-col gap-lg">
      <FilterPills
        label="Report status"
        options={[
          { id: 'open', label: `Open (${openReports.length})` },
          { id: 'closed', label: `Closed (${closedReports.length})` },
        ]}
        active={reportFilter}
        onChange={setReportFilter}
      />
      {reportList.length === 0 ? (
        <EmptyState
          icon={ShieldCheck}
          title={reportFilter === 'open' ? 'No open reports' : 'No closed reports yet'}
          body={
            reportFilter === 'open'
              ? 'You\u2019re all caught up. New reports from members show up here.'
              : 'Reports you resolve or dismiss are kept here.'
          }
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border-secondary/80 bg-surface-bg shadow-xs divide-y divide-border-secondary">
          {reportList.map((report) => {
            const badge = reportBadge(report)
            const open = report.status === 'open'
            return (
              <li key={report.id}>
                <Pressable
                  onPress={() => setSelectedReportId(report.id)}
                  aria-label={`${KIND_LABEL[report.target.kind]} report: ${report.target.label}. ${report.reason}. ${badge.label}.`}
                  className="group flex items-center gap-lg p-lg hover:bg-surface-hover/80 active:bg-surface-hover transition-colors duration-150"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-10 shrink-0 items-center justify-center rounded-full transition-transform duration-150 group-hover:scale-105 ${
                      open ? 'bg-danger-soft text-danger ring-1 ring-danger/20' : 'bg-bg-subtle text-text-secondary'
                    }`}
                  >
                    {report.target.kind === 'listing' ? <Package size={20} /> : <UserRound size={20} />}
                  </span>
                  <div className="flex min-w-0 flex-1 flex-col gap-xs">
                    <p className="truncate text-label-sm font-semibold text-text-primary">{report.target.label}</p>
                    <p className="truncate text-caption-sm text-text-secondary">{report.reason}</p>
                    <div className="flex flex-wrap items-center gap-sm">
                      <Badge variant={badge.variant} label={badge.label} />
                      <span className="text-caption-sm text-text-tertiary">
                        {campusLabel(report.campus)} &middot; {timeAgo(report.createdAt)}
                      </span>
                    </div>
                  </div>
                  <ChevronRight size={16} className="shrink-0 text-text-secondary transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
                </Pressable>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )

  const membersTab = (
    <div className="flex flex-col gap-lg">
      <InputField
        type="search"
        aria-label="Search members"
        placeholder="Search by name or email"
        prefix={<Search size={16} />}
        value={memberQuery}
        onChange={setMemberQuery}
      />
      <FilterPills
        label="Member filter"
        options={[
          { id: 'all', label: `All (${members.length})` },
          { id: 'flagged', label: `Flagged (${flagged.length})` },
          { id: 'suspended', label: `Suspended (${suspended.length})` },
        ]}
        active={memberFilter}
        onChange={setMemberFilter}
      />
      {visibleMembers.length === 0 ? (
        <EmptyState
          icon={UserSearch}
          title="No members match"
          body={memberQuery.trim() ? 'Try another name or email.' : 'Nobody is in this group right now.'}
        />
      ) : (
        <ul className="overflow-hidden rounded-2xl border border-border-secondary/80 bg-surface-bg shadow-xs divide-y divide-border-secondary" aria-live="polite">
          {visibleMembers.map((member) => (
            <li key={member.userId}>
              <Pressable
                onPress={() => setSelectedMemberId(member.userId)}
                aria-label={`${member.name}, ${member.status === 'suspended' ? 'suspended' : 'active'}${
                  member.openReports ? `, ${member.openReports} open reports` : ''
                }`}
                className="group flex items-center gap-lg p-lg hover:bg-surface-hover/80 active:bg-surface-hover transition-colors duration-150"
              >
                <div className="transition-transform duration-150 group-hover:scale-105">
                  <Avatar type="initial" initials={initialsOf(member.name)} size="large" />
                </div>
                <div className="flex min-w-0 flex-1 flex-col gap-xs">
                  <div className="flex flex-wrap items-center gap-sm">
                    <p className="truncate text-label-sm font-semibold text-text-primary">{member.name}</p>
                    {member.role === 'admin' && <Badge variant="secondary" label="Admin" />}
                    {member.status === 'suspended' && <Badge variant="danger" label="Suspended" />}
                    {member.openReports > 0 && (
                      <Badge variant="warning" label={`${member.openReports} ${member.openReports === 1 ? 'report' : 'reports'}`} />
                    )}
                  </div>
                  <p className="truncate text-caption-sm text-text-secondary">{member.email}</p>
                  <p className="truncate text-caption-sm text-text-tertiary">
                    {member.campus ? campusLabel(member.campus) : 'No campus yet'} &middot; {member.program || 'Setup not finished'}
                  </p>
                </div>
                <ChevronRight size={16} className="shrink-0 text-text-secondary transition-transform duration-150 group-hover:translate-x-0.5" aria-hidden="true" />
              </Pressable>
            </li>
          ))}
        </ul>
      )}
    </div>
  )

  const logTab =
    audit.length === 0 ? (
      <EmptyState icon={History} title="No admin actions yet" body="Every decision, suspension, and settings change is recorded here." />
    ) : (
      <ul className="overflow-hidden rounded-2xl border border-border-secondary/80 bg-surface-bg shadow-xs divide-y divide-border-secondary">
        {audit.map((entry) => {
          const Icon = AUDIT_ICON[entry.action] ?? History
          return (
            <li key={entry.id} className="flex items-start gap-md p-lg hover:bg-surface-hover/50 transition-colors duration-150">
              <span
                aria-hidden="true"
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-bg-subtle text-text-primary ring-1 ring-border-secondary/60"
              >
                <Icon size={16} />
              </span>
              <div className="flex min-w-0 flex-1 flex-col gap-xs">
                <p className="text-label-sm font-semibold text-text-primary">{entry.summary}</p>
                <p className="text-caption-sm text-text-secondary">
                  {entry.actorName} &middot; {timeAgo(entry.at)}
                </p>
                {entry.note && (
                  <p className="text-label-sm text-text-secondary rounded-lg bg-bg-subtle/80 px-2.5 py-1.5 mt-0.5 border border-border-secondary/40 italic">
                    &ldquo;{entry.note}&rdquo;
                  </p>
                )}
              </div>
            </li>
          )
        })}
      </ul>
    )

  const related = (report: Report) => ({
    sameListing: openReports.filter(
      (other) => other.id !== report.id && other.target.kind === 'listing' && other.target.id === report.target.id,
    ).length,
    sameMember: openReports.filter((other) => other.id !== report.id && other.subjectId === report.subjectId).length,
  })

  return (
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Admin" subtitle={'Office of Student Affairs \u00b7 Both campuses'} />

      <div className="flex flex-col gap-xl px-xl pb-xl">
        {loading ? (
          <AdminSkeleton />
        ) : error ? (
          <LoadError what="admin data" onRetry={onRetry} />
        ) : (
          <>
            <section aria-label="Overview" className="grid grid-cols-3 gap-md">
              <Stat value={openReports.length} label="Open reports" highlight={openReports.length > 0} />
              <Stat value={flagged.length} label="Flagged members" />
              <Stat value={suspended.length} label="Suspended" />
            </section>

            {overview && (
              <section aria-labelledby="market-title" className="flex flex-col gap-sm">
                <div className="flex items-center justify-between px-0.5">
                  <p id="market-title" role="heading" aria-level={2} className="text-xs font-semibold tracking-wider uppercase text-text-tertiary">
                    Marketplace health
                  </p>
                  <span className="text-xs text-text-tertiary">Live stats</span>
                </div>
                <div className="grid grid-cols-3 gap-md">
                  <Stat value={overview.members} label="Members" />
                  <Stat value={overview.activeListings} label="Active items" />
                  <Stat value={overview.completedExchanges} label="Exchanges" />
                </div>
                <div className="grid grid-cols-2 gap-md">
                  <Stat
                    value={overview.averageRating > 0 ? `${overview.averageRating.toFixed(1)} ★` : '—'}
                    label="Avg. rating"
                  />
                  <Stat value={overview.openReports} label="Open reports (all)" highlight={overview.openReports > 0} />
                </div>
              </section>
            )}

            <Tabs
              defaultTab={initialTab}
              onChange={(id) => onTabChange(id as AdminTab)}
              tabs={[
                { id: 'reports', label: 'Reports', content: reportsTab },
                { id: 'members', label: 'Members', content: membersTab },
                {
                  id: 'spots',
                  label: 'Spots',
                  content: (
                    <MeetupSpotsEditor spots={spots} campus={spotsCampus} onCampusChange={setSpotsCampus} onSave={onSaveSpots} />
                  ),
                },
                { id: 'log', label: 'Log', content: logTab },
              ]}
            />
          </>
        )}
      </div>

      {selectedReport && (
        <ReportReviewSheet
          key={selectedReport.id}
          report={selectedReport}
          subject={memberById(selectedReport.subjectId)}
          listingAvailable={selectedReport.target.kind === 'listing' && listingAvailable(selectedReport.target.id)}
          related={related(selectedReport)}
          onClose={() => setSelectedReportId(null)}
          onResolve={async (action, note) => {
            const done = await onResolveReport(selectedReport.id, action, note)
            if (done) setSelectedReportId(null)
            return done
          }}
          onViewListing={() => {
            setSelectedReportId(null)
            onViewListing(selectedReport.target.id)
          }}
          onViewMember={
            memberById(selectedReport.subjectId)
              ? () => {
                  setSelectedReportId(null)
                  setSelectedMemberId(selectedReport.subjectId)
                }
              : undefined
          }
        />
      )}

      {selectedMember && (
        <MemberSheet
          key={selectedMember.userId}
          member={selectedMember}
          openReports={openReports.filter((report) => report.subjectId === selectedMember.userId)}
          onClose={() => setSelectedMemberId(null)}
          onSetStatus={(status, note) => onSetMemberStatus(selectedMember.userId, status, note)}
          onOpenReport={(reportId) => {
            setSelectedMemberId(null)
            setSelectedReportId(reportId)
          }}
        />
      )}
    </div>
  )
}
