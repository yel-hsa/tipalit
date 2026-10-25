import { Button } from '@figma/astraui'
import { Check, Package, ShieldCheck, UserRound, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import { campusLabel, timeAgo } from '@tipalit/services/seed'
import type { Listing, MemberSummary, Report, ReportAction } from '@tipalit/services/types'
import { KIND_LABEL, reportBadge } from '../components/admin/adminLabels'
import DataTable, { type Column } from '../components/admin/DataTable'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import Toolbar from '../components/admin/Toolbar'
import Badge from '../components/Badge'

type ReportsSectionProps = {
  reports: Report[]
  members: MemberSummary[]
  listingsById: Record<string, Listing>
  onOpen: (reportId: string) => void
  onQuickAction: (reportId: string, action: ReportAction) => Promise<boolean>
}

type StatusFilter = 'open' | 'closed' | 'all'
type KindFilter = 'all' | 'listing' | 'user'
type CampusFilter = 'all' | 'manila' | 'qc'

const STATUS_OPTIONS = [
  { value: 'open', label: 'Open' },
  { value: 'closed', label: 'Closed' },
  { value: 'all', label: 'All statuses' },
]

const KIND_OPTIONS = [
  { value: 'all', label: 'All targets' },
  { value: 'listing', label: 'Listings' },
  { value: 'user', label: 'Members' },
]

const CAMPUS_OPTIONS = [
  { value: 'all', label: 'Both campuses' },
  { value: 'manila', label: 'TIP Manila' },
  { value: 'qc', label: 'TIP Quezon City' },
]

export default function ReportsSection({
  reports,
  members,
  listingsById,
  onOpen,
  onQuickAction,
}: ReportsSectionProps) {
  const [status, setStatus] = useState<StatusFilter>('open')
  const [kind, setKind] = useState<KindFilter>('all')
  const [campus, setCampus] = useState<CampusFilter>('all')
  const [query, setQuery] = useState('')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const memberById = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return reports.filter((report) => {
      if (status === 'open' && report.status !== 'open') return false
      if (status === 'closed' && report.status === 'open') return false
      if (kind !== 'all' && report.target.kind !== kind) return false
      if (campus !== 'all' && report.campus !== campus) return false
      if (!q) return true
      return `${report.target.label} ${report.reason} ${report.subjectName} ${report.reporterName} ${report.details}`
        .toLowerCase()
        .includes(q)
    })
  }, [reports, status, kind, campus, query])

  const openCount = reports.filter((report) => report.status === 'open').length

  const run = async (reportId: string, action: ReportAction) => {
    if (busyId) return
    setBusyId(reportId)
    await onQuickAction(reportId, action)
    setBusyId(null)
    setConfirmId(null)
  }

  const columns: Column<Report>[] = [
    {
      id: 'target',
      header: 'Reported',
      width: 'w-[22%]',
      sortValue: (report) => report.target.label.toLowerCase(),
      render: (report) => (
        <div className="flex items-center gap-md">
          <span
            aria-hidden="true"
            className={`flex size-8 shrink-0 items-center justify-center rounded-corner-md ${
              report.status === 'open' ? 'bg-danger-soft text-danger' : 'bg-bg-subtle text-text-secondary'
            }`}
          >
            {report.target.kind === 'listing' ? <Package size={16} /> : <UserRound size={16} />}
          </span>
          <div className="min-w-0">
            <p className="truncate text-cell-strong text-text-primary">{report.target.label}</p>
            <p className="truncate text-caption-sm text-text-tertiary">
              {KIND_LABEL[report.target.kind]} · {report.subjectName}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'reason',
      header: 'Reason',
      sortValue: (report) => report.reason,
      render: (report) => (
        <div className="min-w-0">
          <p className="truncate text-cell text-text-primary">{report.reason}</p>
          {report.details && <p className="truncate text-caption-sm text-text-tertiary">{report.details}</p>}
        </div>
      ),
    },
    {
      id: 'reporter',
      header: 'Reported by',
      width: 'w-44',
      sortValue: (report) => report.reporterName.toLowerCase(),
      render: (report) => (
        <div className="min-w-0">
          <p className="truncate text-cell text-text-primary">{report.reporterName}</p>
          <p className="truncate text-caption-sm text-text-tertiary">{campusLabel(report.campus)}</p>
        </div>
      ),
    },
    {
      id: 'when',
      header: 'Filed',
      width: 'w-28',
      sortValue: (report) => new Date(report.createdAt).getTime(),
      render: (report) => <span className="text-cell text-text-secondary">{timeAgo(report.createdAt)}</span>,
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-40',
      sortValue: (report) => (report.status === 'open' ? 0 : 1),
      render: (report) => {
        const badge = reportBadge(report)
        return <Badge variant={badge.variant} label={badge.label} />
      },
    },
    {
      id: 'actions',
      header: 'Actions',
      width: 'w-64',
      align: 'right',
      render: (report) => {
        if (report.status !== 'open') {
          return <span className="text-caption-sm text-text-tertiary">Closed</span>
        }
        const subject = memberById.get(report.subjectId)
        const canSuspend = subject?.role !== 'admin' && subject?.status !== 'suspended'
        const busy = busyId === report.id
        const confirming = confirmId === report.id
        return (
          <div className="flex items-center justify-end gap-xs" onClick={(event) => event.stopPropagation()}>
            {confirming ? (
              <>
                <span className="mr-xs text-caption-sm text-text-secondary">Sure?</span>
                <Button
                  variant="subtle"
                  size="small"
                  disabled={busy}
                  onClick={() => setConfirmId(null)}
                  className="text-text-secondary"
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  disabled={busy}
                  iconStart={busy ? <Spinner size={14} /> : <X size={14} />}
                  onClick={() => void run(report.id, 'remove_listing')}
                  className="border-danger bg-danger text-white hover:border-danger hover:bg-danger/90"
                >
                  Take down
                </Button>
              </>
            ) : (
              <>
                <Button
                  variant="subtle"
                  size="small"
                  disabled={busy}
                  iconStart={busy ? <Spinner size={14} /> : <Check size={14} />}
                  onClick={() => void run(report.id, 'dismiss')}
                >
                  Approve
                </Button>
                {report.target.kind === 'listing' && listingsById[report.target.id] && (
                  <Button
                    variant="subtle"
                    size="small"
                    disabled={busy}
                    iconStart={<X size={14} />}
                    onClick={() => setConfirmId(report.id)}
                    className="text-danger"
                  >
                    Take down
                  </Button>
                )}
                {canSuspend && (
                  <Button
                    variant="subtle"
                    size="small"
                    disabled={busy}
                    iconStart={<ShieldCheck size={14} />}
                    onClick={() => void run(report.id, 'suspend_member')}
                  >
                    Suspend
                  </Button>
                )}
              </>
            )}
          </div>
        )
      },
    },
  ]

  return (
    <div className="flex flex-col gap-lg">
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search reports"
        placeholder="Search by listing, member, reason, or reporter"
        filters={[
          { label: 'Status', value: status, options: STATUS_OPTIONS, onChange: (value) => setStatus(value as StatusFilter) },
          { label: 'Target', value: kind, options: KIND_OPTIONS, onChange: (value) => setKind(value as KindFilter) },
          { label: 'Campus', value: campus, options: CAMPUS_OPTIONS, onChange: (value) => setCampus(value as CampusFilter) },
        ]}
      >
        {rows.length} of {reports.length} reports · {openCount} open
      </Toolbar>

      <DataTable
        label="Moderation queue"
        columns={columns}
        rows={rows}
        rowKey={(report) => report.id}
        onRowClick={(report) => onOpen(report.id)}
        rowLabel={(report) => `Review report on ${report.target.label}: ${report.reason}`}
        initialSort={{ id: 'status', direction: 'asc' }}
        empty={
          <EmptyState
            icon={ShieldCheck}
            title={status === 'open' ? 'Queue is clear' : 'No reports match'}
            body={
              status === 'open'
                ? 'Every report has been reviewed. New ones from members show up here.'
                : 'Try a different search or filter.'
            }
          />
        }
      />

      <p className="text-caption-sm text-text-tertiary">
        Approve dismisses the report. Take down removes the listing and asks you to confirm. Suspend blocks the
        member&rsquo;s sign-in and hides their listings. Open a row to add a note first.
      </p>
    </div>
  )
}
