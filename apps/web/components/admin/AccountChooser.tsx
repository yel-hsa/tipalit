import { Avatar, Button } from '@figma/astraui'
import { ShieldCheck } from 'lucide-react'
import { useId, useRef } from 'react'
import { initialsOf } from '@tipalit/services/profile'
import { ADMIN_EMAILS } from '@tipalit/services/seed'
import type { GoogleAccount } from '@tipalit/services/types'
import useDialogFocus from '../useDialogFocus'

type AccountChooserProps = {
  accounts: GoogleAccount[]
  onPick: (account: GoogleAccount) => void
  onCancel: () => void
}

// stands in for Google's account chooser when the mock adapter is active
export default function AccountChooser({ accounts, onPick, onCancel }: AccountChooserProps) {
  const titleId = useId()
  const bodyRef = useRef<HTMLDivElement>(null)
  useDialogFocus(true, bodyRef, { onClose: onCancel })

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 px-xl">
      <div
        ref={bodyRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="w-full max-w-[24rem] rounded-corner-lg border border-border-primary bg-surface-bg p-xl shadow-lg"
      >
        <h2 id={titleId} className="text-section text-text-primary">
          Choose an account
        </h2>
        <p className="mt-xs text-cell text-text-secondary">to continue to TIPalit Admin Console</p>

        <ul className="mt-lg flex flex-col gap-xs">
          {accounts.map((account) => (
            <li key={account.email}>
              <button
                type="button"
                onClick={() => onPick(account)}
                className="flex w-full items-center gap-md rounded-corner-md p-md text-left hover:bg-bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary"
              >
                <Avatar type="initial" initials={initialsOf(account.name)} size="medium" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-cell-strong text-text-primary">{account.name}</span>
                  <span className="block truncate text-caption-sm text-text-secondary">{account.email}</span>
                </span>
                {ADMIN_EMAILS.includes(account.email) && (
                  <ShieldCheck size={16} className="shrink-0 text-success" aria-label="Staff account" />
                )}
              </button>
            </li>
          ))}
        </ul>

        <div className="mt-lg flex justify-end">
          <Button variant="subtle" onClick={onCancel}>
            Cancel
          </Button>
        </div>
      </div>
    </div>
  )
}
