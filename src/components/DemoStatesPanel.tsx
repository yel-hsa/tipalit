import { Button, Modal } from '@figma/astraui'
import { FlaskConical, RotateCcw } from 'lucide-react'
import { useId, useRef } from 'react'
import type { DemoControls } from '../services/types'
import SwitchRow from './SwitchRow'
import useDialogFocus from './useDialogFocus'

// ui-only reviewer flags; the rest live in the mock adapter's controls
export type UiFlags = { emptyInbox: boolean; emptyInventory: boolean }
export const UI_FLAGS_OFF: UiFlags = { emptyInbox: false, emptyInventory: false }

export type ReviewerFlags = DemoControls & UiFlags
type BooleanFlag = { [K in keyof ReviewerFlags]: ReviewerFlags[K] extends boolean ? K : never }[keyof ReviewerFlags]

export type DemoLauncher =
  | 'feedLoading'
  | 'emptySearch'
  | 'domainError'
  | 'formValidation'
  | 'report'
  | 'rate'
  | 'picker'
  | 'replayIntro'
  | 'replayOnboarding'

const TOGGLES: { key: BooleanFlag; label: string; description: string }[] = [
  { key: 'slowNetwork', label: 'Slow network', description: 'Every request takes about 2 seconds, with skeletons on each visit.' },
  { key: 'failNextLoad', label: 'Fail next load', description: 'The next Feed, Chats, or Profile load errors. Retry succeeds.' },
  { key: 'failNextPublish', label: 'Fail next publish', description: 'The next "Post listing" or "Save changes" errors.' },
  { key: 'sellerDeclines', label: 'Seller declines meetups', description: 'Proposals come back declined.' },
  { key: 'emptyInbox', label: 'Empty inbox', description: 'Hide all chats to see the inbox empty state.' },
  { key: 'emptyInventory', label: 'Empty inventory', description: 'Hide your listings on Profile.' },
]

const GOOGLE_FAILURES: { id: DemoControls['googleFailure']; label: string }[] = [
  { id: 'none', label: 'None' },
  { id: 'network', label: 'Network' },
  { id: 'cancel', label: 'Cancel' },
]

const LAUNCHERS: { id: DemoLauncher; label: string }[] = [
  { id: 'feedLoading', label: 'Feed loading' },
  { id: 'emptySearch', label: 'Empty search' },
  { id: 'domainError', label: 'Domain error' },
  { id: 'formValidation', label: 'Form validation' },
  { id: 'report', label: 'Report modal' },
  { id: 'rate', label: 'Rate modal' },
  { id: 'picker', label: 'Meetup picker' },
  { id: 'replayIntro', label: 'Replay intro' },
  { id: 'replayOnboarding', label: 'Replay onboarding' },
]

type DemoStatesPanelProps = {
  isOpen: boolean
  onClose: () => void
  flags: ReviewerFlags
  // bumped on open and reset so every control starts from fresh state
  version: number
  onChange: <K extends keyof ReviewerFlags>(key: K, value: ReviewerFlags[K]) => void
  onLaunch: (launcher: DemoLauncher) => void
  onReset: () => void
}

export default function DemoStatesPanel({ isOpen, onClose, flags, version, onChange, onLaunch, onReset }: DemoStatesPanelProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const googleLabelId = useId()
  useDialogFocus(isOpen, bodyRef, { onClose })

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Reviewer tools"
      size="medium"
      className="w-[var(--modal-width)] shadow-raised"
      footer={
        <Button variant="subtle" iconStart={<RotateCcw size={16} />} onClick={onReset} className="mr-auto text-danger hover:text-danger touch-hit">
          Reset demo data
        </Button>
      }
    >
      <div ref={bodyRef} className="flex flex-col gap-2xl">
        <div className="flex items-start gap-md rounded-corner-md bg-accent-soft p-md">
          <FlaskConical size={16} className="mt-xs shrink-0 text-text-primary" />
          <p className="text-label-sm text-text-primary">
            Force states that are hard to reach in a normal session. Only visible in reviewer mode.
          </p>
        </div>

        <section aria-label="Toggles" className="flex flex-col gap-lg">
          <p className="text-label font-semibold text-text-primary">Toggles</p>
          {TOGGLES.map(({ key, label, description }) => (
            <SwitchRow
              key={`${key}-${version}`}
              label={label}
              description={description}
              checked={flags[key]}
              onChange={(value) => onChange(key, value)}
            />
          ))}
          <div className="flex flex-col gap-md">
            <p id={googleLabelId} className="text-label text-text-primary">
              Google sign-in failure
            </p>
            <div role="radiogroup" aria-labelledby={googleLabelId} className="grid grid-cols-3 gap-sm">
              {GOOGLE_FAILURES.map(({ id, label }) => (
                <Button
                  key={id}
                  size="small"
                  role="radio"
                  aria-checked={flags.googleFailure === id}
                  variant={flags.googleFailure === id ? 'primary' : 'neutral'}
                  onClick={() => onChange('googleFailure', id)}
                  className="touch-hit"
                >
                  {label}
                </Button>
              ))}
            </div>
          </div>
        </section>

        <section aria-label="Jump to a state" className="flex flex-col gap-lg">
          <p className="text-label font-semibold text-text-primary">Jump to a state</p>
          <div className="flex flex-wrap gap-sm">
            {LAUNCHERS.map(({ id, label }) => (
              <Button key={id} variant="neutral" size="small" onClick={() => onLaunch(id)} className="touch-hit">
                {label}
              </Button>
            ))}
          </div>
        </section>
      </div>
    </Modal>
  )
}
