import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { priceLabel, timeAgo } from '@tipalit/services/seed'
import type { Listing } from '@tipalit/services/types'
import { colors, radius, space } from '../theme'
import { Badge } from './ui'

export default function ListingCard({ listing, onPress }: { listing: Listing; onPress: () => void }) {
  const cover = listing.imageUrls[0] ?? listing.imageUrl
  return (
    <Pressable accessibilityRole="button" onPress={onPress} style={({ pressed }) => [styles.card, pressed && styles.pressed]}>
      <Image source={{ uri: cover }} style={styles.photo} accessibilityIgnoresInvertColors />
      <View style={styles.body}>
        <Text style={styles.title} numberOfLines={2}>
          {listing.title}
        </Text>
        <Text style={styles.price}>{priceLabel(listing)}</Text>
        <View style={styles.meta}>
          <Text style={styles.metaText} numberOfLines={1}>
            {listing.courseCode} · {listing.condition}
          </Text>
          <Text style={styles.metaText}>{timeAgo(listing.createdAt)}</Text>
        </View>
        {listing.status !== 'active' && (
          <Badge label={listing.status === 'sold' ? 'Sold' : 'Reserved'} tone={listing.status === 'sold' ? 'neutral' : 'warning'} />
        )}
      </View>
    </Pressable>
  )
}

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    gap: space(3),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(3),
  },
  pressed: { opacity: 0.85 },
  photo: { width: 88, height: 88, borderRadius: radius.md, backgroundColor: '#eee' },
  body: { flex: 1, gap: space(1) },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  price: { fontSize: 15, fontWeight: '700', color: colors.accent },
  meta: { flexDirection: 'row', justifyContent: 'space-between', gap: space(2) },
  metaText: { fontSize: 12, color: colors.muted, flexShrink: 1 },
})
