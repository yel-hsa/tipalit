// chat list screen

import { useCallback, useEffect, useMemo, useState } from 'react'
import { Image, Pressable, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { SELLERS, threadNeedsReply } from '@tipalit/services/seed'
import type { Listing, Seller, Thread } from '@tipalit/services/types'
import { colors, radius, spacing, typography } from '../theme'
import {
  Avatar,
  Badge,
  Button,
  ChatRowSkeleton,
  EmptyState,
  Icon,
  LoadError,
  ScreenHeader,
} from '../components/ported'

type ChatListScreenProps = {
  threads: Thread[]
  loading: boolean
  error: boolean
  onRetry: () => void
  getListing: (id: string) => Listing | undefined
  getSeller: (id: string) => Seller
  onOpen: (threadId: string) => void
  onBrowse?: () => void
}

const previewOf = (thread: Thread) => {
  const last = thread.items[thread.items.length - 1]
  if (!last) return 'Say hi to start the conversation'
  const prefix = last.from === 'me' ? 'You: ' : ''
  if (last.kind === 'message') return `${prefix}${last.text}`
  const status = last.status === 'pending' ? 'proposed' : last.status
  return `${prefix}Meetup ${status} · ${last.time}`
}

// Web screen body — exported so the self-contained wrapper below can reuse it.
export function ChatListScreenBody({
  threads,
  loading,
  error,
  onRetry,
  getListing,
  getSeller,
  onOpen,
  onBrowse,
}: ChatListScreenProps) {
  return (
    <View style={styles.root}>
      <ScreenHeader title="Chats" subtitle="Arrange meetups with verified sellers" />

      <View style={styles.pad}>
        {loading ? (
          <View
            accessibilityRole="progressbar"
            accessibilityLabel="Loading chats"
            style={styles.stack}
          >
            {[0, 1, 2, 3].map((key) => (
              <ChatRowSkeleton key={key} />
            ))}
          </View>
        ) : error ? (
          <LoadError what="chats" onRetry={onRetry} />
        ) : threads.length === 0 ? (
          <EmptyState
            icon="message-circle"
            title="No conversations yet"
            body="Message a seller from any listing to arrange a campus meetup."
            action={
              <Button
                label="Browse listings"
                variant="primary"
                size="small"
                iconStart={<Icon name="search" size={14} color="#ffffff" />}
                onPress={onBrowse ?? (() => {})}
              />
            }
          />
        ) : (
          <View style={styles.stack}>
            {threads.map((thread) => {
              const listing = getListing(thread.listingId)
              const seller = getSeller(thread.sellerId)
              const needsReply = threadNeedsReply(thread)
              return (
                <View key={thread.id} style={styles.row}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`Chat with ${seller.name}`}
                    onPress={() => onOpen(thread.id)}
                    style={({ pressed }) => [styles.rowInner, pressed && styles.rowPressed]}
                  >
                    <Avatar initials={seller.initials} size="large" />
                    <View style={styles.rowBody}>
                      <View style={styles.nameRow}>
                        <Text numberOfLines={1} style={[typography.label, { color: colors.text }]}>
                          {seller.name}
                        </Text>
                        {needsReply && <Badge variant="warning" label="Respond" />}
                      </View>
                      <Text numberOfLines={1} style={[typography.meta, { color: colors.textSecondary }]}>
                        {listing
                          ? `${listing.status === 'sold' ? 'Sold · ' : ''}${listing.title}`
                          : 'Listing removed'}
                      </Text>
                      <Text numberOfLines={1} style={[typography.labelSm, { color: colors.textSecondary }]}>
                        {previewOf(thread)}
                      </Text>
                    </View>
                    {listing && (
                      <Image
                        source={{ uri: listing.imageUrl }}
                        style={styles.thumb}
                        resizeMode="cover"
                      />
                    )}
                  </Pressable>
                </View>
              )
            })}
          </View>
        )}
      </View>
    </View>
  )
}

/**
 * Self-contained default export wired to the live services — keeps the
 * AppShell contract (`onOpen` only) while rendering the exact web tree.
 */
export default function ChatListScreen({ onOpen }: { onOpen: (threadId: string) => void }) {
  const [threads, setThreads] = useState<Thread[] | null>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [sellers, setSellers] = useState<Seller[]>([])
  const [failed, setFailed] = useState(false)

  const load = useCallback(async () => {
    setFailed(false)
    try {
      const nextThreads = await services.chat.listThreads()
      const [nextListings, nextSellers] = await Promise.all([
        services.listings.getMany(nextThreads.map((thread) => thread.listingId)),
        services.profiles.getSellers([...new Set(nextThreads.map((thread) => thread.sellerId))]),
      ])
      setThreads(nextThreads)
      setListings(nextListings)
      setSellers(nextSellers)
    } catch {
      setFailed(true)
      setThreads([])
    }
  }, [])

  useEffect(() => {
    void load()
    const unsubscribe = services.chat.subscribe(() => void load())
    return () => {
      unsubscribe()
    }
  }, [load])

  const listingsById = useMemo(() => new Map(listings.map((listing) => [listing.id, listing])), [listings])
  const sellersById = useMemo(() => new Map(sellers.map((seller) => [seller.id, seller])), [sellers])

  const getListing = (id: string): Listing | undefined => listingsById.get(id)
  const getSeller = (id: string): Seller =>
    sellersById.get(id) ||
    SELLERS.find((seller) => seller.id === id) || {
      id,
      name: 'TIP Student',
      initials: 'TS',
      program: 'Verified student',
      year: '',
      campus: 'qc',
      verified: true,
    }

  return (
    <ChatListScreenBody
      threads={threads ?? []}
      loading={threads === null}
      error={failed}
      onRetry={() => void load()}
      getListing={getListing}
      getSeller={getSeller}
      onOpen={onOpen}
    />
  )
}

const styles = StyleSheet.create({
  // div.flex.flex-1.flex-col
  root: { flex: 1, flexDirection: 'column' },
  // div.px-xl.pb-xl
  pad: { paddingHorizontal: spacing.xl, paddingBottom: spacing.xl },
  // ul/div.overflow-hidden.rounded-corner-lg.bg-surface-bg
  stack: {
    overflow: 'hidden',
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
  },
  // li.border-b.border-border-secondary.last:border-b-0
  row: {
    borderBottomWidth: 1,
    borderBottomColor: colors.borderSecondary,
  },
  // Pressable.flex.items-center.gap-lg.p-lg (hover:bg-surface-hover -> pressed)
  rowInner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.lg,
    padding: spacing.lg,
  },
  rowPressed: { backgroundColor: colors.surfaceHover, opacity: 0.9, transform: [{ scale: 0.99 }] },
  // div.min-w-0.flex-1
  rowBody: { minWidth: 0, flex: 1 },
  // div.flex.items-center.gap-sm
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.sm },
  // img.size-12.rounded-corner-md.object-cover
  thumb: { width: 48, height: 48, flexShrink: 0, borderRadius: radius.md },
})
