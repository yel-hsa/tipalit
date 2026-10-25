import { IconButton } from '@figma/astraui'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import useDialogFocus from '../useDialogFocus'

type SlideOverProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

// docks right at full height; the header and footer stay put while the body scrolls
export default function SlideOver({ isOpen, onClose, title, subtitle, children, footer }: SlideOverProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  useDialogFocus(isOpen, bodyRef, { onClose })

  useEffect(() => {
    if (!isOpen) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen])

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 flex justify-end">
      <div aria-hidden="true" className="absolute inset-0 animate-fade-in bg-modal-scrim" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex h-full w-full max-w-drawer animate-drawer-in flex-col border-l border-border-primary bg-surface-bg shadow-raised"
      >
        <div className="flex shrink-0 items-start justify-between gap-lg border-b border-border-secondary px-2xl py-xl">
          <div className="min-w-0">
            <p id={titleId} role="heading" aria-level={2} className="truncate text-section text-text-primary">
              {title}
            </p>
            {subtitle && <p className="mt-xs truncate text-cell text-text-secondary">{subtitle}</p>}
          </div>
          <IconButton
            variant="subtle"
            size="small"
            icon={<X size={16} />}
            aria-label="Close panel"
            onClick={onClose}
            className="shrink-0"
          />
        </div>
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-2xl py-xl">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border-secondary bg-surface-bg px-2xl py-lg">{footer}</div>
        )}
      </div>
    </div>
  )
}
