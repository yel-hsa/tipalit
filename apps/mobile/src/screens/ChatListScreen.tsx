import { useCallback, useEffect, useState } from 'react'
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { timeAgo } from '@tipalit/services/seed'
import type { Listing, Thread } from '@tipalit/services/types'
import { colors, radius, space } from '../theme'
import { EmptyState, Loading, Screen } from '../components/ui'

type Row = { thread: Thread; listing: Listing | null; preview: string; at: string }

const previewOf = (thread: Thread) => {
  const last = thread.items[thread.items.length - 1]
  if (!last) return 'No messages yet'
  return last.kind === 'message' ? last.text : `Meetup: ${last.location}`
}

const lastAt = (thread: Thread) => {
  const last = thread.items[thread.items.length - 1]
  return last && last.kind === 'meetup' ? last.time : ''
}

export default function ChatListScreen({ onOpen }: { onOpen: (threadId: string) => void }) {
  const [rows, setRows] = useState<Row[] | null>(null)

  const load = useCallback(async () => {
    try {
      const threads = await services.chat.listThreads()
      const listings = await services.listings.getMany(threads.map((thread) => thread.listingId))
      const byId = new Map(listings.map((listing) => [listing.id, listing]))
      setRows(
        threads.map((thread) => ({
          thread,
          listing: byId.get(thread.listingId) ?? null,
          preview: previewOf(thread),
          at: lastAt(thread),
        })),
      )
    } catch {
      setRows([])
    }
  }, [])

  useEffect(() => {
    void load()
    return services.chat.subscribe(() => void load())
  }, [load])

  if (rows === null) return <Loading />

  return (
    <Screen>
      <View style={styles.header}>
        <Text style={styles.heading}>Messages</Text>
      </View>
      <FlatList
        data={rows}
        keyExtractor={(row) => row.thread.id}
        contentContainerStyle={styles.list}
        renderItem={({ item }) => (
          <Pressable
            accessibilityRole="button"
            onPress={() => onOpen(item.thread.id)}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.avatar}>
              <Text style={styles.avatarText}>{(item.listing?.title ?? '?').slice(0, 1).toUpperCase()}</Text>
            </View>
            <View style={styles.body}>
              <Text style={styles.title} numberOfLines={1}>
                {item.listing?.title ?? 'Listing removed'}
              </Text>
              <Text style={styles.preview} numberOfLines={1}>
                {item.preview}
              </Text>
            </View>
            {item.at !== '' && <Text style={styles.time}>{timeAgo(item.at)}</Text>}
          </Pressable>
        )}
        ListEmptyComponent={<EmptyState title="No messages" body="Message a seller from any listing to start a chat." />}
      />
    </Screen>
  )
}

const styles = StyleSheet.create({
  header: { paddingHorizontal: space(4), paddingTop: space(4) },
  heading: { fontSize: 24, fontWeight: '700', color: colors.text },
  list: { padding: space(4), gap: space(2), flexGrow: 1 },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(3),
    backgroundColor: colors.surface,
    borderRadius: radius.lg,
    borderWidth: 1,
    borderColor: colors.border,
    padding: space(3),
  },
  pressed: { opacity: 0.85 },
  avatar: {
    width: 44,
    height: 44,
    borderRadius: radius.pill,
    backgroundColor: colors.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  avatarText: { color: colors.accent, fontWeight: '700', fontSize: 16 },
  body: { flex: 1, gap: 2 },
  title: { fontSize: 15, fontWeight: '600', color: colors.text },
  preview: { fontSize: 13, color: colors.muted },
  time: { fontSize: 11, color: colors.muted },
})
