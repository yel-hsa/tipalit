import { Button, RadioGroup, TextareaField } from '@figma/astraui'
import { ExternalLink, Package, UserRound } from 'lucide-react'
import { useId, useState } from 'react'
import { firstNameOf } from '@tipalit/services/profile'
import { campusLabel, timeAgo } from '@tipalit/services/seed'
import type { Listing, MemberSummary, Report, ReportAction } from '@tipalit/services/types'
import InlineAlert from '../InlineAlert'
import Spinner from '../Spinner'
import { ACTION_COPY, KIND_LABEL, reportBadge } from './adminLabels'
import SlideOver from './SlideOver'
import Badge from '../Badge'

type ReportDrawerProps = {
  report: Report
  subject?: MemberSummary
  listing?: Listing
  related: { sameListing: number; sameMember: number }
  onClose: () => void
  onResolve: (action: ReportAction, note: string) => Promise<boolean>
  onViewListing: () => void
  onViewMember?: () => void
}

const NOTE_LIMIT = 300

export default function ReportDrawer({
  report,
  subject,
  listing,
  related,
  onClose,
  onResolve,
  onViewListing,
  onViewMember,
}: ReportDrawerProps) {
  const [action, setAction] = useState<ReportAction | ''>('')
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const noteId = useId()
  const decisionLabelId = useId()

  const isListing = report.target.kind === 'listing'
  const subjectFirst = firstNameOf(report.subjectName)
  const suspended = subject?.status === 'suspended'
  const badge = reportBadge(report)
  const open = report.status === 'open'

  const actions: ReportAction[] = [
    ...(isListing && listing ? (['remove_listing'] as const) : []),
    ...(!suspended && subject?.role !== 'admin' ? (['suspend_member'] as const) : []),
    'dismiss',
  ]

  const closes =
    action === 'remove_listing' ? related.sameListing : action === 'suspend_member' ? related.sameMember : 0

  const submit = async () => {
    if (!action || pending) return
    setSubmitted(true)
    if (!note.trim()) {
      document.getElementById(noteId)?.focus()
      return
    }
    setPending(true)
    const done = await onResolve(action, note.trim())
    if (!done) setPending(false)
  }

  const confirmLabel =
    action === 'suspend_member' ? `Suspend ${subjectFirst}` : action ? ACTION_COPY[action].label : 'Choose a decision'

  return (
    <SlideOver
      isOpen
      onClose={pending ? () => undefined : onClose}
      title="Review report"
      subtitle={`${KIND_LABEL[report.target.kind]} report · ${campusLabel(report.campus)}`}
      footer={
        open ? (
          <div className="flex items-center justify-end gap-md">
            <Button variant="subtle" onClick={onClose} disabled={pending}>
              Cancel
            </Button>
            <Button
              variant="primary"
              disabled={!action || pending}
              aria-busy={pending || undefined}
              iconStart={pending ? <Spinner /> : undefined}
              onClick={submit}
              className={
                action === 'dismiss'
                  ? undefined
                  : 'border-danger bg-danger text-on-brand hover:border-danger hover:bg-danger/90'
              }
            >
              {pending ? 'Applying…' : confirmLabel}
            </Button>
          </div>
        ) : undefined
      }
    >
      <div className="flex flex-col gap-xl">
        <section aria-label="Report" className="flex flex-col gap-md rounded-corner-md bg-bg-faint p-lg">
          <div className="flex items-start gap-md">
            <span
              aria-hidden="true"
              className="flex size-10 shrink-0 items-center justify-center rounded-corner-full bg-danger-soft text-danger"
            >
              {isListing ? <Package size={20} /> : <UserRound size={20} />}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-cell-strong text-text-primary">{report.target.label}</p>
              <p className="text-caption-sm text-text-secondary">
                {isListing ? `Listed by ${report.subjectName}` : 'Reported member'}
              </p>
            </div>
            <Badge variant={badge.variant} label={badge.label} />
          </div>
          <div className="flex flex-col gap-xs">
            <p className="text-cell-strong text-text-primary">{report.reason}</p>
            {report.details ? (
              <p className="text-cell text-text-secondary">&ldquo;{report.details}&rdquo;</p>
            ) : (
              <p className="text-cell text-text-tertiary">No details given.</p>
            )}
          </div>
          <p className="text-caption-sm text-text-secondary">
            Reported by {report.reporterName} · {timeAgo(report.createdAt)}
          </p>
        </section>

        {listing && (
          <section aria-label="Reported listing" className="flex gap-md rounded-corner-md border border-border-secondary p-md">
            <img src={listing.imageUrl} alt="" className="size-16 shrink-0 rounded-corner-sm object-cover" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-cell-strong text-text-primary">{listing.title}</p>
              <p className="truncate text-caption-sm text-text-secondary">
                {listing.category} · {listing.condition} · {campusLabel(listing.campus)}
              </p>
              <p className="mt-xs line-clamp-2 text-caption-sm text-text-tertiary">{listing.description}</p>
            </div>
          </section>
        )}

        <div className="flex flex-wrap gap-md">
          {listing && (
            <Button variant="neutral" size="small" iconStart={<ExternalLink size={14} />} onClick={onViewListing}>
              Inspect listing
            </Button>
          )}
          {onViewMember && (
            <Button variant="neutral" size="small" iconStart={<UserRound size={14} />} onClick={onViewMember}>
              View {subjectFirst}
            </Button>
          )}
        </div>

        {subject && (
          <p className="text-cell text-text-secondary">
            {subjectFirst} has{' '}
            <span className="text-text-primary">
              {subject.openReports} open {subject.openReports === 1 ? 'report' : 'reports'}
            </span>{' '}
            and {subject.activeListings} active {subject.activeListings === 1 ? 'listing' : 'listings'}
            {suspended ? ', and is already suspended.' : '.'}
          </p>
        )}

        {isListing && !listing && open && (
          <InlineAlert tone="info">
            This listing is already gone. You can still suspend the seller or dismiss the report.
          </InlineAlert>
        )}

        {open ? (
          <>
            <section aria-labelledby={decisionLabelId} className="flex flex-col gap-md">
              <p id={decisionLabelId} role="heading" aria-level={3} className="text-cell-strong text-text-primary">
                Decision
              </p>
              <RadioGroup
                name={`decision-${report.id}`}
                value={action}
                onChange={(value) => setAction(value as ReportAction)}
                disabled={pending}
                options={actions.map((id) => ({
                  value: id,
                  label: id === 'suspend_member' ? `Suspend ${subjectFirst}` : ACTION_COPY[id].label,
                  description: ACTION_COPY[id].description,
                }))}
              />
              {closes > 0 && (
                <p className="text-caption-sm text-text-secondary">
                  This also closes {closes} other open {closes === 1 ? 'report' : 'reports'} about the same{' '}
                  {action === 'remove_listing' ? 'listing' : 'member'}.
                </p>
              )}
            </section>
            <div className="flex flex-col gap-xs">
              <TextareaField
                id={noteId}
                label="Note for the activity log"
                placeholder="What you checked and why you decided this"
                rows={3}
                maxLength={NOTE_LIMIT}
                value={note}
                onChange={setNote}
                disabled={pending}
                aria-invalid={submitted && !note.trim() ? true : undefined}
                description={`${note.length}/${NOTE_LIMIT}`}
              />
              {submitted && !note.trim() && (
                <p role="alert" className="text-caption-sm text-danger">
                  Add a note explaining the decision.
                </p>
              )}
            </div>
          </>
        ) : (
          report.resolution && (
            <section
              aria-label="Outcome"
              className="flex flex-col gap-xs rounded-corner-md border border-border-secondary p-lg"
            >
              <p className="text-cell-strong text-text-primary">{ACTION_COPY[report.resolution.action].label}</p>
              <p className="text-caption-sm text-text-secondary">
                {report.resolution.byName} · {timeAgo(report.resolution.at)}
              </p>
              {report.resolution.note && (
                <p className="text-cell text-text-secondary">&ldquo;{report.resolution.note}&rdquo;</p>
              )}
            </section>
          )
        )}
      </div>
    </SlideOver>
  )
}
