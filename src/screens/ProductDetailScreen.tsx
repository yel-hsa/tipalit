import { Badge, Button, IconButton } from '@figma/astraui'
import { ArrowLeft, CheckCircle2, Clock, Flag, MessageCircle, Pencil, RotateCcw, Share2, Trash2 } from 'lucide-react'
import { useState } from 'react'
import ConfirmModal from '../components/ConfirmModal'
import MeetupLocationBlock from '../components/MeetupLocationBlock'
import { OVERLAY_CONTROL } from '../components/overlayControl'
import SellerTrustCard from '../components/SellerTrustCard'
import { CONDITION_BADGE, STATUS_BADGE, priceLabel, timeAgo } from '../data/seed'
import type { Listing, ListingStatus, Seller } from '../services/types'

type ProductDetailScreenProps = {
  listing: Listing
  seller: Seller
  isOwn: boolean
  campusLabel: string
  onBack: () => void
  onMessage: () => void
  onShare: () => void
  onReport: () => void
  onEdit: () => void
  /** Owner status control; 'active' resets the listing to the feed. */
  onSetStatus: (status: ListingStatus) => void
  onDelete: () => void
}

export default function ProductDetailScreen({
  listing,
  seller,
  isOwn,
  campusLabel,
  onBack,
  onMessage,
  onShare,
  onReport,
  onEdit,
  onSetStatus,
  onDelete,
}: ProductDetailScreenProps) {
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)

  const photos = listing.imageUrls.length > 0 ? listing.imageUrls : [listing.imageUrl]
  const current = Math.min(photoIndex, photos.length - 1)
  const sold = listing.status === 'sold'
  const reserved = listing.status === 'reserved'
  const unavailable = sold || reserved

  return (
    <div className="flex flex-1 flex-col">
      <div className="relative aspect-square bg-bg-subtle">
        <img
          src={photos[current]}
          alt={listing.title}
          className={`size-full object-cover ${unavailable ? 'opacity-60 grayscale' : ''}`}
        />
        {photos.length > 1 && (
          <>
            <div className="absolute inset-x-0 bottom-0 flex justify-center gap-xs pb-md">
              {photos.map((photo, index) => (
                <button
                  key={photo}
                  type="button"
                  aria-label={`Photo ${index + 1} of ${photos.length}`}
                  aria-current={index === current || undefined}
                  onClick={() => setPhotoIndex(index)}
                  className={`size-2xs rounded-corner-full ${
                    index === current ? 'bg-surface-bg' : 'bg-surface-bg/40'
                  }`}
                />
              ))}
            </div>
            <div className="absolute inset-x-0 top-2xl flex justify-between px-md">
              <IconButton
                variant="subtle"
                icon={<ArrowLeft size={16} className="rotate-180" />}
                aria-label="Previous photo"
                disabled={current === 0}
                onClick={() => setPhotoIndex((index) => Math.max(0, index - 1))}
                className={OVERLAY_CONTROL}
              />
              <IconButton
                variant="subtle"
                icon={<ArrowLeft size={16} />}
                aria-label="Next photo"
                disabled={current === photos.length - 1}
                onClick={() => setPhotoIndex((index) => Math.min(photos.length - 1, index + 1))}
                className={OVERLAY_CONTROL}
              />
            </div>
          </>
        )}
        <div className="absolute inset-x-0 top-0 flex justify-between p-lg">
          <IconButton
            variant="subtle"
            icon={<ArrowLeft size={18} />}
            aria-label="Back"
            onClick={onBack}
            className={OVERLAY_CONTROL}
          />
          <div className="flex gap-md">
            {isOwn ? (
              <IconButton
                variant="subtle"
                icon={<Trash2 size={18} />}
                aria-label="Delete listing"
                onClick={() => setConfirmDelete(true)}
                className={OVERLAY_CONTROL}
              />
            ) : (
              <IconButton
                variant="subtle"
                icon={<Flag size={18} />}
                aria-label="Report listing"
                onClick={onReport}
                className={OVERLAY_CONTROL}
              />
            )}
            <IconButton
              variant="subtle"
              icon={<Share2 size={18} />}
              aria-label="Share listing"
              onClick={onShare}
              className={OVERLAY_CONTROL}
            />
          </div>
        </div>
      </div>

      <div className="relative -mt-2xl flex flex-col gap-xl px-xl pb-xl">
        <section className="flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl">
          <div className="flex flex-wrap gap-sm">
            {(() => {
              const statusBadge = STATUS_BADGE[listing.status]
              return statusBadge ? <Badge variant={statusBadge.variant} label={statusBadge.label} /> : null
            })()}
            <Badge variant={CONDITION_BADGE[listing.condition]} label={listing.condition} />
            <Badge variant="brand" label={listing.courseCode} />
            <Badge variant="default" label={listing.category} />
          </div>
          <div className="flex flex-col gap-xs">
            <p role="heading" aria-level={1} className="text-heading text-text-primary">
              {listing.title}
            </p>
            <p className={`text-title ${unavailable ? 'text-text-secondary line-through' : 'text-text-primary'}`}>
              {priceLabel(listing)}
            </p>
            <p className="flex items-center gap-xs text-caption-sm text-text-secondary">
              <Clock size={12} aria-hidden="true" />
              Posted {timeAgo(listing.createdAt)} &middot; {listing.department}
            </p>
          </div>
          <div className="flex flex-col gap-xs">
            <p className="text-label font-semibold text-text-primary">Description</p>
            <p className="text-label-sm text-text-secondary">{listing.description}</p>
          </div>
        </section>

        <SellerTrustCard seller={seller} />
        <MeetupLocationBlock spot={listing.meetupSpot} campusLabel={campusLabel} />
      </div>

      <div className="sticky bottom-0 z-20 mt-auto border-t border-border-secondary bg-surface-bg p-lg">
        {isOwn ? (
          <div className="grid grid-cols-2 gap-md">
            <Button variant="neutral" iconStart={<Pencil size={16} />} onClick={onEdit} className="w-full touch-hit">
              Edit
            </Button>
            {listing.status === 'reserved' ? (
              <Button
                variant="primary"
                iconStart={<RotateCcw size={16} />}
                onClick={() => onSetStatus('active')}
                className="w-full touch-hit"
              >
                Mark as available
              </Button>
            ) : (
              <Button
                variant="primary"
                iconStart={sold ? <RotateCcw size={16} /> : <CheckCircle2 size={16} />}
                onClick={() => onSetStatus(sold ? 'active' : 'sold')}
                className="w-full touch-hit"
              >
                {sold ? 'Mark as available' : 'Mark as sold'}
              </Button>
            )}
          </div>
        ) : unavailable ? (
          <Button variant="neutral" disabled className="w-full">
            {sold ? 'No longer available' : 'Reserved by another student'}
          </Button>
        ) : (
          <Button
            variant="primary"
            iconStart={<MessageCircle size={16} />}
            onClick={onMessage}
            className="w-full touch-hit"
          >
            Message Seller
          </Button>
        )}
      </div>

      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete this listing?"
        body={
          <>
            <span className="text-text-primary">{listing.title}</span> will be removed from the feed and your
            profile. Chats about it stay, marked &ldquo;Listing removed&rdquo;.
          </>
        }
        confirmLabel="Delete listing"
        confirmIcon={<Trash2 size={16} />}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          onDelete()
        }}
      />
    </div>
  )
}
