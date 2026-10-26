import { useEffect, useState } from 'react'
import { Image, ScrollView, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { campusLabel, priceLabel, timeAgo } from '@tipalit/services/seed'
import type { Listing, Seller } from '@tipalit/services/types'
import { useSession } from '../session'
import { colors, radius, typography, space } from '../theme'
import { Badge, Button, Card, Screen } from '../components/ui'

type Props = {
  listing: Listing
  onBack: () => void
  onEdit: (listing: Listing) => void
  onMessage: (threadId: string) => void
}

export default function ListingDetailScreen({
  listing,
  onBack,
  onEdit,
  onMessage,
}: Props) {
  const { session } = useSession()
  const [seller, setSeller] = useState<Seller | null>(null)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const isMine = listing.sellerId === session?.userId

  useEffect(() => {
    services.profiles
      .getSellers([listing.sellerId])
      .then(([found]) => setSeller(found ?? null))
      .catch(() => setSeller(null))
  }, [listing.sellerId])

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

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Image source={{ uri: listing.imageUrls[0] ?? listing.imageUrl }} style={styles.hero} accessibilityIgnoresInvertColors />
        <View style={styles.body}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{listing.title}</Text>
            <Text style={styles.price}>{priceLabel(listing)}</Text>
          </View>
          <View style={styles.badges}>
            <Badge label={listing.condition} tone="accent" />
            <Badge label={listing.category} />
            {listing.status !== 'active' && <Badge label={listing.status} tone="warning" />}
          </View>
          <Text style={styles.meta}>
            {listing.courseCode} · {campusLabel(listing.campus)} · {timeAgo(listing.createdAt)}
          </Text>
          <Text style={styles.description}>{listing.description}</Text>

          <Card style={styles.seller}>
            <Text style={styles.sellerName}>{seller?.name ?? 'Student seller'}</Text>
            <Text style={styles.sellerMeta}>
              {seller ? `${seller.program} · ${seller.year}` : 'Loading seller details'}
            </Text>
            {seller?.rating !== undefined && (
              <Text style={styles.sellerMeta}>
                {seller.rating.toFixed(1)} from {seller.reviews ?? 0} reviews
              </Text>
            )}
          </Card>

          <Card>
            <Text style={styles.label}>Meetup spot</Text>
            <Text style={styles.value}>{listing.meetupSpot}</Text>
          </Card>

          {error && <Text style={styles.error}>{error}</Text>}
        </View>
      </ScrollView>
      <View style={styles.footer}>
        <View style={styles.footerBack}>
          <Button label="Back" variant="secondary" onPress={onBack} />
        </View>
        {isMine ? (
          <View style={styles.footerMain}>
            <Button label="Edit listing" onPress={() => onEdit(listing)} />
          </View>
        ) : (
          listing.status === 'active' && (
            <View style={styles.footerMain}>
              <Button label="Message seller" onPress={message} busy={busy} />
            </View>
          )
        )}
      </View>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { paddingBottom: space(6) },
  hero: { width: '100%', aspectRatio: 1.2, backgroundColor: '#eee' },
  body: { padding: space(4), gap: space(3) },
  titleRow: { flexDirection: 'row', justifyContent: 'space-between', gap: space(3), alignItems: 'flex-start' },
  title: { flex: 1, ...typography.heading, fontWeight: '600', color: colors.text },
  price: { ...typography.heading, fontWeight: '600', color: colors.accent },
  badges: { flexDirection: 'row', gap: space(2), flexWrap: 'wrap' },
  meta: { ...typography.meta, color: colors.muted },
  description: { ...typography.cell, lineHeight: 22, color: colors.text },
  seller: { gap: 2 },
  sellerName: { ...typography.cellStrong, color: colors.text },
  sellerMeta: { ...typography.meta, color: colors.muted },
  label: { ...typography.meta, fontWeight: '600', color: colors.muted, textTransform: 'uppercase' },
  value: { ...typography.cell, color: colors.text },
  error: { ...typography.labelSm, color: colors.danger },
  footer: {
    flexDirection: 'row',
    gap: space(3),
    padding: space(4),
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    borderTopLeftRadius: radius.lg,
    borderTopRightRadius: radius.lg,
  },
  footerBack: { flex: 1 },
  footerMain: { flex: 2 },
})
