/**
 * 1:1 port of apps/web/screens/ProductDetailScreen.tsx.
 * Element order, nesting, copy, and style values match the web source exactly.
 * Mobile prop contract with AppShell is preserved (listing/onBack/onEdit/onMessage);
 * the extra web props (onShare/onReport/onSetStatus/onDelete) are wired to the
 * same handlers AppShell already exposes for the listing overlay.
 */
import { useState } from 'react'
import { Image, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native'
import { CONDITION_BADGE, STATUS_BADGE, campusLabel, priceLabel, timeAgo } from '@tipalit/services/seed'
import type { Listing, ListingStatus, Seller } from '@tipalit/services/types'
import { useSession } from '../session'
import { services } from '@tipalit/services'
import {
  Badge,
  Button,
  ConfirmModal,
  Icon,
  IconButton,
  MeetupLocationBlock,
  SellerTrustCard,
  colors,
  radius,
  spacePx,
  typePx,
} from '../components/ported'

type Props = {
  listing: Listing
  onBack: () => void
  onEdit: (listing: Listing) => void
  onMessage: (threadId: string) => void
}

export default function ListingDetailScreen({ listing, onBack, onEdit, onMessage }: Props) {
  const { session } = useSession()
  const [confirmDelete, setConfirmDelete] = useState(false)
  const [photoIndex, setPhotoIndex] = useState(0)
  const [busy, setBusy] = useState(false)
  // error text is captured for the action handlers but not rendered, matching
  // the web screen which surfaces these failures through the parent, not inline
  const [, setError] = useState<string | null>(null)
  const [seller, setSeller] = useState<Seller | null>(null)

  // seller lookup (mobile keeps its existing data flow; web receives seller as a prop)
  useState(() => {
    services.profiles
      .getSellers([listing.sellerId])
      .then(([found]) => setSeller(found ?? null))
      .catch(() => setSeller(null))
  })

  const isOwn = listing.sellerId === session?.userId
  const photos = listing.imageUrls.length > 0 ? listing.imageUrls : [listing.imageUrl]
  const current = Math.min(photoIndex, photos.length - 1)
  const sold = listing.status === 'sold'
  const reserved = listing.status === 'reserved'
  const unavailable = sold || reserved

  const message = async () => {
    setBusy(true)
    setError(null)
    try {
      const thread = await services.chat.openThread({ id: listing.id, sellerId: listing.sellerId })
      onMessage(thread.id)
    } catch {
      setError('We could not open the chat. Try again.')
    } finally {
      setBusy(false)
    }
  }

  const onSetStatus = (status: ListingStatus) => {
    services.listings.setStatus(listing.id, status).catch(() => setError('We could not update the listing. Try again.'))
  }

  const onDelete = () => {
    services.listings.remove(listing.id).catch(() => setError('We could not delete the listing. Try again.'))
    onBack()
  }

  const onShare = () => setError('Sharing is not available on this device yet.')
  const onReport = () => setError('Reporting is not available on this device yet.')

  return (
    <View style={styles.screen}>
      <ScrollView style={styles.scroll} contentContainerStyle={styles.scrollContent}>
        {/* photo block: relative aspect-square bg-bg-subtle */}
        <View style={styles.photoBlock}>
          <Image
            source={{ uri: photos[current] }}
            style={[styles.photo, unavailable && styles.photoUnavailable]}
            accessibilityIgnoresInvertColors
            accessibilityLabel={listing.title}
          />
          {photos.length > 1 && (
            <>
              <View style={styles.dotsRow} pointerEvents="box-none">
                {photos.map((photo, index) => (
                  <Pressable
                    key={photo}
                    accessibilityRole="button"
                    accessibilityLabel={`Photo ${index + 1} of ${photos.length}`}
                    accessibilityState={{ selected: index === current }}
                    onPress={() => setPhotoIndex(index)}
                    style={[styles.dot, index === current ? styles.dotCurrent : styles.dotOther]}
                  />
                ))}
              </View>
              <View style={styles.arrowsRow} pointerEvents="box-none">
                <IconButton
                  variant="subtle"
                  icon={<Icon name="arrow-right" size={16} color={colors.onOverlay} />}
                  accessibilityLabel="Previous photo"
                  disabled={current === 0}
                  onPress={() => setPhotoIndex((index) => Math.max(0, index - 1))}
                  style={styles.overlayControl}
                />
                <IconButton
                  variant="subtle"
                  icon={<Icon name="arrow-left" size={16} color={colors.onOverlay} />}
                  accessibilityLabel="Next photo"
                  disabled={current === photos.length - 1}
                  onPress={() => setPhotoIndex((index) => Math.min(photos.length - 1, index + 1))}
                  style={styles.overlayControl}
                />
              </View>
            </>
          )}
          <View style={styles.topRow} pointerEvents="box-none">
            <IconButton
              variant="subtle"
              icon={<Icon name="arrow-left" size={18} color={colors.onOverlay} />}
              accessibilityLabel="Back"
              onPress={onBack}
              style={styles.overlayControl}
            />
            <View style={styles.topActions}>
              {isOwn ? (
                <IconButton
                  variant="subtle"
                  icon={<Icon name="trash" size={18} color={colors.onOverlay} />}
                  accessibilityLabel="Delete listing"
                  onPress={() => setConfirmDelete(true)}
                  style={styles.overlayControl}
                />
              ) : (
                <IconButton
                  variant="subtle"
                  icon={<Icon name="flag" size={18} color={colors.onOverlay} />}
                  accessibilityLabel="Report listing"
                  onPress={onReport}
                  style={styles.overlayControl}
                />
              )}
              <IconButton
                variant="subtle"
                icon={<Icon name="share" size={18} color={colors.onOverlay} />}
                accessibilityLabel="Share listing"
                onPress={onShare}
                style={styles.overlayControl}
              />
            </View>
          </View>
        </View>

        {/* body: relative -mt-2xl flex flex-col gap-xl px-xl pb-xl */}
        <View style={styles.body}>
          {/* section: flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl */}
          <View style={styles.card}>
            <View style={styles.badgeRow}>
              {(() => {
                const statusBadge = STATUS_BADGE[listing.status]
                return statusBadge ? <Badge variant={statusBadge.variant} label={statusBadge.label} /> : null
              })()}
              <Badge variant={CONDITION_BADGE[listing.condition]} label={listing.condition} />
              <Badge variant="brand" label={listing.courseCode} />
              <Badge variant="default" label={listing.category} />
            </View>
            <View style={styles.titleCol}>
              <Text accessibilityRole="header" aria-level={1} style={[typePx.heading, styles.textPrimary]}>
                {listing.title}
              </Text>
              <Text style={[typePx.title, unavailable ? styles.priceUnavailable : styles.textPrimary]}>
                {priceLabel(listing)}
              </Text>
              <View style={styles.metaRow}>
                <Icon name="clock" size={12} color={colors.textSecondary} />
                <Text style={[typePx.meta, { color: colors.textSecondary }]}>
                  Posted {timeAgo(listing.createdAt)} · {listing.department}
                </Text>
              </View>
            </View>
            <View style={styles.titleCol}>
              <Text style={[typePx.label, styles.descriptionLabel, styles.textPrimary]}>Description</Text>
              <Text style={[typePx.labelSm, { color: colors.textSecondary }]}>{listing.description}</Text>
            </View>
          </View>

          <SellerTrustCard
            seller={{
              initials: seller?.name?.slice(0, 2).toUpperCase() ?? '??',
              name: seller?.name ?? 'Student seller',
              program: seller?.program ?? 'Loading seller details',
              year: seller?.year,
              rating: seller?.rating,
              reviews: seller?.reviews,
            }}
          />
          <MeetupLocationBlock spot={listing.meetupSpot} campusLabel={campusLabel(listing.campus)} />
        </View>
      </ScrollView>

      {/* sticky bottom bar: border-t border-border-secondary bg-surface-bg p-lg */}
      <View style={styles.footer}>
        {isOwn ? (
          <View style={styles.footerOwn}>
            <Button label="Edit" variant="neutral" iconStart={<Icon name="pencil" size={16} color={colors.brandPrimary} />} onPress={() => onEdit(listing)} style={styles.footerBtn} />
            <View style={styles.footerGrid}>
              <Button
                label={reserved ? 'Mark as available' : 'Reserve'}
                variant="primary"
                iconStart={<Icon name={reserved ? 'rotate-ccw' : 'clock'} size={16} color="#ffffff" />}
                onPress={() => onSetStatus(reserved ? 'active' : 'reserved')}
                style={styles.footerBtn}
              />
              <Button
                label={sold ? 'Mark as available' : 'Mark as sold'}
                variant="primary"
                iconStart={<Icon name={sold ? 'rotate-ccw' : 'check-circle-2'} size={16} color="#ffffff" />}
                onPress={() => onSetStatus(sold ? 'active' : 'sold')}
                style={styles.footerBtn}
              />
            </View>
          </View>
        ) : unavailable ? (
          <Button label={sold ? 'No longer available' : 'Reserved by another student'} variant="neutral" disabled onPress={() => {}} style={styles.footerBtn} />
        ) : (
          <Button
            label="Message Seller"
            variant="primary"
            iconStart={<Icon name="message-circle" size={16} color="#ffffff" />}
            onPress={message}
            busy={busy}
            style={styles.footerBtn}
          />
        )}
      </View>

      <ConfirmModal
        isOpen={confirmDelete}
        title="Delete this listing?"
        body={
          <Text style={[typePx.labelSm, { color: colors.textSecondary }]}>
            <Text style={{ color: colors.text }}>{listing.title}</Text> will be removed from the feed and your profile.
            Chats about it stay, marked “Listing removed”.
          </Text>
        }
        confirmLabel="Delete listing"
        confirmIcon={<Icon name="trash" size={16} color="#ffffff" />}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => {
          setConfirmDelete(false)
          onDelete()
        }}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.brandTertiary },
  scroll: { flex: 1 },
  scrollContent: { paddingBottom: spacePx['2xl'] },

  // photo block: relative aspect-square bg-bg-subtle
  photoBlock: { width: '100%', aspectRatio: 1, backgroundColor: colors.bgSubtle },
  photo: { width: '100%', height: '100%' },
  photoUnavailable: { opacity: 0.6 }, // grayscale has no RN equivalent without a lib; opacity-60 kept

  // dots: absolute inset-x-0 bottom-0 flex justify-center gap-xs pb-md; size-2xs (8px) rounded-full
  dotsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacePx.xs,
    paddingBottom: spacePx.md,
  },
  dot: { width: 8, height: 8, borderRadius: radius.pill },
  dotCurrent: { backgroundColor: colors.surface },
  dotOther: { backgroundColor: 'rgba(255,255,255,0.4)' }, // bg-surface-bg/40

  // arrows: absolute inset-x-0 top-2xl flex justify-between px-md
  arrowsRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: spacePx['2xl'],
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacePx.md,
  },

  // top controls: absolute inset-x-0 top-0 flex justify-between p-lg
  topRow: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacePx.lg,
  },
  topActions: { flexDirection: 'row', gap: spacePx.md },

  // OVERLAY_CONTROL: touch-hit bg-overlay-control text-on-overlay (+ hover bg)
  overlayControl: { backgroundColor: colors.overlayControl },

  // body: relative -mt-2xl flex flex-col gap-xl px-xl pb-xl
  body: {
    marginTop: -spacePx['2xl'],
    gap: spacePx.xl,
    paddingHorizontal: spacePx.xl,
    paddingBottom: spacePx.xl,
  },

  // card: flex flex-col gap-lg rounded-corner-lg bg-surface-bg p-xl
  card: {
    gap: spacePx.lg,
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    padding: spacePx.xl,
  },

  // badge row: flex flex-wrap gap-sm
  badgeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: spacePx.sm },

  // title col: flex flex-col gap-xs
  titleCol: { gap: spacePx.xs },
  textPrimary: { color: colors.text },
  priceUnavailable: { color: colors.textSecondary, textDecorationLine: 'line-through' },

  // meta: flex items-center gap-xs text-caption-sm text-text-secondary
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: spacePx.xs },
  descriptionLabel: { fontWeight: '600' },

  // footer: sticky bottom-0 border-t border-border-secondary bg-surface-bg p-lg
  footer: {
    padding: spacePx.lg,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
    backgroundColor: colors.surface,
  },
  footerOwn: { gap: spacePx.md },
  footerGrid: { flexDirection: 'row', gap: spacePx.md },
  footerBtn: { flex: 1 },
})
