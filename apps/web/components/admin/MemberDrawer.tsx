import { Avatar, Button, TextareaField } from '@figma/astraui'
import { Ban, ChevronRight, RotateCcw, Star } from 'lucide-react'
import { useId, useState } from 'react'
import { firstNameOf, initialsOf } from '@tipalit/services/profile'
import { campusLabel, formatMonthYear, timeAgo } from '@tipalit/services/seed'
import type { AccountStatus, MemberSummary, Report } from '@tipalit/services/types'
import FormField, { errorIdFor } from '../FormField'
import InlineAlert from '../InlineAlert'
import Spinner from '../Spinner'
import SlideOver from './SlideOver'
import Badge from '../Badge'

type MemberDrawerProps = {
  member: MemberSummary
  openReports: Report[]
  onClose: () => void
  onSetStatus: (status: AccountStatus, note: string) => Promise<boolean>
  onOpenReport: (reportId: string) => void
}

const NOTE_LIMIT = 300

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs rounded-corner-md bg-bg-faint p-md">
      <span className="text-caption-sm text-text-secondary">{label}</span>
      <span className="text-cell-strong text-text-primary">{value}</span>
    </div>
  )
}

export default function MemberDrawer({
  member,
  openReports,
  onClose,
  onSetStatus,
  onOpenReport,
}: MemberDrawerProps) {
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
  const [done, setDone] = useState(false)
  const noteId = useId()

  const first = firstNameOf(member.name)
  const isAdmin = member.role === 'admin'
  const suspended = member.status === 'suspended'
  const noteError = submitted && !suspended && !note.trim() ? 'Add a reason. It goes in the activity log.' : undefined

  const submit = async () => {
    if (pending) return
    setSubmitted(true)
    if (!suspended && !note.trim()) {
      document.getElementById(noteId)?.focus()
      return
    }
    setPending(true)
    const ok = await onSetStatus(suspended ? 'active' : 'suspended', note.trim())
    setPending(false)
    if (ok) {
      setNote('')
      setSubmitted(false)
      setDone(true)
    }
  }

  return (
    <SlideOver
      isOpen
      onClose={pending ? () => undefined : onClose}
      title={member.name}
      subtitle={member.email}
      footer={
        isAdmin ? undefined : (
          <div className="flex items-center justify-end gap-md">
            <Button variant="subtle" onClick={onClose} disabled={pending}>
              Close
            </Button>
            <Button
              variant="primary"
              disabled={pending || done}
              aria-busy={pending || undefined}
              iconStart={pending ? <Spinner /> : suspended ? <RotateCcw size={16} /> : <Ban size={16} />}
              onClick={submit}
              className={suspended ? undefined : 'border-danger bg-danger text-white hover:border-danger hover:bg-danger/90'}
            >
              {pending ? 'Saving…' : done ? 'Saved' : suspended ? `Reinstate ${first}` : `Suspend ${first}`}
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-xl">
        <div className="flex items-center gap-lg">
          <Avatar type="initial" initials={initialsOf(member.name)} size="large" />
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="text-cell text-text-secondary">
              {member.program}
              {member.year ? ` · ${member.year}` : ''}
            </p>
            <div className="flex flex-wrap gap-sm">
              {member.campus && <Badge variant="brand" label={campusLabel(member.campus)} />}
              {isAdmin && <Badge variant="secondary" label="Admin" />}
              <Badge variant={suspended ? 'danger' : 'brand'} label={suspended ? 'Suspended' : 'Active'} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-4 gap-md">
          <Fact label="Listings" value={String(member.activeListings)} />
          <Fact label="Open reports" value={String(member.openReports)} />
          <Fact
            label="Trust"
            value={member.rating !== undefined ? `${member.rating.toFixed(1)} (${member.reviews})` : '—'}
          />
          <Fact label="Joined" value={member.joinedAt ? formatMonthYear(member.joinedAt) : 'Before launch'} />
        </div>

        {member.rating !== undefined && (
          <p className="flex items-center gap-xs text-caption-sm text-text-secondary">
            <Star size={12} className="text-warning" aria-hidden="true" />
            Average of {member.reviews} {member.reviews === 1 ? 'review' : 'reviews'} from completed exchanges.
          </p>
        )}

        {openReports.length > 0 && (
          <section aria-label="Open reports" className="flex flex-col gap-md">
            <p className="text-cell-strong text-text-primary">Open reports</p>
            <ul className="overflow-hidden rounded-corner-md border border-border-secondary">
              {openReports.map((report) => (
                <li key={report.id} className="border-b border-border-secondary last:border-b-0">
                  <button
                    type="button"
                    onClick={() => onOpenReport(report.id)}
                    aria-label={`Review report: ${report.reason}, ${report.target.label}`}
                    className="flex w-full items-center gap-md p-md text-left hover:bg-bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-cell text-text-primary">{report.reason}</p>
                      <p className="truncate text-caption-sm text-text-secondary">
                        {report.target.label} · {timeAgo(report.createdAt)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-text-secondary" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isAdmin ? (
          <InlineAlert tone="info">
            Staff accounts can&rsquo;t be suspended here. Roles are managed on the server.
          </InlineAlert>
        ) : (
          <section aria-label="Account status" className="flex flex-col gap-md">
            <p className="text-cell text-text-secondary">
              {suspended
                ? `Reinstating gives ${first} back sign-in and shows their listings on the feed again.`
                : `Suspending hides ${first}’s listings from the feed and blocks sign-in. Chats and history stay.`}
            </p>
            <FormField id={noteId} error={noteError}>
              <TextareaField
                id={noteId}
                label={suspended ? 'Note (optional)' : 'Reason for suspension'}
                placeholder={suspended ? 'For example: appeal accepted' : 'For example: repeated no-shows at meetups'}
                rows={3}
                maxLength={NOTE_LIMIT}
                value={note}
                onChange={setNote}
                disabled={pending}
                aria-invalid={noteError ? true : undefined}
                aria-describedby={noteError ? errorIdFor(noteId) : undefined}
                description={`${note.length}/${NOTE_LIMIT}`}
              />
            </FormField>
          </section>
        )}
      </div>
    </SlideOver>
  )
}
