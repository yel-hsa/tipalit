import { Button } from '@figma/astraui'
import { ArrowRight, ClipboardList, Package, Star, Users } from 'lucide-react'
import { useEffect, useMemo, useState, type CSSProperties, type ReactNode } from 'react'
import { CAMPUSES, CATEGORY_LIST, campusLabel, timeAgo } from '@tipalit/services/seed'
import type { AnalyticsOverview, AuditEntry, CampusId, Listing, MemberSummary, Report } from '@tipalit/services/types'
import { AUDIT_ICON, reportBadge } from '../components/admin/adminLabels'
import type { AdminSection } from '../components/admin/AdminShell'
import { listingStatusOf } from '../components/admin/listingLabels'
import Badge from '../components/Badge'

type DashboardSectionProps = {
  overview?: AnalyticsOverview
  reports: Report[]
  members: MemberSummary[]
  listings: Listing[]
  audit: AuditEntry[]
  onGoTo: (section: AdminSection) => void
  onOpenReport: (reportId: string) => void
}

// counts up once on mount; the final value is what lands in the DOM for screen readers
function useCountUp(target: number, duration = 600) {
  const [shown, setShown] = useState(target)

  useEffect(() => {
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    if (reduced || target === 0) {
      setShown(target)
      return
    }
    let frame = 0
    const start = performance.now()
    const step = (now: number) => {
      const progress = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - progress, 3)
      setShown(Math.round(target * eased))
      if (progress < 1) frame = requestAnimationFrame(step)
    }
    frame = requestAnimationFrame(step)
    return () => cancelAnimationFrame(frame)
  }, [target, duration])

  return shown
}

function Metric({
  icon,
  label,
  value,
  hint,
  tone = 'default',
  index = 0,
}: {
  icon: ReactNode
  label: string
  value: number
  hint: string
  tone?: 'default' | 'danger'
  index?: number
}) {
  const shown = useCountUp(value)
  return (
    <div
      style={{ '--i': index } as CSSProperties}
      className="stagger flex animate-rise-in flex-col gap-md rounded-corner-lg border border-border-primary bg-surface-bg p-xl transition-[box-shadow,border-color] duration-200 hover:border-border-selected hover:shadow-raised"
    >
      <div className="flex items-center justify-between">
        <span className="text-cell-strong text-text-secondary">{label}</span>
        <span
          aria-hidden="true"
          className={`flex size-8 items-center justify-center rounded-corner-md ${
            tone === 'danger' ? 'bg-danger-soft text-danger' : 'bg-accent-soft text-brand-primary'
          }`}
        >
          {icon}
        </span>
      </div>
      <span className="text-metric text-text-primary tabular-nums">
        {value > 0 && !Number.isInteger(value) ? value.toFixed(1) : shown}
      </span>
      <span className="text-caption-sm text-text-tertiary">{hint}</span>
    </div>
  )
}

function Panel({ title, action, children }: { title: string; action?: ReactNode; children: ReactNode }) {
  return (
    <section className="flex animate-rise-in flex-col rounded-corner-lg border border-border-primary bg-surface-bg [animation-delay:120ms]">
      <div className="flex items-center justify-between gap-md border-b border-border-secondary px-xl py-md">
        <h2 className="text-section text-text-primary">{title}</h2>
        {action}
      </div>
      <div className="flex-1 p-xl">{children}</div>
    </section>
  )
}

// a single stacked bar beats a chart library for two campuses
function CampusBar({ campus, count, total }: { campus: CampusId; count: number; total: number }) {
  const share = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex flex-col gap-xs">
      <div className="flex items-baseline justify-between gap-md">
        <span className="text-cell-strong text-text-primary">{campusLabel(campus)}</span>
        <span className="text-cell text-text-secondary tabular-nums">
          {count} <span className="text-text-tertiary">({share}%)</span>
        </span>
      </div>
      <div
        role="img"
        aria-label={`${campusLabel(campus)}: ${count} of ${total} active listings`}
        className="h-2 overflow-hidden rounded-corner-full bg-bg-subtle"
      >
        <div
          className={`h-full origin-left animate-grow-x rounded-corner-full ${
            campus === 'qc' ? 'bg-campus-qc' : 'bg-brand-primary'
          }`}
          style={{ width: `${share}%` }}
        />
      </div>
    </div>
  )
}

export default function DashboardSection({
  overview,
  reports,
  members,
  listings,
  audit,
  onGoTo,
  onOpenReport,
}: DashboardSectionProps) {
  const openReports = useMemo(() => reports.filter((report) => report.status === 'open'), [reports])
  const activeListings = useMemo(() => listings.filter((listing) => listing.status === 'active'), [listings])
  const suspended = members.filter((member) => member.status === 'suspended').length
  const flagged = members.filter((member) => member.openReports > 0).length

  const byCampus = CAMPUSES.map((campus) => ({
    campus: campus.id,
    count: activeListings.filter((listing) => listing.campus === campus.id).length,
  }))

  const byCategory = useMemo(() => {
    const counts = CATEGORY_LIST.map((category) => ({
      category,
      count: listings.filter((listing) => listing.category === category).length,
    })).sort((a, b) => b.count - a.count)
    const max = Math.max(1, ...counts.map((entry) => entry.count))
    return { counts, max }
  }, [listings])

  const sold = listings.filter((listing) => listing.status === 'sold').length
  const reserved = listings.filter((listing) => listing.status === 'reserved').length

  return (
    <div className="flex flex-col gap-xl">
      <div className="grid grid-cols-4 gap-lg">
        <Metric
          icon={<Package size={16} />}
          label="Active listings"
          value={activeListings.length}
          hint={`${reserved} reserved · ${sold} sold`}
          index={0}
        />
        <Metric
          icon={<ClipboardList size={16} />}
          label="Pending reports"
          value={openReports.length}
          hint={openReports.length > 0 ? 'Waiting on a decision' : 'Queue is clear'}
          tone={openReports.length > 0 ? 'danger' : 'default'}
          index={1}
        />
        <Metric
          icon={<Users size={16} />}
          label="Members"
          value={overview?.members ?? members.length}
          hint={`${flagged} flagged · ${suspended} suspended`}
          index={2}
        />
        <Metric
          icon={<Star size={16} />}
          label="Average rating"
          value={overview && overview.averageRating > 0 ? overview.averageRating : 0}
          hint={
            overview && overview.averageRating > 0
              ? overview.completedExchanges > 0
                ? `${overview.completedExchanges} completed exchanges`
                : 'From member reviews'
              : 'No reviews yet'
          }
          index={3}
        />
      </div>

      <div className="grid grid-cols-3 gap-lg">
        <Panel
          title="Campus breakdown"
          action={<span className="text-caption-sm text-text-tertiary">Active listings</span>}
        >
          <div className="flex flex-col gap-lg">
            {byCampus.map((entry) => (
              <CampusBar key={entry.campus} campus={entry.campus} count={entry.count} total={activeListings.length} />
            ))}
            <div className="mt-xs flex items-center justify-between border-t border-border-secondary pt-md">
              <span className="text-cell text-text-secondary">Total active</span>
              <span className="text-cell-strong text-text-primary tabular-nums">{activeListings.length}</span>
            </div>
          </div>
        </Panel>

        <Panel
          title="Category volume"
          action={<span className="text-caption-sm text-text-tertiary">All listings</span>}
        >
          <ul className="flex flex-col gap-sm">
            {byCategory.counts.map((entry) => (
              <li key={entry.category} className="flex items-center gap-md">
                <span className="w-32 shrink-0 truncate text-cell text-text-secondary">{entry.category}</span>
                <span className="h-1.5 flex-1 overflow-hidden rounded-corner-full bg-bg-subtle">
                  <span
                    className="block h-full origin-left animate-grow-x rounded-corner-full bg-brand-primary"
                    style={{ width: `${(entry.count / byCategory.max) * 100}%` }}
                  />
                </span>
                <span className="w-6 shrink-0 text-right text-cell text-text-primary tabular-nums">{entry.count}</span>
              </li>
            ))}
          </ul>
        </Panel>

        <Panel
          title="Needs attention"
          action={
            <Button variant="subtle" size="small" onClick={() => onGoTo('reports')}>
              Open queue
            </Button>
          }
        >
          {openReports.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-sm py-xl text-center">
              <Star size={24} className="text-success" aria-hidden="true" />
              <p className="text-cell-strong text-text-primary">Nothing waiting</p>
              <p className="text-caption-sm text-text-secondary">New reports land here as members file them.</p>
            </div>
          ) : (
            <ul className="flex flex-col">
              {openReports.slice(0, 4).map((report) => {
                const badge = reportBadge(report)
                return (
                  <li key={report.id} className="border-b border-border-secondary last:border-b-0">
                    <button
                      type="button"
                      onClick={() => onOpenReport(report.id)}
                      className="flex w-full items-center gap-md py-sm text-left hover:bg-bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary"
                    >
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-cell-strong text-text-primary">{report.target.label}</p>
                        <p className="truncate text-caption-sm text-text-secondary">
                          {report.reason} · {timeAgo(report.createdAt)}
                        </p>
                      </div>
                      <Badge variant={badge.variant} label={badge.label} />
                    </button>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>
      </div>

      <div className="grid grid-cols-3 gap-lg">
        <Panel
          title="Recent moderation"
          action={
            <Button
              variant="subtle"
              size="small"
              iconEnd={<ArrowRight size={14} />}
              onClick={() => onGoTo('audit')}
            >
              Full log
            </Button>
          }
        >
          {audit.length === 0 ? (
            <p className="text-cell text-text-secondary">No admin actions recorded yet.</p>
          ) : (
            <ul className="flex flex-col gap-md">
              {audit.slice(0, 5).map((entry) => {
                const Icon = AUDIT_ICON[entry.action] ?? ClipboardList
                return (
                  <li key={entry.id} className="flex items-start gap-md">
                    <span
                      aria-hidden="true"
                      className="mt-xs flex size-6 shrink-0 items-center justify-center rounded-corner-full bg-bg-subtle text-text-secondary"
                    >
                      <Icon size={12} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="text-cell text-text-primary">{entry.summary}</p>
                      <p className="text-caption-sm text-text-tertiary">
                        {entry.actorName} · {timeAgo(entry.at)}
                      </p>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </Panel>

        <Panel title="Recently listed">
          <ul className="flex flex-col gap-md">
            {listings.slice(0, 5).map((listing) => {
              const status = listingStatusOf(listing)
              return (
                <li key={listing.id} className="flex items-center gap-md">
                  <img
                    src={listing.imageUrl}
                    alt=""
                    loading="lazy"
                    className="size-9 shrink-0 rounded-corner-sm object-cover"
                  />
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-cell text-text-primary">{listing.title}</p>
                    <p className="truncate text-caption-sm text-text-tertiary">
                      {campusLabel(listing.campus)} · {timeAgo(listing.createdAt)}
                    </p>
                  </div>
                  <Badge variant={status.variant} label={status.label} />
                </li>
              )
            })}
          </ul>
        </Panel>

        <Panel title="Flagged members">
          {flagged === 0 ? (
            <p className="text-cell text-text-secondary">No member has an open report.</p>
          ) : (
            <ul className="flex flex-col gap-md">
              {members
                .filter((member) => member.openReports > 0)
                .slice(0, 5)
                .map((member) => (
                  <li key={member.userId} className="flex items-center gap-md">
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-cell text-text-primary">{member.name}</p>
                      <p className="truncate text-caption-sm text-text-tertiary">
                        {member.campus ? campusLabel(member.campus) : 'No campus'}
                      </p>
                    </div>
                    <Badge
                      variant="warning"
                      label={`${member.openReports} ${member.openReports === 1 ? 'report' : 'reports'}`}
                    />
                  </li>
                ))}
            </ul>
          )}
        </Panel>
      </div>
    </div>
  )
}
