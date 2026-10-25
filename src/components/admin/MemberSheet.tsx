import { Avatar, Badge, Button, TextareaField } from '@figma/astraui'
import { Ban, ChevronRight, RotateCcw } from 'lucide-react'
import { useId, useState } from 'react'
import { campusLabel, formatMonthYear, timeAgo } from '../../data/seed'
import { firstNameOf, initialsOf } from '../../services/profile'
import type { AccountStatus, MemberSummary, Report } from '../../services/types'
import BottomSheet from '../BottomSheet'
import FormField, { errorIdFor } from '../FormField'
import InlineAlert from '../InlineAlert'
import Pressable from '../Pressable'
import Spinner from '../Spinner'

type MemberSheetProps = {
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
      <span className="text-label-sm text-text-primary">{value}</span>
    </div>
  )
}

export default function MemberSheet({ member, openReports, onClose, onSetStatus, onOpenReport }: MemberSheetProps) {
  const [note, setNote] = useState('')
  const [submitted, setSubmitted] = useState(false)
  const [pending, setPending] = useState(false)
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
    await onSetStatus(suspended ? 'active' : 'suspended', note.trim())
    setPending(false)
    setNote('')
    setSubmitted(false)
  }

  return (
    <BottomSheet
      isOpen
      onClose={pending ? () => undefined : onClose}
      title={member.name}
      subtitle={member.email}
      footer={
        isAdmin ? undefined : (
          <Button
            variant="primary"
            disabled={pending}
            aria-busy={pending || undefined}
            iconStart={pending ? <Spinner /> : suspended ? <RotateCcw size={16} /> : <Ban size={16} />}
            onClick={submit}
            className="w-full touch-hit"
          >
            {pending ? 'Saving\u2026' : suspended ? `Reinstate ${first}` : `Suspend ${first}`}
          </Button>
        )
      }
    >
      <div className="flex flex-col gap-xl">
        <div className="flex items-center gap-lg">
          <Avatar type="initial" initials={initialsOf(member.name)} size="large" />
          <div className="flex min-w-0 flex-1 flex-col gap-xs">
            <p className="text-label-sm text-text-secondary">
              {member.program}
              {member.year ? ` \u00b7 ${member.year}` : ''}
            </p>
            <div className="flex flex-wrap gap-sm">
              {member.campus && <Badge variant="brand" label={campusLabel(member.campus)} />}
              {isAdmin && <Badge variant="secondary" label="Admin" />}
              <Badge variant={suspended ? 'danger' : 'success'} label={suspended ? 'Suspended' : 'Active'} />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-md">
          <Fact label="Listings" value={String(member.activeListings)} />
          <Fact label="Open reports" value={String(member.openReports)} />
          <Fact label="Joined" value={member.joinedAt ? formatMonthYear(member.joinedAt) : 'Before launch'} />
        </div>

        {openReports.length > 0 && (
          <section aria-label="Open reports" className="flex flex-col gap-md">
            <p className="text-label font-semibold text-text-primary">Open reports</p>
            <ul className="overflow-hidden rounded-corner-md border border-border-secondary">
              {openReports.map((report) => (
                <li key={report.id} className="border-b border-border-secondary last:border-b-0">
                  <Pressable
                    onPress={() => onOpenReport(report.id)}
                    aria-label={`Review report: ${report.reason}, ${report.target.label}`}
                    className="flex items-center gap-md p-md hover:bg-bg-hover"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-label-sm text-text-primary">{report.reason}</p>
                      <p className="truncate text-caption-sm text-text-secondary">
                        {report.target.label} &middot; {timeAgo(report.createdAt)}
                      </p>
                    </div>
                    <ChevronRight size={16} className="shrink-0 text-text-secondary" aria-hidden="true" />
                  </Pressable>
                </li>
              ))}
            </ul>
          </section>
        )}

        {isAdmin ? (
          <InlineAlert tone="info">Staff accounts can&rsquo;t be suspended here. Roles are managed on the server.</InlineAlert>
        ) : (
          <section aria-label="Account status" className="flex flex-col gap-md">
            <p className="text-label-sm text-text-secondary">
              {suspended
                ? `Reinstating gives ${first} back sign-in and shows their listings on the feed again.`
                : `Suspending hides ${first}\u2019s listings from the feed and blocks sign-in. Chats and history stay.`}
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
    </BottomSheet>
  )
}
