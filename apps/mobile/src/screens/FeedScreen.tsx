/**
 * 1:1 port of apps/web/screens/FeedScreen.tsx.
 * Element order, nesting, copy and px values match the web source exactly;
 * Tailwind classes are translated per apps/mobile/src/components/ported/tokens.ts.
 *
 * Interface note: the mobile shell owns data loading (services.listings /
 * services.promotions) and tab navigation, so the web's `listings`, `loading`,
 * `error`, `onRetry`, `userName`, `userInitials`, `campusLabel` props are
 * derived internally from the session/services, and `onSell` / `onOpenProfile`
 * / `onOpenPromotion` are optional callbacks wired by AppShell. `onOpen`
 * keeps the existing mobile contract (receives the Listing object).
 */
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { CATEGORIES, campusLabel as campusLabelOf, isFresh, priceLabel, timeAgo } from '@tipalit/services/seed'
import type { Listing, Promotion } from '@tipalit/services/types'
import { useSession } from '../session'
import {
  Avatar,
  Button,
  CategoryPills,
  EmptyState,
  Icon,
  InputField,
  KitBadge,
  LoadError,
  ProductCard,
  ProductCardSkeleton,
  Skeleton,
  SponsorBanner,
  Spinner,
  Wordmark,
  colors,
  radius,
  typography,
} from '../components/ported'

type Props = {
  onOpen: (listing: Listing) => void
  onSell?: () => void
  onOpenProfile?: () => void
  onOpenPromotion?: (promotion: Promotion) => void
}

const PAGE_SIZE = 6
const PAGE_DELAY_MS = 700
// web sentinel rootMargin: '200px' -> fire when within 200px of the bottom
const END_REACHED_PX = 200

export default function FeedScreen({ onOpen, onSell, onOpenProfile, onOpenPromotion }: Props) {
  const { profile } = useSession()
  const campus = profile?.campus ?? 'manila'
  const userName = profile?.name ?? 'there'
  const userInitials = useMemo(
    () =>
      userName
        .split(' ')
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? '')
        .join(''),
    [userName],
  )

  const [query, setQuery] = useState('')
  const [category, setCategory] = useState('All')
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [error, setError] = useState(false)
  const [visibleCount, setVisibleCount] = useState(PAGE_SIZE)
  const [loadingMore, setLoadingMore] = useState(false)

  const load = useCallback(async () => {
    setError(false)
    try {
      const [nextListings, nextPromotions] = await Promise.all([
        services.listings.list({ campus }),
        services.promotions.list({ campus }).catch(() => [] as Promotion[]),
      ])
      setListings(nextListings)
      setPromotions(nextPromotions)
    } catch {
      setListings([])
      setError(true)
    }
  }, [campus])

  useEffect(() => {
    void load()
  }, [load])

  const results = useMemo(() => {
    const q = query.trim().toLowerCase()
    return (listings ?? []).filter((listing) => {
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

  // web: IntersectionObserver rootMargin 200px -> load the next page
  const handleScroll = useCallback(
    (event: { nativeEvent: { contentOffset: { y: number }; contentSize: { height: number }; layoutMeasurement: { height: number } } }) => {
      const { contentOffset, contentSize, layoutMeasurement } = event.nativeEvent
      const distanceFromEnd = contentSize.height - layoutMeasurement.height - contentOffset.y
      if (distanceFromEnd <= END_REACHED_PX) setLoadingMore(true)
    },
    [],
  )

  useEffect(() => {
    if (!loadingMore) return
    const timer = setTimeout(() => {
      setVisibleCount((count) => count + PAGE_SIZE)
      setLoadingMore(false)
    }, PAGE_DELAY_MS)
    return () => clearTimeout(timer)
  }, [loadingMore])

  const trimmedQuery = query.trim()
  const emptyTitle = trimmedQuery
    ? `No items found for “${trimmedQuery}” at ${campusLabelOf(campus)}`
    : `No ${category === 'All' ? '' : `${category.replace(' Dept', ' department')} `}listings at ${campusLabelOf(campus)} yet`

  const clearFilters = () => {
    setQuery('')
    setCategory('All')
  }

  const loading = listings === null

  return (
    <View style={styles.root}>
      <ScrollView
        stickyHeaderIndices={[1]}
        onScroll={handleScroll}
        scrollEventThrottle={100}
        showsVerticalScrollIndicator={false}
      >
        {/* hero: flex flex-col gap-lg px-xl pb-lg pt-lg */}
        <View style={styles.hero}>
          <View style={styles.heroTop}>
            <Wordmark />
            <Pressable
              onPress={() => onOpenProfile?.()}
              accessibilityRole="button"
              accessibilityLabel={`Open your profile, ${userName}`}
              style={({ pressed }) => [styles.avatarHit, pressed && styles.pressed]}
            >
              <Avatar initials={userInitials} size="large" />
            </Pressable>
          </View>
          <View>
            <Text style={[typography.title, styles.textPrimary]}>Hi, {userName.split(' ')[0]}</Text>
            <Text style={[typography.labelSm, styles.textSecondary, styles.mtXs]}>What do you need for this term?</Text>
            <View style={[styles.campusRow, styles.mtSm]}>
              <Icon name="map-pin" size={14} color={colors.textSecondary} />
              <KitBadge variant="brand" label={campusLabelOf(campus)} />
            </View>
          </View>
        </View>

        {/* sticky header: sticky top-0 z-20 flex flex-col gap-lg rounded-b-corner-lg bg-surface-bg px-xl pb-lg pt-lg */}
        <View style={styles.stickyHeader}>
          <InputField
            placeholder="Search MATH 010, calculators..."
            prefix={<Icon name="search" size={16} color={colors.text} />}
            value={query}
            onChange={setQuery}
          />
          <CategoryPills categories={CATEGORIES} active={category} onChange={setCategory} />
        </View>

        {category === 'All' && !query && (
          <>
            {/* sell banner: mx-xl mt-xl flex items-center gap-lg rounded-corner-lg bg-accent-soft p-lg */}
            <View style={styles.sellBanner}>
              <View style={styles.sellChip}>
                <Icon name="plus-circle" size={20} color={colors.onAccent} />
              </View>
              <View style={styles.sellText}>
                <Text style={[typography.labelSm, styles.textPrimary]}>Done with last term&rsquo;s books?</Text>
                <Text style={[typography.meta, styles.textSecondary]}>List them in under a minute.</Text>
              </View>
              <Button label="Sell" variant="primary" size="small" onPress={() => onSell?.()} />
            </View>
            {promotions.length > 0 && (
              <SponsorBanner promotions={promotions} onOpen={(promotion) => onOpenPromotion?.(promotion)} />
            )}
          </>
        )}

        {/* count row: flex items-baseline justify-between px-xl pb-lg pt-xl */}
        <View style={styles.countRow}>
          <Text role="heading" aria-level={1} style={[typography.label, styles.textPrimary, styles.fontSemibold]}>
            Fresh on campus
          </Text>
          {loading ? (
            <Skeleton width={56} height={16} />
          ) : error ? null : (
            <Text accessibilityLiveRegion="polite" style={[typography.labelSm, styles.textSecondary]}>
              {results.length} {results.length === 1 ? 'item' : 'items'}
            </Text>
          )}
        </View>

        {loading ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Loading listings"
            style={styles.skeletonGrid}
          >
            {Array.from({ length: PAGE_SIZE }, (_, index) => (
              <ProductCardSkeleton key={index} />
            ))}
          </View>
        ) : error ? (
          <LoadError style={styles.loadError} what="listings" onRetry={() => void load()} />
        ) : results.length > 0 ? (
          <View style={styles.resultsCol}>
            <View style={styles.grid}>
              {results.slice(0, visibleCount).map((listing) => (
                <View key={listing.id} style={styles.gridCell}>
                  <ProductCard
                    listing={listing}
                    onOpen={() => onOpen(listing)}
                    priceLabel={priceLabel as (l: never) => string}
                    timeAgo={timeAgo as (d: never) => string}
                    isFresh={isFresh as (d: never) => boolean}
                  />
                </View>
              ))}
              {loadingMore && (
                <>
                  <View style={styles.gridCell}>
                    <ProductCardSkeleton />
                  </View>
                  <View style={styles.gridCell}>
                    <ProductCardSkeleton />
                  </View>
                </>
              )}
            </View>
            {/* sentinel (web ref) — paging is scroll-driven above */}
            <View accessibilityLiveRegion="polite" style={styles.footerWrap}>
              {loadingMore && (
                <View style={styles.loadingMoreRow}>
                  <Spinner />
                  <Text style={[typography.labelSm, styles.textSecondary]}>Loading more listings&hellip;</Text>
                </View>
              )}
              {!hasMore && results.length > PAGE_SIZE && (
                <View style={styles.caughtUpCol}>
                  <View style={styles.divider} />
                  <View style={styles.caughtUpRow}>
                    <Icon name="check-circle-2" size={16} color={colors.success} />
                    <Text style={[typography.labelSm, styles.textSecondary]}>You&rsquo;re all caught up</Text>
                  </View>
                </View>
              )}
            </View>
          </View>
        ) : (
          <EmptyState
            style={styles.loadError}
            icon="search-x"
            title={emptyTitle}
            body="Try another subject code or category."
            action={
              <>
                <Button label="Clear filters" variant="neutral" size="small" onPress={clearFilters} />
                <Button
                  label="Sell one instead"
                  variant="subtle"
                  size="small"
                  iconStart={<Icon name="plus-circle" size={14} color={colors.brandPrimary} />}
                  onPress={() => onSell?.()}
                />
              </>
            }
          />
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandTertiary },
  pressed: { opacity: 0.8 }, // web hover:opacity-80 -> pressed treatment
  // hero: gap-12 px-16 pt-12 pb-12
  hero: { gap: 12, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 12 },
  heroTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  avatarHit: { borderRadius: 999 },
  mtXs: { marginTop: 4 },
  mtSm: { marginTop: 6 },
  textPrimary: { color: colors.text },
  textSecondary: { color: colors.textSecondary },
  fontSemibold: { fontWeight: '600' },
  // campus row: flex items-center gap-4
  campusRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // sticky header: gap-12 px-16 pt-12 pb-12, rounded-b-16, bg-surface-bg
  stickyHeader: {
    gap: 12,
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 12,
    borderBottomLeftRadius: radius.lg,
    borderBottomRightRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  // sell banner: mx-16 mt-16 gap-12 radius-16 bg-accent-soft p-12
  sellBanner: {
    marginHorizontal: 16,
    marginTop: 16,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    borderRadius: radius.lg,
    backgroundColor: colors.accentSoft,
    padding: 12,
  },
  sellChip: {
    width: 40,
    height: 40,
    flexShrink: 0,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 999,
    backgroundColor: colors.accent,
  },
  sellText: { minWidth: 0, flex: 1 },
  // count row: px-16 pt-16 pb-12
  countRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 12,
  },
  // loading grid: grid-cols-2 gap-12 px-16 pb-24
  skeletonGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
    paddingBottom: 24,
  },
  loadError: { marginHorizontal: 16, marginBottom: 24 },
  resultsCol: { paddingBottom: 24 },
  // grid: grid-cols-2 gap-12 px-16
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    paddingHorizontal: 16,
  },
  // two equal columns (grid-cols-2): basis just under half so the 12px gap fits,
  // flexGrow expands each to fill exactly half the row
  gridCell: { flexGrow: 1, flexBasis: '48%' as unknown as never, minWidth: 0 },
  footerWrap: { paddingHorizontal: 16 },
  // loading more: flex items-center justify-center gap-6 pt-16
  loadingMoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingTop: 16,
  },
  // caught up: flex-col items-center gap-8 pt-24
  caughtUpCol: { flexDirection: 'column', alignItems: 'center', gap: 8, paddingTop: 24 },
  // h-px w-full bg-border-secondary
  divider: { height: StyleSheet.hairlineWidth, width: '100%', backgroundColor: colors.borderSecondary },
  caughtUpRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
})
