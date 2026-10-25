import type { ReactNode } from 'react'
import { useOpenDialogCount } from './useDialogFocus'

export type ToastOffset = 'tabs' | 'composer' | 'cta' | 'none'

type PhoneShellProps = {
  children: ReactNode
  tabBar?: ReactNode
  toast?: ReactNode
  /** Which bottom bar the toast should clear. */
  toastOffset?: ToastOffset
}

const OFFSET_CLASS: Record<ToastOffset, string> = {
  tabs: 'bottom-toast-tabs',
  composer: 'bottom-toast-composer',
  cta: 'bottom-toast-cta',
  none: 'bottom-xl',
}

export default function PhoneShell({ children, tabBar, toast, toastOffset = 'tabs' }: PhoneShellProps) {
  const dialogCount = useOpenDialogCount()
  const dialogOpen = dialogCount > 0

  return (
    <div className="min-h-dvh flex justify-center bg-surface-hover">
      <div className="relative w-full max-w-phone min-h-dvh flex flex-col bg-brand-tertiary sm:border-x sm:border-border-secondary">
        {/* Dialogs render inside <main>, so inert goes on the screen wrapper, not <main>. */}
        <main className="flex-1 flex flex-col">
          <div inert={dialogOpen} className="flex-1 flex flex-col">
            {children}
          </div>
        </main>
        <div inert={dialogOpen} className="contents">
          {tabBar}
        </div>
        {/* The live region stays mounted so screen readers announce each new toast. */}
        <div className={`fixed inset-x-0 ${OFFSET_CLASS[toastOffset]} z-40 flex justify-center pointer-events-none`}>
          <div role="status" aria-live="polite" className="w-full max-w-phone px-xl flex justify-center">
            {toast && <div className="rounded-corner-lg shadow-raised pointer-events-auto">{toast}</div>}
          </div>
        </div>
      </div>
    </div>
  )
}
