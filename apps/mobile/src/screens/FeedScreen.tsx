import { useCallback, useEffect, useState } from 'react'
import { FlatList, RefreshControl, ScrollView, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { CATEGORIES, campusLabel } from '@tipalit/services/seed'
import type { Listing } from '@tipalit/services/types'
import { useSession } from '../session'
import { colors, space } from '../theme'
import ListingCard from '../components/ListingCard'
import { EmptyState, Loading, Pill, Screen } from '../components/ui'

type Props = { onOpen: (listing: Listing) => void }

export default function FeedScreen({ onOpen }: Props) {
  const { profile } = useSession()
  const campus = profile?.campus ?? 'manila'
  const [listings, setListings] = useState<Listing[] | null>(null)
  const [category, setCategory] = useState<string>('All')
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const load = useCallback(async () => {
    setError(null)
    try {
      setListings(await services.listings.list({ campus }))
    } catch {
      setError('We could not load the feed. Pull down to retry.')
      setListings([])
    }
  }, [campus])

  useEffect(() => {
    void load()
  }, [load])

  const refresh = async () => {
    setRefreshing(true)
    await load()
    setRefreshing(false)
  }

  const visible = (listings ?? []).filter((listing) => category === 'All' || listing.category === category)

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.heading}>Campus feed</Text>
        <Text style={styles.sub}>{campusLabel(campus)}</Text>
      </View>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filters}>
        {CATEGORIES.map((item) => (
          <Pill key={item} label={item} active={category === item} onPress={() => setCategory(item)} />
        ))}
      </ScrollView>
      {listings === null ? (
        <Loading />
      ) : (
        <FlatList
          data={visible}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={colors.accent} />}
          renderItem={({ item }) => <ListingCard listing={item} onPress={() => onOpen(item)} />}
          ListEmptyComponent={
            <EmptyState
              title={error ? 'Something went wrong' : 'Nothing here yet'}
              body={error ?? 'No listings in this category. Check back soon.'}
            />
          }
        />
      )}
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space(4), paddingTop: space(4), gap: 2 },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  sub: { fontSize: 13, color: colors.muted },
  filters: { paddingHorizontal: space(4), paddingVertical: space(3), gap: space(2) },
  list: { paddingHorizontal: space(4), paddingBottom: space(8), gap: space(3), flexGrow: 1 },
})
