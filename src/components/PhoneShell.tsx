import type { ReactNode } from 'react'

export type ToastOffset = 'tabs' | 'composer' | 'cta' | 'none'

type PhoneShellProps = {
  children: ReactNode
  /** Dialogs and sheets. Kept outside the inert wrapper so they stay interactive. */
  overlay?: ReactNode
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

export default function PhoneShell({ children, overlay, tabBar, toast, toastOffset = 'tabs' }: PhoneShellProps) {
  return (
    <div className="min-h-dvh flex justify-center bg-surface-hover">
      <div className="relative w-full max-w-phone min-h-dvh flex flex-col bg-brand-tertiary sm:border-x sm:border-border-secondary">
        <main className="flex-1 flex flex-col">
          <div className="flex-1 flex flex-col">{children}</div>
          {overlay}
        </main>
        {tabBar}
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
