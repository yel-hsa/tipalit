import { Button, Modal } from '@figma/astraui'
import { useRef, type ReactNode } from 'react'
import Spinner from './Spinner'
import useDialogFocus from './useDialogFocus'

type ConfirmModalProps = {
  isOpen: boolean
  title: string
  body: ReactNode
  confirmLabel: string
  cancelLabel?: string
  confirmIcon?: ReactNode
  pending?: boolean
  onConfirm: () => void
  onClose: () => void
}

export default function ConfirmModal({
  isOpen,
  title,
  body,
  confirmLabel,
  cancelLabel = 'Cancel',
  confirmIcon,
  pending,
  onConfirm,
  onClose,
}: ConfirmModalProps) {
  const bodyRef = useRef<HTMLDivElement>(null)
  useDialogFocus(isOpen, bodyRef)

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
            {cancelLabel}
          </Button>
          <Button
            variant="primary"
            onClick={onConfirm}
            disabled={pending}
            aria-busy={pending || undefined}
            iconStart={pending ? <Spinner /> : confirmIcon}
            className="touch-hit"
          >
            {confirmLabel}
          </Button>
        </>
      }
    >
      <div ref={bodyRef} className="text-label-sm text-text-secondary">
        {body}
      </div>
    </Modal>
  )
}
