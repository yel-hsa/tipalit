import { Avatar, Badge, Button, InputField } from '@figma/astraui'
import { CheckCircle2, MapPin, PlusCircle, Search, SearchX } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import CategoryPills from '../components/CategoryPills'
import EmptyState from '../components/EmptyState'
import LoadError from '../components/LoadError'
import ProductCard from '../components/ProductCard'
import Pressable from '../components/Pressable'
import Skeleton, { ProductCardSkeleton } from '../components/Skeleton'
import Spinner from '../components/Spinner'
import SponsorBanner from '../components/SponsorBanner'
import Wordmark from '../components/Wordmark'
import type { Listing, Promotion } from '../services/types'

type FeedScreenProps = {
  userName: string
  userInitials: string
  campusLabel: string
  listings: Listing[]
  // empty hides the sponsor slot
  promotions: Promotion[]
  loading: boolean
  error: boolean
  onRetry: () => void
  // demo hook: start with a search already typed
  initialQuery?: string
  onOpen: (listingId: string) => void
  onSell: () => void
  onOpenProfile: () => void
  onOpenPromotion: (promotion: Promotion) => void
}

const PAGE_SIZE = 6
const PAGE_DELAY_MS = 700

export default function FeedScreen({
  userName,
  userInitials,
  campusLabel,
  listings,
  promotions,
  loading,
  error,
  onRetry,
  initialQuery = '',
  onOpen,
  onSell,
  onOpenProfile,
  onOpenPromotion,
}: FeedScreenProps) {
  const [query, setQuery] = useState(initialQuery)
  const [category, setCategory] = useState('All')
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)
  const sentinelRef = useRef<HTMLDivElement>(null)

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return listings.filter((listing) => {
      const matchesPill =
        category === 'All' ||
        (category.endsWith('Dept')
          ? listing.department === category.replace(' Dept', '')
          : listing.category === category)
      const matchesQuery =
        !q ||
        [listing.title, listing.courseCode, listing.category, listing.description].some((field) =>
          field.toLowerCase().includes(q),
        )
      return matchesPill && matchesQuery
    })
  }, [listings, query, category])

  // a new search or filter restarts paging
  useEffect(() => {
    setVisibleCount(PAGE_SIZE)
    setLoadingMore(false)
  }, [query, category])

  const hasMore = visibleCount < results.length

  useEffect(() => {
    const sentinel = sentinelRef.current
    if (!sentinel || loading || loadingMore || !hasMore) return
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) setLoadingMore(true)
      },
      { rootMargin: '200px' },
    )
    observer.observe(sentinel)
    return () => observer.disconnect()
  }, [loading, loadingMore, hasMore])

  useEffect(() => {
    if (!loadingMore) return
    const timer = window.setTimeout(() => {
      setVisibleCount((count) => count + PAGE_SIZE)
      setLoadingMore(false)
    }, PAGE_DELAY_MS)
    return () => window.clearTimeout(timer)
  }, [loadingMore])

  const trimmedQuery = query.trim()
  const emptyTitle = trimmedQuery
    ? `No items found for \u201c${trimmedQuery}\u201d at ${campusLabel}`
    : `No ${category === 'All' ? '' : `${category.replace(' Dept', ' department')} `}listings at ${campusLabel} yet`

  const clearFilters = () => {
    setQuery('')
    setCategory('All')
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex flex-col gap-lg px-xl pb-lg pt-lg">
        <div className="flex items-center justify-between">
          <Wordmark />
          <Pressable
            onPress={onOpenProfile}
            aria-label={`Open your profile, ${userName}`}
            className="touch-hit rounded-corner-full hover:opacity-80"
          >
            <Avatar type="initial" initials={userInitials} size="large" />
          </Pressable>
        </div>
        <div>
          <p className="text-title text-text-primary">Hi, {userName.split(' ')[0]}</p>
          <p className="mt-xs text-label-sm text-text-secondary">What do you need for this term?</p>
          <div className="mt-sm flex items-center gap-xs">
            <MapPin size={14} className="shrink-0 text-text-secondary" aria-hidden="true" />
            <Badge variant="brand" label={campusLabel} />
          </div>
        </div>
      </div>

      <header className="sticky top-0 z-20 flex flex-col gap-lg rounded-b-corner-lg bg-surface-bg px-xl pb-lg pt-lg">
        <InputField
          type="search"
          aria-label="Search listings"
          placeholder="Search MATH 010, calculators..."
          prefix={<Search size={16} />}
          value={query}
          onChange={setQuery}
        />
        <CategoryPills active={category} onChange={setCategory} />
      </header>

      {category === 'All' && !query && (
        <>
          <div className="mx-xl mt-xl flex items-center gap-lg rounded-corner-lg bg-accent-soft p-lg">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-corner-full bg-accent text-on-accent">
              <PlusCircle size={20} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-label-sm text-text-primary">Done with last term&rsquo;s books?</p>
              <p className="text-caption-sm text-text-secondary">List them in under a minute.</p>
            </div>
            <Button variant="primary" size="small" onClick={onSell} className="touch-hit">
              Sell
            </Button>
          </div>
          {promotions.length > 0 && <SponsorBanner promotions={promotions} onOpen={onOpenPromotion} />}
        </>
      )}

      <div className="flex items-baseline justify-between px-xl pb-lg pt-xl">
        <p role="heading" aria-level={1} className="text-label font-semibold text-text-primary">
          Fresh on campus
        </p>
        {loading ? (
          <Skeleton className="h-4 w-14" />
        ) : error ? null : (
          <span className="text-label-sm text-text-secondary" aria-live="polite">
            {results.length} {results.length === 1 ? 'item' : 'items'}
          </span>
        )}
      </div>

      {loading ? (
        <div role="status" aria-label="Loading listings" className="grid grid-cols-2 gap-lg px-xl pb-xl">
          {Array.from({ length: PAGE_SIZE }, (_, index) => (
            <ProductCardSkeleton key={index} />
          ))}
        </div>
      ) : error ? (
        <LoadError className="mx-xl mb-xl" what="listings" onRetry={onRetry} />
      ) : results.length > 0 ? (
        <div className="flex flex-col pb-xl">
          <div className="grid grid-cols-2 gap-lg px-xl">
            {results.slice(0, visibleCount).map((listing) => (
              <ProductCard key={listing.id} listing={listing} onOpen={() => onOpen(listing.id)} />
            ))}
            {loadingMore && (
              <>
                <ProductCardSkeleton />
                <ProductCardSkeleton />
              </>
            )}
          </div>
          <div ref={sentinelRef} aria-hidden="true" />
          <div aria-live="polite" className="px-xl">
            {loadingMore && (
              <p className="flex items-center justify-center gap-sm pt-xl text-label-sm text-text-secondary">
                <Spinner />
                Loading more listings&hellip;
              </p>
            )}
            {!hasMore && results.length > PAGE_SIZE && (
              <div className="flex flex-col items-center gap-md pt-2xl">
                <span aria-hidden="true" className="h-px w-full bg-border-secondary" />
                <p className="flex items-center gap-xs text-label-sm text-text-secondary">
                  <CheckCircle2 size={16} className="text-success" />
                  You&rsquo;re all caught up
                </p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <EmptyState
          className="mx-xl mb-xl"
          icon={SearchX}
          title={emptyTitle}
          body="Try another subject code or category."
          action={
            <>
              <Button variant="neutral" size="small" onClick={clearFilters} className="touch-hit">
                Clear filters
              </Button>
              <Button variant="subtle" size="small" iconStart={<PlusCircle size={14} />} onClick={onSell} className="touch-hit">
                Sell one instead
              </Button>
            </>
          }
        />
      )}
    </div>
  )
}
