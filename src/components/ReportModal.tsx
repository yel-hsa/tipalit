import { Button, Modal, RadioGroup, TextareaField } from '@figma/astraui'
import { ShieldAlert } from 'lucide-react'
import { useRef, useState } from 'react'
import Spinner from './Spinner'
import useDialogFocus from './useDialogFocus'

/** `id` is the listing or member id; empty for the reviewer preview, which has nothing behind it. */
export type ReportTarget = { kind: 'listing' | 'user'; id: string; name: string }

type ReportModalProps = {
  isOpen: boolean
  onClose: () => void
  target: ReportTarget
  /** Resolves true once the report is filed; false keeps the modal open so nothing is lost. */
  onSubmit: (reason: string, details: string) => Promise<boolean>
}

const REASONS: Record<ReportTarget['kind'], string[]> = {
  listing: [
    'Scam or suspicious price',
    'Prohibited item',
    'Misleading photos or description',
    'Already sold',
    'Other',
  ],
  user: ['Not a TIP student', 'Harassment or inappropriate messages', 'No-show at meetup', 'Scam attempt', 'Other'],
}

export default function ReportModal({ isOpen, onClose, target, onSubmit }: ReportModalProps) {
  const [reason, setReason] = useState('')
  const [details, setDetails] = useState('')
  const [pending, setPending] = useState(false)
  const bodyRef = useRef<HTMLDivElement>(null)
  useDialogFocus(isOpen, bodyRef, { canClose: () => !pending, onClose })

  const submit = async () => {
    if (!reason || pending) return
    setPending(true)
    const sent = await onSubmit(reason, details.trim())
    if (!sent) setPending(false)
  }

  const title = target.kind === 'listing' ? 'Report listing' : `Report ${target.name.split(' ')[0]}`

  return (
    <Modal
      isOpen={isOpen}
      onClose={pending ? () => undefined : onClose}
      title={title}
      size="small"
      className="w-[var(--modal-width)] shadow-raised"
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={pending} className="touch-hit">
            Cancel
          </Button>
          <Button
            variant="primary"
            disabled={!reason || pending}
            aria-busy={pending || undefined}
            iconStart={pending ? <Spinner /> : undefined}
            onClick={submit}
            className="touch-hit"
          >
            {pending ? 'Sending…' : 'Submit report'}
          </Button>
        </>
      }
    >
      <div ref={bodyRef} className="flex flex-col gap-xl">
        <div className="flex items-start gap-md rounded-corner-md bg-bg-faint p-md">
          <ShieldAlert size={16} className="mt-xs shrink-0 text-text-secondary" />
          <p className="text-label-sm text-text-secondary">
            {target.kind === 'listing' ? (
              <>
                Reporting <span className="text-text-primary">{target.name}</span>. The seller won&rsquo;t know
                who reported it.
              </>
            ) : (
              <>
                {target.name} won&rsquo;t be notified. Our team reviews every report within 24 hours.
              </>
            )}
          </p>
        </div>
        <div className="flex flex-col gap-md">
          <p id="report-reason-label" className="text-label font-semibold text-text-primary">
            What&rsquo;s wrong?
          </p>
          <div role="group" aria-labelledby="report-reason-label">
            <RadioGroup name="report-reason" options={REASONS[target.kind].map((value) => ({ value, label: value }))} value={reason} onChange={setReason} disabled={pending} />
          </div>
        </div>
        <TextareaField
          label="Details (optional)"
          placeholder="Anything that helps us review faster"
          rows={3}
          maxLength={300}
          value={details}
          onChange={setDetails}
          disabled={pending}
          description={`${details.length}/300`}
        />
      </div>
    </Modal>
  )
}
