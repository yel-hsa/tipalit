import { IconButton } from '@figma/astraui'
import { X } from 'lucide-react'
import { useEffect, useId, useRef, type ReactNode } from 'react'
import useDialogFocus from './useDialogFocus'
import useOverlayExit from './useOverlayExit'

type BottomSheetProps = {
  isOpen: boolean
  onClose: () => void
  title: string
  subtitle?: string
  children: ReactNode
  footer?: ReactNode
}

const EXIT_MS = 180

// kit has no sheet; reuses modal scrim and surface tokens, docked to the frame bottom
export default function BottomSheet({ isOpen, onClose, title, subtitle, children, footer }: BottomSheetProps) {
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
    <div className="fixed inset-0 z-50 flex justify-center">
      <div
        aria-hidden="true"
        className={`absolute inset-0 bg-modal-scrim ${closing ? 'animate-fade-out' : 'animate-fade-in'}`}
        onClick={requestClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className={`absolute bottom-0 flex max-h-[var(--sheet-max-height)] w-full max-w-phone flex-col rounded-t-corner-lg bg-surface-bg shadow-raised ${
          closing ? 'animate-sheet-out' : 'animate-sheet-in'
        }`}
      >
        <div aria-hidden="true" className="flex justify-center pt-md">
          <span className="h-1 w-10 rounded-corner-full bg-border-primary" />
        </div>
        <div className="flex items-center justify-between gap-md px-xl pb-lg pt-md">
          <div className="min-w-0">
            <p id={titleId} role="heading" aria-level={2} className="text-heading text-text-primary">
              {title}
            </p>
            {subtitle && <p className="mt-xs text-label-sm text-text-secondary">{subtitle}</p>}
          </div>
          <IconButton
            variant="subtle"
            size="small"
            icon={<X size={16} />}
            aria-label="Close"
            onClick={requestClose}
            className="touch-hit"
          />
        </div>
        <div ref={bodyRef} className="flex-1 overflow-y-auto px-xl pb-lg">
          {children}
        </div>
        {footer && <div className="border-t border-border-secondary px-xl pb-xl pt-lg">{footer}</div>}
      </div>
    </div>
  )
}
