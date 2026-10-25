import { useCallback, useEffect, useState } from 'react'
import { ScrollView, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { campusLabel, formatMonthYear } from '@tipalit/services/seed'
import type { Listing } from '@tipalit/services/types'
import { useSession } from '../session'
import { colors, space } from '../theme'
import ListingCard from '../components/ListingCard'
import { Badge, Button, Card, EmptyState, Loading, Screen } from '../components/ui'

export default function ProfileScreen({ onOpen }: { onOpen: (listing: Listing) => void }) {
  const { session, profile, isAdmin, signOut } = useSession()
  const [mine, setMine] = useState<Listing[] | null>(null)

  const load = useCallback(async () => {
    if (!session) return
    try {
      setMine(await services.listings.listMine(session.userId))
    } catch {
      setMine([])
    }
  }, [session])

  useEffect(() => {
    void load()
  }, [load])

  if (!session || !profile) return <Loading />

  return (
    <Screen>
      <ScrollView contentContainerStyle={styles.content}>
        <Card style={styles.identity}>
          <View style={styles.avatar}>
            <Text style={styles.avatarText}>{session.initials}</Text>
          </View>
          <View style={styles.identityBody}>
            <Text style={styles.name}>{profile.name}</Text>
            <Text style={styles.meta}>{session.email}</Text>
            <Text style={styles.meta}>
              {profile.program} · {profile.year}
            </Text>
            <Text style={styles.meta}>
              {profile.campus ? campusLabel(profile.campus) : 'No campus'} · Joined {formatMonthYear(profile.joinedAt)}
            </Text>
          </View>
          {isAdmin && <Badge label="Admin" tone="accent" />}
        </Card>

        <Text style={styles.section}>My listings</Text>
        {mine === null ? (
          <Loading />
        ) : mine.length === 0 ? (
          <EmptyState title="Nothing listed yet" body="Items you publish show up here." />
        ) : (
          <View style={styles.list}>
            {mine.map((listing) => (
              <ListingCard key={listing.id} listing={listing} onPress={() => onOpen(listing)} />
            ))}
          </View>
        )}

        <Button label="Sign out" variant="secondary" onPress={signOut} />
      </ScrollView>
    </Screen>
  )
}

const styles = StyleSheet.create({
  content: { padding: space(4), gap: space(4), paddingBottom: space(10) },
  identity: { flexDirection: 'row', gap: space(3), alignItems: 'flex-start' },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontWeight: '700', fontSize: 18 },
  identityBody: { flex: 1, gap: 2 },
  name: { fontSize: 18, fontWeight: '700', color: colors.text },
  meta: { fontSize: 13, color: colors.muted },
  section: { fontSize: 16, fontWeight: '700', color: colors.text },
  list: { gap: space(3) },
})
