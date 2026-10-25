import { Avatar, Button, Modal, TextareaField } from '@figma/astraui'
import { useRef, useState } from 'react'
import type { Seller } from '@tipalit/services/types'
import Spinner from './Spinner'
import StarRating from './StarRating'
import useDialogFocus from './useDialogFocus'
import usePendingAction from './usePendingAction'

type RateModalProps = {
  isOpen: boolean
  onClose: () => void
  seller: Seller
  listingTitle?: string
  onSubmit: (rating: number, comment: string) => void
}

export default function RateModal({ isOpen, onClose, seller, listingTitle, onSubmit }: RateModalProps) {
  const [rating, setRating] = useState(0)
  const [comment, setComment] = useState('')
  const { pending, run } = usePendingAction()
  const bodyRef = useRef<HTMLDivElement>(null)
  useDialogFocus(isOpen, bodyRef, { canClose: () => !pending, onClose })

  return (
    <Modal
      isOpen={isOpen}
      onClose={pending ? () => undefined : onClose}
      title="Rate this meetup"
      size="small"
      className="w-[var(--modal-width)] shadow-raised"
      footer={
        <>
          <Button variant="subtle" onClick={onClose} disabled={pending} className="touch-hit">
            Skip
          </Button>
          <Button
            variant="primary"
            disabled={rating < 1 || pending}
            aria-busy={pending || undefined}
            iconStart={pending ? <Spinner /> : undefined}
            onClick={() => run(() => onSubmit(rating, comment.trim()), 600)}
            className="touch-hit"
          >
            {pending ? 'Submitting…' : 'Submit rating'}
          </Button>
        </>
      }
    >
      <div ref={bodyRef} className="flex flex-col gap-xl">
        <div className="flex flex-col items-center gap-sm text-center">
          <Avatar type="initial" initials={seller.initials} size="large" />
          <p className="text-label text-text-primary">How was meeting {seller.name.split(' ')[0]}?</p>
          {listingTitle && <p className="text-label-sm text-text-secondary">{listingTitle}</p>}
        </div>
        <StarRating value={rating} onChange={setRating} />
        <TextareaField
          label="Add a comment (optional)"
          placeholder="On time, item as described…"
          rows={3}
          maxLength={300}
          value={comment}
          onChange={setComment}
          disabled={pending}
        />
      </div>
    </Modal>
  )
}
