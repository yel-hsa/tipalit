import { Badge } from '@figma/astraui'
import { MapPin } from 'lucide-react'
import { isFresh, priceLabel, timeAgo } from '../data/seed'
import type { Listing } from '../services/types'
import Pressable from './Pressable'

type ProductCardProps = {
  listing: Listing
  onOpen: () => void
}

export default function ProductCard({ listing, onOpen }: ProductCardProps) {
  const reserved = listing.status === 'reserved'
  return (
    <Pressable
      onPress={onOpen}
      aria-label={`${listing.title}, ${priceLabel(listing)}${reserved ? ', reserved' : ''}`}
      className="group flex flex-col overflow-hidden rounded-corner-lg bg-surface-bg"
    >
      <div className="relative aspect-square overflow-hidden bg-bg-subtle">
        <img
          src={listing.imageUrl}
          alt={listing.title}
          loading="lazy"
          className={`size-full object-cover transition-transform duration-300 group-hover:scale-105 ${
            reserved ? 'opacity-70 grayscale' : ''
          }`}
        />
        <span className="absolute bottom-md left-md rounded-corner-full bg-accent px-md py-xs text-label-sm font-semibold text-on-accent">
          {priceLabel(listing)}
        </span>
        {reserved && (
          <span className="absolute left-1/2 top-md -translate-x-1/2 rounded-corner-full bg-surface-bg px-md py-xs text-caption-sm font-semibold text-text-primary">
            Reserved
          </span>
        )}
        {isFresh(listing.createdAt) && !reserved && (
          <span className="absolute right-md top-md rounded-corner-full bg-surface-bg px-sm py-xs text-caption-sm text-text-primary">
            New
          </span>
        )}
      </div>
      <div className="flex flex-1 flex-col gap-sm p-lg">
        <span className="text-label-sm text-text-primary line-clamp-2">{listing.title}</span>
        <span className="flex items-center gap-xs text-caption-sm text-text-secondary">
          <MapPin size={12} className="shrink-0" />
          <span className="truncate">{listing.meetupSpot}</span>
        </span>
        <div className="mt-auto flex items-center justify-between gap-xs pt-xs">
          <Badge variant="default" label={listing.courseCode} />
          <span className="truncate text-caption-sm text-text-tertiary">{timeAgo(listing.createdAt)}</span>
        </div>
      </div>
    </Pressable>
  )
}
