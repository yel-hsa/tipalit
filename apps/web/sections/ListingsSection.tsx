import { Button } from '@figma/astraui'
import { Package } from 'lucide-react'
import { useMemo, useState } from 'react'
import { CATEGORY_LIST, campusLabel, priceLabel, timeAgo } from '@tipalit/services/seed'
import type { Listing, MemberSummary } from '@tipalit/services/types'
import DataTable, { type Column } from '../components/admin/DataTable'
import { isModerated, listingStatusOf, TRANSACTION_LABEL } from '../components/admin/listingLabels'
import Toolbar from '../components/admin/Toolbar'
import EmptyState from '../components/EmptyState'
import Badge from '../components/Badge'

type ListingsSectionProps = {
  listings: Listing[]
  members: MemberSummary[]
  onOpen: (listingId: string) => void
}

type StatusFilter = 'all' | 'active' | 'reserved' | 'sold' | 'removed'
type CampusFilter = 'all' | 'manila' | 'qc'

const STATUS_OPTIONS = [
  { value: 'all', label: 'All statuses' },
  { value: 'active', label: 'Active' },
  { value: 'reserved', label: 'Reserved' },
  { value: 'sold', label: 'Sold' },
  { value: 'removed', label: 'Removed' },
]

const CAMPUS_OPTIONS = [
  { value: 'all', label: 'Both campuses' },
  { value: 'manila', label: 'TIP Manila' },
  { value: 'qc', label: 'TIP Quezon City' },
]

const CATEGORY_OPTIONS = [
  { value: 'all', label: 'All categories' },
  ...CATEGORY_LIST.map((category) => ({ value: category, label: category })),
]

export default function ListingsSection({ listings, members, onOpen }: ListingsSectionProps) {
  const [query, setQuery] = useState('')
  const [status, setStatus] = useState<StatusFilter>('all')
  const [campus, setCampus] = useState<CampusFilter>('all')
  const [category, setCategory] = useState('all')

  const memberById = useMemo(() => new Map(members.map((member) => [member.userId, member])), [members])

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listings.filter((listing) => {
      if (status === 'removed' && !isModerated(listing)) return false
      if (status !== 'all' && status !== 'removed' && listing.status !== status) return false
      if (campus !== 'all' && listing.campus !== campus) return false
      if (category !== 'all' && listing.category !== category) return false
      if (!q) return true
      const seller = memberById.get(listing.sellerId)?.name ?? ''
      return `${listing.title} ${listing.courseCode} ${listing.category} ${seller}`.toLowerCase().includes(q)
    })
  }, [listings, status, campus, category, query, memberById])

  const filtersActive = status !== 'all' || campus !== 'all' || category !== 'all' || query.trim().length > 0
  const clearFilters = () => {
    setStatus('all')
    setCampus('all')
    setCategory('all')
    setQuery('')
  }

  const columns: Column<Listing>[] = [
    {
      id: 'listing',
      header: 'Listing',
      sortValue: (listing) => listing.title.toLowerCase(),
      render: (listing) => (
        <div className="flex items-center gap-md">
          <img
            src={listing.imageUrl}
            alt=""
            loading="lazy"
            className="size-10 shrink-0 rounded-corner-sm bg-bg-subtle object-cover"
          />
          <div className="min-w-0">
            <p className="truncate text-cell-strong text-text-primary">{listing.title}</p>
            <p className="truncate text-caption-sm text-text-tertiary">
              {listing.courseCode || 'No course code'} · {listing.condition}
            </p>
          </div>
        </div>
      ),
    },
    {
      id: 'seller',
      header: 'Seller',
      width: 'w-44',
      sortValue: (listing) => (memberById.get(listing.sellerId)?.name ?? '').toLowerCase(),
      render: (listing) => {
        const seller = memberById.get(listing.sellerId)
        return (
          <div className="min-w-0">
            <p className="truncate text-cell text-text-primary">{seller?.name ?? 'Unknown member'}</p>
            <p className="truncate text-caption-sm text-text-tertiary">
              {seller?.status === 'suspended' ? 'Suspended' : seller?.email || '—'}
            </p>
          </div>
        )
      },
    },
    {
      id: 'campus',
      header: 'Campus',
      width: 'w-36',
      sortValue: (listing) => campusLabel(listing.campus),
      render: (listing) => (
        <div className="min-w-0">
          <p className="truncate text-cell text-text-primary">{campusLabel(listing.campus)}</p>
          <p className="truncate text-caption-sm text-text-tertiary">{listing.category}</p>
        </div>
      ),
    },
    {
      id: 'price',
      header: 'Price',
      width: 'w-28',
      align: 'right',
      sortValue: (listing) => listing.price ?? 0,
      render: (listing) => (
        <div className="flex flex-col items-end">
          <span className="text-cell-strong text-text-primary tabular-nums">{priceLabel(listing)}</span>
          <span className="text-caption-sm text-text-tertiary">{TRANSACTION_LABEL[listing.transactionType]}</span>
        </div>
      ),
    },
    {
      id: 'status',
      header: 'Status',
      width: 'w-28',
      sortValue: (listing) => listingStatusOf(listing).label,
      render: (listing) => {
        const badge = listingStatusOf(listing)
        return <Badge variant={badge.variant} label={badge.label} />
      },
    },
    {
      id: 'posted',
      header: 'Posted',
      width: 'w-28',
      sortValue: (listing) => new Date(listing.createdAt).getTime(),
      render: (listing) => <span className="text-cell text-text-secondary">{timeAgo(listing.createdAt)}</span>,
    },
  ]

  return (
    <div className="flex flex-col gap-lg">
      <Toolbar
        query={query}
        onQueryChange={setQuery}
        searchLabel="Search listings"
        placeholder="Search by title, course code, or seller"
        filters={[
          { label: 'Status', value: status, options: STATUS_OPTIONS, onChange: (value) => setStatus(value as StatusFilter) },
          { label: 'Campus', value: campus, options: CAMPUS_OPTIONS, onChange: (value) => setCampus(value as CampusFilter) },
          { label: 'Category', value: category, options: CATEGORY_OPTIONS, onChange: setCategory },
        ]}
      >
        {rows.length} of {listings.length} listings
      </Toolbar>

      <DataTable
        label="Listings"
        columns={columns}
        rows={rows}
        rowKey={(listing) => listing.id}
        onRowClick={(listing) => onOpen(listing.id)}
        rowLabel={(listing) => `Inspect ${listing.title}`}
        rowMuted={(listing) => isModerated(listing) || listing.status === 'sold'}
        pageSize={25}
        initialSort={{ id: 'posted', direction: 'desc' }}
        empty={
          <EmptyState
            icon={Package}
            title={filtersActive ? 'No listings match' : 'No listings yet'}
            body={
              filtersActive
                ? 'No listing matches the current search and filters.'
                : 'Listings appear here as students post items for sale.'
            }
            action={
              filtersActive ? (
                <Button variant="neutral" size="small" onClick={clearFilters}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        }
      />
    </div>
  )
}
