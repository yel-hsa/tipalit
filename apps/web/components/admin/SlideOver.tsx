import { IconButton } from '@figma/astraui'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import useDialogFocus from '../useDialogFocus'
import useOverlayExit from '../useOverlayExit'

type SlideOverProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

const EXIT_MS = 200

// docks right at full height; the header and footer stay put while the body scrolls
export default function SlideOver({ isOpen, onClose, title, subtitle, children, footer }: SlideOverProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  const titleId = useId()
  const { closing, requestClose } = useOverlayExit(isOpen, onClose, EXIT_MS)

  useDialogFocus(isOpen, bodyRef, { onClose: requestClose })

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
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-modal-scrim ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={requestClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`relative flex h-full w-full max-w-drawer flex-col border-l border-border-secondary/80 bg-surface-bg shadow-2xl ${
          closing ? 'animate-drawer-out' : 'animate-drawer-in'
        }`}
      >
        <div className="flex shrink-0 items-start justify-between gap-lg border-b border-border-secondary/80 bg-surface-bg/95 backdrop-blur-sm px-2xl py-xl">
          <div className="min-w-0">
            <p id={titleId} role="heading" aria-level={2} className="truncate text-section font-semibold text-text-primary">
              {title}
            </p>
            {subtitle && <p className="mt-xs truncate text-cell text-text-secondary">{subtitle}</p>}
          </div>
          <IconButton
            variant="subtle"
            size="small"
            icon={<X size={16} />}
            aria-label="Close panel"
            onClick={requestClose}
            className="shrink-0"
          />
        </div>
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-2xl py-xl">
          {children}
        </div>
        {footer && (
          <div className="shrink-0 border-t border-border-secondary/80 bg-surface-bg px-2xl py-lg">{footer}</div>
        )}
      </div>
    </div>
  )
}
