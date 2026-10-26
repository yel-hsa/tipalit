import { Button } from '@figma/astraui'
import { History } from 'lucide-react'
import { useMemo, useState } from 'react'
import { timeAgo } from '@tipalit/services/seed'
import type { AuditAction, AuditEntry } from '@tipalit/services/types'
import { AUDIT_ICON } from '../components/admin/adminLabels'
import Toolbar from '../components/admin/Toolbar'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'

type AuditSectionProps = {
  audit: AuditEntry[]
}

type ActionFilter = 'all' | AuditAction

const ACTION_LABEL: Record<AuditAction, string> = {
  report_dismissed: 'Report dismissed',
  listing_removed: 'Listing removed',
  member_suspended: 'Member suspended',
  member_reinstated: 'Member reinstated',
  spots_updated: 'Meetup spots updated',
}

const ACTION_OPTIONS = [
  { value: 'all', label: 'All actions' },
  ...(Object.keys(ACTION_LABEL) as AuditAction[]).map((action) => ({ value: action, label: ACTION_LABEL[action] })),
]

const dayKey = (iso: string) => new Date(iso).toDateString()

const dayLabel = (iso: string) => {
  const date = new Date(iso)
  const today = new Date()
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === today.toDateString()) return 'Today'
  if (date.toDateString() === yesterday.toDateString()) return 'Yesterday'
  return date.toLocaleDateString('en-PH', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' })
}

const timeOf = (iso: string) =>
  new Date(iso).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })

export default function AuditSection({ audit }: AuditSectionProps) {
  const [query, setQuery] = useState('')
  const [action, setAction] = useState<ActionFilter>('all')

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return audit.filter((entry) => {
      if (action !== 'all' && entry.action !== action) return false
      if (!q) return true
      return `${entry.summary} ${entry.actorName} ${entry.note ?? ''}`.toLowerCase().includes(q)
    })
  }, [audit, action, query])

  const filtersActive = action !== 'all' || query.trim().length > 0
  const clearFilters = () => {
    setAction('all')
    setQuery('')
  }

  const groups = useMemo(() => {
    const byDay = new Map<string, AuditEntry[]>()
    rows.forEach((entry) => {
      const key = dayKey(entry.at)
      const list = byDay.get(key)
      if (list) list.push(entry)
      else byDay.set(key, [entry])
    })
    return [...byDay.values()]
  }, [rows])

  return (
    <div className="flex flex-col gap-lg">
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search the audit log"
        placeholder="Search by action, admin, or note"
        filters={[
          { label: 'Action', value: action, options: ACTION_OPTIONS, onChange: (value) => setAction(value as ActionFilter) },
        ]}
      >
        {rows.length} of {audit.length} entries
      </Toolbar>

      {rows.length === 0 ? (
        <EmptyState
          icon={History}
          title={audit.length === 0 ? 'No admin actions yet' : 'No entries match'}
          body={
            audit.length === 0
              ? 'Every decision, suspension, and settings change is recorded here.'
              : 'No entry matches the current search and action filter.'
          }
          action={
            filtersActive ? (
              <Button variant="neutral" size="small" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="flex flex-col gap-xl">
          {groups.map((entries) => (
            <section key={dayKey(entries[0].at)} aria-label={dayLabel(entries[0].at)} className="flex flex-col gap-md">
              <h2 className="text-th uppercase tracking-wide text-text-tertiary">{dayLabel(entries[0].at)}</h2>
              <ol className="overflow-hidden rounded-corner-lg border border-border-primary bg-surface-bg">
                {entries.map((entry) => {
                  const Icon = AUDIT_ICON[entry.action] ?? History
                  return (
                    <li
                      key={entry.id}
                      className="flex items-start gap-lg border-b border-border-secondary px-xl py-md last:border-b-0"
                    >
                      <span
                        aria-hidden="true"
                        className="mt-xs flex size-8 shrink-0 items-center justify-center rounded-corner-full bg-bg-subtle text-text-secondary"
                      >
                        <Icon size={16} />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="text-cell-strong text-text-primary">{entry.summary}</p>
                        {entry.note && (
                          <p className="mt-xs text-cell text-text-secondary">&ldquo;{entry.note}&rdquo;</p>
                        )}
                        <p className="mt-xs text-caption-sm text-text-tertiary">
                          {entry.actorName} · <span className="tabular-nums">{timeOf(entry.at)}</span> ·{' '}
                          {timeAgo(entry.at)}
                        </p>
                      </div>
                      <Badge variant="default" label={ACTION_LABEL[entry.action] ?? entry.action} />
                    </li>
                  )
                })}
              </ol>
            </section>
          ))}
        </div>
      )}
    </div>
  )
}
