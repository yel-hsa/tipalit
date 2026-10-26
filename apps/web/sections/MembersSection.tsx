import { Avatar, Button } from '@figma/astraui'
import { Ban, RotateCcw, Star, UserSearch } from 'lucide-react'
import { useMemo, useState } from 'react'
import { initialsOf } from '@tipalit/services/profile'
import { campusLabel, formatMonthYear } from '@tipalit/services/seed'
import type { AccountStatus, MemberSummary } from '@tipalit/services/types'
import DataTable, { type Column } from '../components/admin/DataTable'
import Toolbar from '../components/admin/Toolbar'
import EmptyState from '../components/EmptyState'
import Spinner from '../components/Spinner'
import Badge from '../components/Badge'

type MembersSectionProps = {
  members: MemberSummary[]
  onOpen: (userId: string) => void
  onToggleStatus: (userId: string, status: AccountStatus) => Promise<boolean>
}

type StatusFilter = 'all' | 'active' | 'suspended' | 'flagged'
type CampusFilter = 'all' | 'manila' | 'qc'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All members' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'flagged', label: 'Has open reports' },
]

const CAMPUS_OPTIONS = [
  { value: 'all', label: 'Both campuses' },
  { value: 'manila', label: 'TIP Manila' },
  { value: 'qc', label: 'TIP Quezon City' },
]

function Trust({ member }: { member: MemberSummary }) {
  if (member.rating === undefined) {
    return <span className="text-caption-sm text-text-tertiary">No reviews</span>
  }
  return (
    <span className="inline-flex items-center gap-xs text-cell text-text-primary tabular-nums">
      <Star size={12} className="text-warning" aria-hidden="true" />
      {member.rating.toFixed(1)}
      <span className="text-caption-sm text-text-tertiary">({member.reviews})</span>
    </span>
  )
}

export default function MembersSection({ members, onOpen, onToggleStatus }: MembersSectionProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [campus, setCampus] = useState<CampusFilter>('all')
  const [busyId, setBusyId] = useState<string | null>(null)
  const [confirmId, setConfirmId] = useState<string | null>(null)

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return members.filter((member) => {
      if (status === 'active' && member.status !== 'active') return false
      if (status === 'suspended' && member.status !== 'suspended') return false
      if (status === 'flagged' && member.openReports === 0) return false
      if (campus !== 'all' && member.campus !== campus) return false
      if (!q) return true
      return `${member.name} ${member.email} ${member.program}`.toLowerCase().includes(q)
    })
  }, [members, status, campus, query])

  const filtersActive = status !== 'all' || campus !== 'all' || query.trim().length > 0
  const clearFilters = () => {
    setStatus('all')
    setCampus('all')
    setQuery('')
  }

  const toggle = async (member: MemberSummary) => {
    if (busyId) return
    setBusyId(member.userId)
    await onToggleStatus(member.userId, member.status === 'suspended' ? 'active' : 'suspended')
    setBusyId(null)
    setConfirmId(null)
  }

  const columns: Column<MemberSummary>[] = [
    {
      id: 'member',
      header: 'Member',
      sortValue: (member) => member.name.toLowerCase(),
      render: (member) => (
        <div className="flex items-center gap-md">
          <Avatar type="initial" initials={initialsOf(member.name)} size="medium" />
          <div className="min-w-0">
            <div className="flex items-center gap-sm">
              <span className="truncate text-cell-strong text-text-primary">{member.name}</span>
              {member.role === 'admin' && <Badge variant="secondary" label="Admin" />}
            </div>
            <p className="truncate text-caption-sm text-text-tertiary">{member.email}</p>
          </div>
        </div>
      ),
    },
    {
      id: 'campus',
      header: 'Campus',
      width: 'w-40',
      sortValue: (member) => (member.campus ? campusLabel(member.campus) : ''),
      render: (member) => (
        <div className="min-w-0">
          <p className="truncate text-cell text-text-primary">
            {member.campus ? campusLabel(member.campus) : 'Not set'}
          </p>
          <p className="truncate text-caption-sm text-text-tertiary">{member.program || 'Setup not finished'}</p>
        </div>
      ),
    },
    {
      id: 'trust',
      header: 'Trust',
      width: 'w-28',
      sortValue: (member) => member.rating ?? -1,
      render: (member) => <Trust member={member} />,
    },
    {
      id: 'listings',
      header: 'Listings',
      width: 'w-24',
      align: 'right',
      sortValue: (member) => member.activeListings,
      render: (member) => <span className="text-cell text-text-primary tabular-nums">{member.activeListings}</span>,
    },
    {
      id: 'reports',
      header: 'Reports',
      width: 'w-24',
      align: 'right',
      sortValue: (member) => member.openReports,
      render: (member) =>
        member.openReports > 0 ? (
          <Badge variant="warning" label={String(member.openReports)} />
        ) : (
          <span className="text-cell text-text-tertiary">0</span>
        ),
    },
    {
      id: 'joined',
      header: 'Joined',
      width: 'w-32',
      sortValue: (member) => (member.joinedAt ? new Date(member.joinedAt).getTime() : 0),
      render: (member) => (
        <span className="text-cell text-text-secondary">
          {member.joinedAt ? formatMonthYear(member.joinedAt) : 'Before launch'}
        </span>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-28',
      sortValue: (member) => member.status,
      render: (member) => (
        <Badge
          variant={member.status === 'suspended' ? 'danger' : 'brand'}
          label={member.status === 'suspended' ? 'Suspended' : 'Active'}
        />
      ),
    },
    {
      id: 'actions',
      header: 'Access',
      width: 'w-32',
      align: 'right',
      render: (member) => {
        if (member.role === 'admin') {
          return <span className="text-caption-sm text-text-tertiary">Staff</span>
        }
        const suspended = member.status === 'suspended'
        const busy = busyId === member.userId
        const confirming = confirmId === member.userId
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
                  aria-label={`Keep ${member.name} active`}
                >
                  Cancel
                </Button>
                <Button
                  variant="primary"
                  size="small"
                  disabled={busy}
                  aria-busy={busy || undefined}
                  aria-label={`Confirm suspending ${member.name}`}
                  iconStart={busy ? <Spinner size={14} /> : <Ban size={14} />}
                  onClick={() => void toggle(member)}
                  className="border-danger bg-danger text-white hover:border-danger hover:bg-danger/90"
                >
                  {busy ? 'Saving…' : 'Suspend'}
                </Button>
              </>
            ) : (
              <Button
                variant="subtle"
                size="small"
                disabled={busy}
                aria-label={
                  suspended ? `Reinstate ${member.name}` : `Suspend ${member.name}`
                }
                iconStart={busy ? <Spinner size={14} /> : suspended ? <RotateCcw size={14} /> : <Ban size={14} />}
                onClick={() => (suspended ? void toggle(member) : setConfirmId(member.userId))}
                className={suspended ? '' : 'text-danger'}
              >
                {suspended ? 'Unban' : 'Ban'}
              </Button>
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
        searchLabel="Search members"
        placeholder="Search by name, email, or program"
        filters={[
          { label: 'Status', value: status, options: STATUS_OPTIONS, onChange: (value) => setStatus(value as StatusFilter) },
          { label: 'Campus', value: campus, options: CAMPUS_OPTIONS, onChange: (value) => setCampus(value as CampusFilter) },
        ]}
      >
        {rows.length} of {members.length} members
      </Toolbar>

      <DataTable
        label="Student directory"
        columns={columns}
        rows={rows}
        rowKey={(member) => member.userId}
        onRowClick={(member) => onOpen(member.userId)}
        rowLabel={(member) => `Open ${member.name}`}
        rowMuted={(member) => member.status === 'suspended'}
        pageSize={25}
        initialSort={{ id: 'reports', direction: 'desc' }}
        empty={
          <EmptyState
            icon={UserSearch}
            title={filtersActive ? 'No members match' : 'No members yet'}
            body={
              filtersActive
                ? 'No member matches the current search and filters.'
                : 'Members appear here once students finish setting up their profile.'
            }
            action={
              filtersActive ? (
                <Button variant="neutral" size="small" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
      />

      <p className="text-caption-sm text-text-tertiary">
        Banning blocks sign-in and hides the member&rsquo;s listings. Open a row to add a reason to the audit log.
      </p>
    </div>
  )
}
