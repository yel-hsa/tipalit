import { useState } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import type { Listing } from '@tipalit/services/types'
import { useSession } from './session'
import { colors, space } from './theme'
import FeedScreen from './screens/FeedScreen'
import ListingDetailScreen from './screens/ListingDetailScreen'
import SellScreen from './screens/SellScreen'
import ChatListScreen from './screens/ChatListScreen'
import ChatThreadScreen from './screens/ChatThreadScreen'
import ProfileScreen from './screens/ProfileScreen'
import AdminScreen from './screens/AdminScreen'

type Tab = 'feed' | 'sell' | 'chats' | 'profile' | 'admin'
type Overlay = { kind: 'listing'; listing: Listing } | { kind: 'thread'; threadId: string } | null

const TABS: { id: Tab; label: string }[] = [
  { id: 'feed', label: 'Feed' },
  { id: 'sell', label: 'Sell' },
  { id: 'chats', label: 'Chats' },
  { id: 'profile', label: 'Profile' },
]

export default function AppShell() {
  const { isAdmin } = useSession()
  const [tab, setTab] = useState<Tab>('feed')
  const [overlay, setOverlay] = useState<Overlay>(null)
  const [feedVersion, setFeedVersion] = useState(0)

  const tabs = isAdmin ? [...TABS, { id: 'admin' as Tab, label: 'Admin' }] : TABS

  if (overlay?.kind === 'listing') {
    return (
      <ListingDetailScreen
        listing={overlay.listing}
        onBack={() => setOverlay(null)}
        onMessage={(threadId) => setOverlay({ kind: 'thread', threadId })}
      />
    )
  }

  if (overlay?.kind === 'thread') {
    return <ChatThreadScreen threadId={overlay.threadId} onBack={() => setOverlay(null)} />
  }

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {tab === 'feed' && (
          <FeedScreen key={feedVersion} onOpen={(listing) => setOverlay({ kind: 'listing', listing })} />
        )}
        {tab === 'sell' && (
          <SellScreen
            onPublished={() => {
              setFeedVersion((version) => version + 1)
              setTab('feed')
            }}
          />
        )}
        {tab === 'chats' && <ChatListScreen onOpen={(threadId) => setOverlay({ kind: 'thread', threadId })} />}
        {tab === 'profile' && <ProfileScreen onOpen={(listing) => setOverlay({ kind: 'listing', listing })} />}
        {tab === 'admin' && isAdmin && <AdminScreen />}
      </View>
      <View style={styles.tabBar}>
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityState={{ selected: tab === item.id }}
            onPress={() => setTab(item.id)}
            style={styles.tab}
          >
            <Text style={[styles.tabLabel, tab === item.id && styles.tabLabelActive]}>{item.label}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  tabBar: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: colors.border,
    backgroundColor: colors.surface,
    paddingBottom: space(2),
  },
  tab: { flex: 1, alignItems: 'center', paddingVertical: space(3) },
  tabLabel: { fontSize: 12, color: colors.muted },
  tabLabelActive: { color: colors.accent, fontWeight: '700' },
})
