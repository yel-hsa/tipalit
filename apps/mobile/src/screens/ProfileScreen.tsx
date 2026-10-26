/**
 * 1:1 port of apps/web/screens/ProfileScreen.tsx — same JSX tree, same order,
 * same copy; every Tailwind class translated to exact RN values from the
 * ported token tables. Hover states collapse into pressed opacity (touch).
 */
import { useCallback, useEffect, useRef, useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { campusLabel, formatMonthYear, priceLabel, timeAgo } from '@tipalit/services/seed'
import type { CompleteProfile } from '@tipalit/services/profile'
import type { Listing, Promotion, Theme } from '@tipalit/services/types'
import { useSession } from '../session'
import {
  AvatarInitials,
  Badge,
  Button,
  ConfirmModal,
  EditProfileSheet,
  EmptyState,
  Icon,
  LoadError,
  ProfileSkeleton,
  ScreenHeader,
  SwitchRow,
  Tabs,
  colors,
  cornerPx,
  radius,
  spacePx,
  touchTarget,
  typography,
} from '../components/ported'

export const APP_VERSION = '0.1.0'
const REVIEWER_TAPS = 7
const TAP_WINDOW_MS = 1500

type ProfileScreenProps = {
  onOpen: (listing: Listing) => void
  onOpenPromotion: (promotion: Promotion) => void
  onSell: () => void
  reviewerMode?: boolean
  onToggleReviewerMode?: () => void
}

function Stat({ value, label }: { value: number; label: string }) {
  return (
    <View style={styles.stat}>
      <Text style={[typography.title, { color: colors.text }]}>{value}</Text>
      <Text style={[typography.meta, { color: colors.textSecondary }]}>{label}</Text>
    </View>
  )
}

function ListingRows({
  listings,
  currentCampus,
  onOpen,
}: {
  listings: Listing[]
  currentCampus: CompleteProfile['campus']
  onOpen: (id: string) => void
}) {
  return (
    <View style={styles.rowsList}>
      {listings.map((listing, index) => (
        <View key={listing.id} style={[styles.rowItem, index === listings.length - 1 && styles.rowItemLast]}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel={`${listing.title}, ${priceLabel(listing)}${
              listing.status === 'sold' ? ', sold' : listing.status === 'reserved' ? ', reserved' : ''
            }`}
            onPress={() => onOpen(listing.id)}
            style={({ pressed }) => [styles.rowPress, pressed && styles.rowPressed]}
          >
            <Image
              source={{ uri: listing.imageUrl }}
              style={[styles.rowImage, listing.status === 'sold' && styles.rowImageSold]}
              resizeMode="cover"
              accessibilityIgnoresInvertColors
            />
            <View style={styles.rowBody}>
              <Text numberOfLines={1} style={[typography.labelSm, { color: colors.text }]}>
                {listing.title}
              </Text>
              <Text style={[typography.labelSm, { color: colors.text, fontWeight: '600' }]}>{priceLabel(listing)}</Text>
              <View style={styles.rowChips}>
                <Badge label={listing.courseCode} />
                {listing.status === 'reserved' && <Badge variant="warning" label="Reserved" />}
                {listing.status === 'sold' && <Badge variant="danger" label="Sold" />}
                {listing.campus !== currentCampus && <Badge variant="secondary" label={campusLabel(listing.campus)} />}
                <Text style={[typography.meta, { color: colors.textTertiary }]}>{timeAgo(listing.createdAt)}</Text>
              </View>
            </View>
            <Icon name="chevron-right" size={16} color={colors.textSecondary} />
          </Pressable>
        </View>
      ))}
    </View>
  )
}

export default function ProfileScreen({
  onOpen,
  onOpenPromotion,
  onSell,
  reviewerMode = false,
  onToggleReviewerMode = () => undefined,
}: ProfileScreenProps) {
  const { session, profile, isAdmin, signOut } = useSession()
  const [theme, setTheme] = useState<Theme>('light')
  const [editing, setEditing] = useState(false)
  const [confirmSignOut, setConfirmSignOut] = useState(false)
  const [signingOut, setSigningOut] = useState(false)
  const [myListings, setMyListings] = useState<Listing[] | null>(null)
  const [promotions, setPromotions] = useState<Promotion[]>([])
  const [threadCount, setThreadCount] = useState(0)
  const [completedMeetups, setCompletedMeetups] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(false)
  const taps = useRef({ count: 0, at: 0 })

  const load = useCallback(async () => {
    if (!session || !profile) return
    setLoading(true)
    setError(false)
    try {
      const [mine, threads, promos] = await Promise.all([
        services.listings.listMine(session.userId),
        services.chat.listThreads(),
        profile.campus ? services.promotions.list({ campus: profile.campus }) : Promise.resolve([]),
      ])
      setMyListings(mine)
      setThreadCount(threads.length)
      setCompletedMeetups(
        threads.reduce(
          (count, thread) =>
            count + thread.items.filter((item) => item.kind === 'meetup' && item.completed && item.from === 'me').length,
          0,
        ),
      )
      setPromotions(promos)
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }, [session, profile])

  useEffect(() => {
    void load()
  }, [load])

  if (!session || !profile) return null

  const email = session.email
  const initials = session.initials
  const onRetry = () => void load()
  const onOpenListing = (listingId: string) => {
    const listing = myListings?.find((item) => item.id === listingId)
    if (listing) onOpen(listing)
  }
  const onSaveProfile = async (draft: import('../components/ported').ProfileDraft) => {
    await services.profiles.save({
      ...profile,
      name: draft.name,
      campus: draft.campus || profile.campus,
      program: draft.program,
      year: draft.year,
    })
    return true
  }
  const onThemeChange = () => undefined
  const onOpenReviewerTools = () => undefined
  const onSignOut = signOut

  const active = (myListings ?? []).filter((listing) => listing.status === 'active')
  const sold = (myListings ?? []).filter((listing) => listing.status === 'sold')

  useEffect(() => {
    let mounted = true
    services.prefs
      .get()
      .then((prefs) => {
        if (mounted) setTheme(prefs.theme)
      })
      .catch(() => undefined)
    return () => {
      mounted = false
    }
  }, [])

  // hidden reviewer switch: seven quick taps on the version line
  const tapVersion = () => {
    const now = Date.now()
    taps.current.count = now - taps.current.at < TAP_WINDOW_MS ? taps.current.count + 1 : 1
    taps.current.at = now
    if (taps.current.count >= REVIEWER_TAPS) {
      taps.current.count = 0
      onToggleReviewerMode()
    }
  }

  return (
    <View style={styles.screen}>
      <ScreenHeader title="Profile" />

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={styles.account} accessibilityLabel="Account">
          <View>
            <AvatarInitials initials={initials} size={64} />
            <View style={styles.avatarBadge}>
              <Icon name="shield-check" size={12} color={colors.onReverse} />
            </View>
          </View>
          <View style={styles.accountBody}>
            <Text style={[typography.heading, { color: colors.text }]}>{profile.name}</Text>
            <Text style={[typography.labelSm, { color: colors.textSecondary }]}>{email}</Text>
            <Text style={[typography.labelSm, { color: colors.textSecondary }]}>
              {profile.program} · {profile.year}
            </Text>
            <View style={styles.campusBadge}>
              <Badge variant="brand" label={campusLabel(profile.campus ?? 'manila')} />
            </View>
          </View>
          <View style={styles.verifiedStrip}>
            <View style={styles.verifiedChip}>
              <Icon name="shield-check" size={16} color={colors.onReverse} />
            </View>
            <View style={styles.verifiedText}>
              <Text style={[typography.labelSm, { color: colors.text }]}>{isAdmin ? 'TIPalit admin' : 'Verified TIP Student'}</Text>
              <Text style={[typography.meta, { color: colors.textSecondary }]}>Member since {formatMonthYear(profile.joinedAt)}</Text>
            </View>
            <Badge variant={isAdmin ? 'secondary' : 'success'} label={isAdmin ? 'Admin' : 'Verified'} />
          </View>
          <Button
            label="Edit profile"
            variant="neutral"
            size="small"
            iconStart={<Icon name="pencil" size={14} color={colors.brandPrimary} />}
            onPress={() => setEditing(true)}
          />
        </View>

        {loading ? (
          <ProfileSkeleton />
        ) : error ? (
          <LoadError what="your listings" onRetry={onRetry} />
        ) : (
          <>
            <View style={styles.statGrid} accessibilityLabel="Activity">
              <Stat value={active.length} label="Active listings" />
              <Stat value={threadCount} label="Chats" />
              <Stat value={completedMeetups} label="Meetups done" />
            </View>

            <View style={styles.section} accessibilityLabel="My listings">
              <View style={styles.sectionHead}>
                <Text accessibilityRole="header" style={[typography.label, { color: colors.text, fontWeight: '600' }]}>My listings</Text>
                {(myListings ?? []).length > 0 && (
                  <Button
                    label="New"
                    variant="subtle"
                    size="small"
                    iconStart={<Icon name="plus-circle" size={14} color={colors.brandPrimary} />}
                    onPress={onSell}
                  />
                )}
              </View>
              {(myListings ?? []).length === 0 ? (
                <EmptyState
                  icon="package-open"
                  title="You have no listings yet"
                  body="Turn last term's books and tools into cash for this one."
                  action={
                    <Button
                      label="List an item"
                      variant="primary"
                      size="small"
                      iconStart={<Icon name="plus-circle" size={14} color="#ffffff" />}
                      onPress={onSell}
                    />
                  }
                />
              ) : (
                <ProfileTabs
                  active={active}
                  sold={sold}
                  campus={profile.campus ?? 'manila'}
                  onOpenListing={onOpenListing}
                />
              )}
            </View>
          </>
        )}

        {promotions.length > 0 && (
          <View style={styles.section} accessibilityLabel="Student perks">
            <Text accessibilityRole="header" style={[typography.label, { color: colors.text, fontWeight: '600' }]}>Student perks</Text>
            <View style={styles.rowsList}>
              {promotions.map((promotion, index) => (
                <View key={promotion.id} style={[styles.rowItem, index === promotions.length - 1 && styles.rowItemLast]}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${promotion.type === 'perk' ? 'Perk' : 'Sponsor offer'}: ${promotion.title} by ${promotion.sponsorName}`}
                    onPress={() => onOpenPromotion(promotion)}
                    style={({ pressed }) => [styles.rowPress, pressed && styles.rowPressed]}
                  >
                    {promotion.imageUrl ? (
                      <Image
                        source={{ uri: promotion.imageUrl }}
                        style={styles.promoImage}
                        resizeMode="cover"
                        accessibilityIgnoresInvertColors
                      />
                    ) : (
                      <View style={styles.promoChip}>
                        <Icon name="sparkles" size={20} color={colors.text} />
                      </View>
                    )}
                    <View style={styles.promoBody}>
                      <Text numberOfLines={1} style={[typography.labelSm, { color: colors.text }]}>
                        {promotion.title}
                      </Text>
                      <Text numberOfLines={1} style={[typography.meta, { color: colors.textSecondary }]}>
                        {promotion.sponsorName}
                      </Text>
                    </View>
                    <Badge variant={promotion.type === 'perk' ? 'brand' : 'secondary'} label={promotion.type === 'perk' ? 'Perk' : 'Sponsor'} />
                    <Icon name="chevron-right" size={16} color={colors.textSecondary} />
                  </Pressable>
                </View>
              ))}
            </View>
          </View>
        )}

        <View style={styles.prefs} accessibilityLabel="Preferences">
          <SwitchRow
            icon={<Icon name="moon" size={20} color={colors.text} />}
            label="Dark mode"
            description="Easier on the eyes for late-night review sessions."
            checked={theme === 'dark'}
            onChange={(on) => {
              const next = on ? 'dark' : 'light'
              setTheme(next)
              void services.prefs.set({ theme: next })
            }}
          />
        </View>

        {reviewerMode && (
          <View style={styles.reviewer} accessibilityLabel="Reviewer">
            <Pressable
              accessibilityRole="button"
              onPress={onOpenReviewerTools}
              style={({ pressed }) => [styles.reviewerPress, pressed && styles.rowPressed]}
            >
              <View style={styles.reviewerChip}>
                <Icon name="flask-conical" size={20} color={colors.text} />
              </View>
              <View style={styles.promoBody}>
                <Text style={[typography.label, { color: colors.text }]}>Reviewer tools</Text>
                <Text style={[typography.meta, { color: colors.textSecondary }]}>Force loading, empty, and error states</Text>
              </View>
              <Icon name="chevron-right" size={16} color={colors.textSecondary} />
            </Pressable>
          </View>
        )}

        <Button
          label="Sign out"
          variant="neutral"
          iconStart={<Icon name="log-out" size={16} color={colors.brandPrimary} />}
          onPress={() => setConfirmSignOut(true)}
          style={styles.signOut}
        />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={`TIPalit version ${APP_VERSION}`}
          onPress={tapVersion}
          style={styles.version}
        >
          <Text style={[typography.meta, { color: colors.textTertiary }]}>TIPalit v{APP_VERSION}</Text>
        </Pressable>
      </ScrollView>

      {editing && (
        <EditProfileSheet
          isOpen
          profile={profile}
          onClose={() => setEditing(false)}
          onSave={async (draft) => {
            const saved = await onSaveProfile(draft)
            if (saved) setEditing(false)
            return saved
          }}
        />
      )}

      <ConfirmModal
        isOpen={confirmSignOut}
        title="Sign out of TIPalit?"
        body="Your profile and listings stay saved. Sign back in with the same Google account to pick up where you left off."
        confirmLabel="Sign out"
        confirmIcon={<Icon name="log-out" size={16} color="#ffffff" />}
        pending={signingOut}
        onClose={() => setConfirmSignOut(false)}
        onConfirm={() => {
          setSigningOut(true)
          void onSignOut()
        }}
      />
    </View>
  )
}

// kit Tabs is controlled; the web Tabs component owns its own state, so this
// wrapper reproduces the web behavior (uncontrolled, defaults to first tab).
function ProfileTabs({
  active,
  sold,
  campus,
  onOpenListing,
}: {
  active: Listing[]
  sold: Listing[]
  campus: CompleteProfile['campus']
  onOpenListing: (id: string) => void
}) {
  const [tab, setTab] = useState('active')
  return (
    <Tabs
      activeTab={tab}
      onChange={setTab}
      tabs={[
        {
          id: 'active',
          label: `Active (${active.length})`,
          content:
            active.length > 0 ? (
              <ListingRows listings={active} currentCampus={campus} onOpen={onOpenListing} />
            ) : (
              <Text style={styles.tabEmpty}>Nothing for sale right now.</Text>
            ),
        },
        {
          id: 'sold',
          label: `Sold (${sold.length})`,
          content:
            sold.length > 0 ? (
              <ListingRows listings={sold} currentCampus={campus} onOpen={onOpenListing} />
            ) : (
              <Text style={styles.tabEmpty}>Items you mark as sold show up here.</Text>
            ),
        },
      ]}
    />
  )
}

const styles = StyleSheet.create({
  // root: flex flex-1 flex-col
  screen: { flex: 1, backgroundColor: colors.brandTertiary },
  scroll: { flex: 1 },
  // content: flex flex-col gap-xl px-xl pb-xl
  content: { gap: spacePx.xl, paddingHorizontal: spacePx.xl, paddingBottom: spacePx.xl },
  // Account section: items-center gap-lg radius-lg bg-surface p-xl text-center
  account: {
    alignItems: 'center',
    gap: spacePx.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacePx.xl,
  },
  // success dot: size-6 (24) -bottom-xs -right-xs border-2 border-surface bg-success
  avatarBadge: {
    position: 'absolute',
    right: -spacePx.xs,
    bottom: -spacePx.xs,
    width: 24,
    height: 24,
    borderRadius: cornerPx.full,
    borderWidth: 2,
    borderColor: colors.surface,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
  },
  accountBody: { alignItems: 'center', gap: spacePx.xs },
  campusBadge: { marginTop: spacePx.xs },
  // verified strip: w-full items-center gap-md radius-md bg-bg-faint p-md text-left
  verifiedStrip: {
    width: '100%',
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacePx.md,
    borderRadius: radius.md,
    backgroundColor: colors.bgFaint,
    padding: spacePx.md,
  },
  verifiedChip: {
    width: 32,
    height: 32,
    borderRadius: cornerPx.full,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  verifiedText: { flex: 1, minWidth: 0 },
  // Activity: grid grid-cols-3 gap-md
  statGrid: { flexDirection: 'row', gap: spacePx.md },
  // Stat: items-center gap-xs radius-lg bg-surface px-md py-lg text-center
  stat: {
    flex: 1,
    alignItems: 'center',
    gap: spacePx.xs,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    paddingHorizontal: spacePx.md,
    paddingVertical: spacePx.lg,
  },
  section: { gap: spacePx.md },
  sectionHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  // ListingRows ul: overflow-hidden radius-lg bg-surface; li border-b last:border-0
  rowsList: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  rowItem: { borderBottomWidth: 1, borderBottomColor: colors.borderSecondary },
  rowItemLast: { borderBottomWidth: 0 },
  // row Pressable: items-center gap-lg p-lg (hover:bg-surface-hover -> pressed)
  rowPress: { flexDirection: 'row', alignItems: 'center', gap: spacePx.lg, padding: spacePx.lg },
  rowPressed: { backgroundColor: colors.surfaceHover },
  // img size-14 (56) radius-md; sold: opacity-60 grayscale
  rowImage: { width: 56, height: 56, borderRadius: radius.md, flexShrink: 0, backgroundColor: colors.bgSubtle },
  rowImageSold: { opacity: 0.6 },
  rowBody: { flex: 1, minWidth: 0, gap: spacePx.xs },
  rowChips: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: spacePx.sm },
  // tab empty: radius-lg bg-surface p-xl text-center text-label-sm
  tabEmpty: {
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacePx.xl,
    textAlign: 'center',
    ...typography.labelSm,
    color: colors.textSecondary,
  },
  // promo thumb size-12 (48) radius-md; fallback chip bg-accent-soft
  promoImage: { width: 48, height: 48, borderRadius: radius.md, flexShrink: 0, backgroundColor: colors.bgSubtle },
  promoChip: {
    width: 48,
    height: 48,
    borderRadius: radius.md,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  promoBody: { flex: 1, minWidth: 0 },
  // Preferences: radius-lg bg-surface p-lg
  prefs: { borderRadius: radius.lg, backgroundColor: colors.surface, padding: spacePx.lg },
  // Reviewer: overflow-hidden radius-lg bg-surface; row min-h-touch gap-lg p-lg
  reviewer: { borderRadius: radius.lg, backgroundColor: colors.surface, overflow: 'hidden' },
  reviewerPress: { minHeight: touchTarget, flexDirection: 'row', alignItems: 'center', gap: spacePx.lg, padding: spacePx.lg },
  reviewerChip: {
    width: 40,
    height: 40,
    borderRadius: cornerPx.full,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    flexShrink: 0,
  },
  // Sign out: w-full
  signOut: { alignSelf: 'stretch' },
  // version: self-center radius-md px-md py-xs text-caption-sm
  version: { alignSelf: 'center', borderRadius: radius.md, paddingHorizontal: spacePx.md, paddingVertical: spacePx.xs },
})
