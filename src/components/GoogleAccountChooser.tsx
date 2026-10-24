import { Avatar, Button, InputField } from '@figma/astraui'
import { ChevronRight, Info, UserPlus } from 'lucide-react'
import { useState, type FormEvent } from 'react'
import { initialsOf } from '../services/profile'
import type { GoogleAccount } from '../services/types'
import BottomSheet from './BottomSheet'
import FormField, { errorIdFor } from './FormField'
import Pressable from './Pressable'

type GoogleAccountChooserProps = {
  isOpen: boolean
  accounts: GoogleAccount[]
  onSelect: (account: GoogleAccount) => void
  onClose: () => void
}

const EMAIL_FORMAT = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Mock stand-in for Google's account picker. It never talks to Google.
export default function GoogleAccountChooser({ isOpen, accounts, onSelect, onClose }: GoogleAccountChooserProps) {
  const [adding, setAdding] = useState(false)
  const [name, setName] = useState('')
  const [email, setEmail] = useState('')
  const [error, setError] = useState<string | null>(null)

  const submitOther = (event: FormEvent) => {
    event.preventDefault()
    const value = email.trim()
    if (!EMAIL_FORMAT.test(value)) {
      setError('Enter a valid email address.')
      return
    }
    onSelect({ name: name.trim(), email: value })
  }

  return (
    <BottomSheet
      isOpen={isOpen}
      onClose={onClose}
      title="Choose an account"
      subtitle="to continue to TIPalit"
      footer={
        <p className="flex items-center justify-center gap-xs text-caption-sm text-text-secondary">
          <Info size={12} aria-hidden="true" />
          Demo sign-in &middot; no Google data is used
        </p>
      }
    >
      <ul className="-mx-xl flex flex-col border-y border-border-secondary">
        {accounts.map((account) => (
          <li key={account.email} className="border-b border-border-secondary last:border-b-0">
            <Pressable
              onPress={() => onSelect(account)}
              aria-label={`${account.name}, ${account.email}`}
              className="flex min-h-touch items-center gap-lg px-xl py-lg hover:bg-surface-hover"
            >
              <Avatar type="initial" initials={initialsOf(account.name)} size="medium" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-label text-text-primary">{account.name}</p>
                <p className="truncate text-label-sm text-text-secondary">{account.email}</p>
              </div>
              <ChevronRight size={16} className="shrink-0 text-text-secondary" aria-hidden="true" />
            </Pressable>
          </li>
        ))}
        <li>
          <Pressable
            onPress={() => setAdding((open) => !open)}
            aria-expanded={adding}
            className="flex min-h-touch items-center gap-lg px-xl py-lg hover:bg-surface-hover"
          >
            <span className="flex size-8 shrink-0 items-center justify-center rounded-corner-full bg-bg-subtle text-text-primary">
              <UserPlus size={16} aria-hidden="true" />
            </span>
            <p className="flex-1 text-label text-text-primary">Use another account</p>
          </Pressable>
        </li>
      </ul>

      {adding && (
        <form noValidate onSubmit={submitOther} className="flex animate-fade-in flex-col gap-lg pt-xl">
          <InputField label="Name" placeholder="Juan Dela Cruz" autoComplete="name" value={name} onChange={setName} />
          <FormField id="chooser-email" error={error ?? undefined}>
            <InputField
              label="Email"
              type="email"
              inputMode="email"
              autoComplete="email"
              placeholder="you@tip.edu.ph"
              value={email}
              aria-invalid={error ? true : undefined}
              aria-describedby={error ? errorIdFor('chooser-email') : undefined}
              onChange={(value) => {
                setEmail(value)
                if (error) setError(null)
              }}
            />
          </FormField>
          <Button type="submit" variant="primary" className="w-full touch-hit">
            Continue
          </Button>
        </form>
      )}
    </BottomSheet>
  )
}
