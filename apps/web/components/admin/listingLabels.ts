import type { Listing, ListingStatus } from '@tipalit/services/types'

type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'secondary'

export const LISTING_STATUS: Record<ListingStatus, { label: string; variant: BadgeVariant }> = {
  active: { label: 'Active', variant: 'brand' },
  reserved: { label: 'Reserved', variant: 'warning' },
  sold: { label: 'Sold', variant: 'default' },
}

// the firebase adapter can surface moderated docs that the client type doesn't model
export const listingStatusOf = (listing: Listing): { label: string; variant: BadgeVariant } =>
  LISTING_STATUS[listing.status] ?? { label: 'Removed', variant: 'danger' }

export const TRANSACTION_LABEL: Record<Listing['transactionType'], string> = {
  sale: 'For sale',
  free: 'Free',
  trade: 'Trade',
}

export const isModerated = (listing: Listing) =>
  !['active', 'reserved', 'sold'].includes(listing.status as string)
