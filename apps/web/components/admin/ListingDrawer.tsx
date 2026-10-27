import { Button } from '@figma/astraui'
import { Ban, PackageX, UserRound } from 'lucide-react'
import { useState } from 'react'
import { campusLabel, priceLabel, timeAgo } from '@tipalit/services/seed'
import type { Listing, MemberSummary } from '@tipalit/services/types'
import InlineAlert from '../InlineAlert'
import Spinner from '../Spinner'
import { isModerated, listingStatusOf, TRANSACTION_LABEL } from './listingLabels'
import SlideOver from './SlideOver'
import Badge from '../Badge'

type ListingDrawerProps = {
  listing: Listing
  seller?: MemberSummary
  openReports: number
  onClose: () => void
  onRemove: () => Promise<boolean>
  onViewSeller?: () => void
}

function Fact({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex flex-col gap-xs rounded-xl border border-border-secondary/80 bg-surface-bg p-md shadow-xs">
      <span className="text-caption-sm text-text-secondary">{label}</span>
      <span className="text-cell-strong font-semibold text-text-primary">{value}</span>
    </div>
  )
}

export default function ListingDrawer({
  listing,
  seller,
  openReports,
  onClose,
  onRemove,
  onViewSeller,
}: ListingDrawerProps) {
  const [confirming, setConfirming] = useState(false)
  const [pending, setPending] = useState(false)
  const status = listingStatusOf(listing)
  const removed = isModerated(listing)

  const remove = async () => {
    if (pending) return
    setPending(true)
    const done = await onRemove()
    if (!done) setPending(false)
  }

  return (
    <SlideOver
      isOpen
      onClose={pending ? () => undefined : onClose}
      title={listing.title}
      subtitle={`${listing.category} · ${campusLabel(listing.campus)}`}
      footer={
        removed ? (
          <p className="text-caption-sm text-text-secondary">This listing has already been taken down.</p>
        ) : confirming ? (
          <div className="flex items-center justify-between gap-md">
            <p className="text-caption-sm text-text-secondary">Remove it from the feed for good?</p>
            <div className="flex gap-md">
              <Button variant="subtle" onClick={() => setConfirming(false)} disabled={pending}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={remove}
                disabled={pending}
                aria-busy={pending || undefined}
                iconStart={pending ? <Spinner /> : <PackageX size={16} />}
                className="border-danger bg-danger text-on-brand hover:border-danger hover:bg-danger/90"
              >
                {pending ? 'Removing…' : 'Remove listing'}
              </Button>
            </div>
          </div>
        ) : (
          <div className="flex items-center justify-end gap-md">
            <Button
              variant="neutral"
              iconStart={<PackageX size={16} />}
              onClick={() => setConfirming(true)}
              className="text-danger"
            >
              Take down
            </Button>
          </div>
        )
      }
    >
      <div className="flex flex-col gap-xl">
        <div className="grid grid-cols-2 gap-sm">
          {listing.imageUrls.slice(0, 4).map((url, index) => (
            <img
              key={`${url}-${index}`}
              src={url}
              alt={index === 0 ? `${listing.title} photo` : ''}
              className="aspect-square w-full rounded-2xl border border-border-secondary/60 bg-bg-subtle object-cover shadow-2xs"
            />
          ))}
        </div>

        <div className="flex items-center justify-between gap-md">
          <span className="text-metric text-text-primary tabular-nums">{priceLabel(listing)}</span>
          <div className="flex gap-sm">
            <Badge variant={status.variant} label={status.label} />
            <Badge variant="default" label={TRANSACTION_LABEL[listing.transactionType]} />
          </div>
        </div>

        <div className="grid grid-cols-3 gap-md">
          <Fact label="Condition" value={listing.condition} />
          <Fact label="Course" value={listing.courseCode || '—'} />
          <Fact label="Department" value={listing.department} />
        </div>

        <section aria-label="Description" className="flex flex-col gap-xs">
          <p className="text-cell-strong text-text-primary">Description</p>
          <p className="whitespace-pre-wrap text-cell text-text-secondary">{listing.description}</p>
        </section>

        <section aria-label="Seller" className="flex flex-col gap-md rounded-corner-md border border-border-secondary p-lg">
          <div className="flex items-center gap-md">
            <span
              aria-hidden="true"
              className="flex size-9 shrink-0 items-center justify-center rounded-corner-full bg-bg-subtle text-text-secondary"
            >
              <UserRound size={16} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="truncate text-cell-strong text-text-primary">{seller?.name ?? 'Unknown member'}</p>
              <p className="truncate text-caption-sm text-text-secondary">
                {seller?.email || 'No email on file'}
                {seller?.campus ? ` · ${campusLabel(seller.campus)}` : ''}
              </p>
            </div>
            {seller?.status === 'suspended' && <Badge variant="danger" label="Suspended" />}
          </div>
          <div className="flex flex-wrap items-center gap-md">
            {seller && (
              <span className="text-caption-sm text-text-secondary">
                {seller.activeListings} active listings · {seller.openReports} open reports
              </span>
            )}
            {onViewSeller && (
              <Button variant="subtle" size="small" onClick={onViewSeller} className="ml-auto">
                View member
              </Button>
            )}
          </div>
        </section>

        <div className="grid grid-cols-2 gap-md">
          <Fact label="Meetup spot" value={listing.meetupSpot} />
          <Fact label="Posted" value={timeAgo(listing.createdAt)} />
        </div>

        {openReports > 0 && (
          <InlineAlert tone="info">
            {openReports} open {openReports === 1 ? 'report is' : 'reports are'} filed against this listing. Resolve
            them from the moderation queue.
          </InlineAlert>
        )}

        {seller?.status === 'suspended' && (
          <InlineAlert icon={Ban}>
            The seller is suspended, so this listing is already hidden from the feed.
          </InlineAlert>
        )}
      </div>
    </SlideOver>
  )
}
