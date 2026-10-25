import { Avatar, Button, Modal } from '@figma/astraui'
import { LogOut, Moon, ShieldCheck, Sun } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'
import { initialsOf } from '@tipalit/services/profile'
import type { Session, Theme } from '@tipalit/services/types'

type AccountMenuProps = {
  session: Session
  theme: Theme
  onToggleTheme: () => void
  onSignOut: () => void
  expiresAt: number | null
}

const timeOf = (value: number) =>
  new Date(value).toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })

export default function AccountMenu({ session, theme, onToggleTheme, onSignOut, expiresAt }: AccountMenuProps) {
  const [open, setOpen] = useState(false)
  const [confirming, setConfirming] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuId = useId()

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false)
        triggerRef.current?.focus()
      }
    }
    document.addEventListener('pointerdown', onPointerDown)
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown)
      document.removeEventListener('keydown', onKeyDown)
    }
  }, [open])

  const close = () => {
    setOpen(false)
    triggerRef.current?.focus()
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={triggerRef}
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? menuId : undefined}
        onClick={() => setOpen((value) => !value)}
        className="flex w-full items-center gap-md rounded-corner-md p-sm text-left transition-colors hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
      >
        <Avatar type="initial" initials={initialsOf(session.name)} size="medium" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-cell-strong text-text-primary">{session.name}</span>
          <span className="block truncate text-caption-sm text-text-secondary">{session.email}</span>
        </span>
        <span className="shrink-0 text-text-secondary" aria-hidden="true">
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M4 6l4 4 4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label="Account"
          className="absolute bottom-full left-0 z-40 mb-sm w-full min-w-56 rounded-corner-md border border-border-primary bg-surface-bg p-xs shadow-lg"
        >
          <div className="flex items-center gap-sm px-sm py-xs text-caption-sm text-text-secondary">
            <ShieldCheck size={14} className="shrink-0 text-success" aria-hidden="true" />
            <span className="truncate">Staff access</span>
            {expiresAt && <span className="ml-auto shrink-0">until {timeOf(expiresAt)}</span>}
          </div>
          <div className="my-xs h-px bg-border-secondary" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              onToggleTheme()
              close()
            }}
            className="flex w-full items-center gap-md rounded-corner-sm px-sm py-sm text-left text-cell text-text-primary hover:bg-bg-hover focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            {theme === 'dark' ? <Sun size={16} aria-hidden="true" /> : <Moon size={16} aria-hidden="true" />}
            {theme === 'dark' ? 'Light theme' : 'Dark theme'}
          </button>
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              setConfirming(true)
            }}
            className="flex w-full items-center gap-md rounded-corner-sm px-sm py-sm text-left text-cell text-danger hover:bg-danger-soft focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <LogOut size={16} aria-hidden="true" />
            Sign out
          </button>
        </div>
      )}

      <Modal
        isOpen={confirming}
        onClose={() => setConfirming(false)}
        title="Sign out of the admin console?"
        size="small"
        footer={
          <div className="flex justify-end gap-sm">
            <Button variant="subtle" onClick={() => setConfirming(false)}>
              Stay signed in
            </Button>
            <Button
              variant="primary"
              className="border-danger bg-danger text-white hover:border-danger hover:bg-danger/90 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-danger"
              onClick={() => {
                setConfirming(false)
                onSignOut()
              }}
            >
              Sign out
            </Button>
          </div>
        }
      >
        <p className="text-cell text-text-secondary">
          You&rsquo;ll need to sign in with your @tip.edu.ph staff account again to moderate listings.
        </p>
      </Modal>
    </div>
  )
}
