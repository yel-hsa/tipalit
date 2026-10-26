import { useState } from 'react'
import { Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import type { Listing } from '@tipalit/services/types'
import { useSession } from './session'
import { colors, typography, space } from './theme'
import FeedScreen from './screens/FeedScreen'
import ListingDetailScreen from './screens/ListingDetailScreen'
import SellScreen from './screens/SellScreen'
import ChatListScreen from './screens/ChatListScreen'
import ChatThreadScreen from './screens/ChatThreadScreen'
import ProfileScreen from './screens/ProfileScreen'
import AdminScreen from './screens/AdminScreen'
import AdminSignInScreen from './screens/AdminSignInScreen'

type Tab = 'feed' | 'sell' | 'chats' | 'profile' | 'admin'
type Overlay =
  | { kind: 'listing'; listing: Listing }
  | { kind: 'edit'; listing: Listing }
  | { kind: 'thread'; threadId: string }
  | null

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

  const tabs = [...TABS, { id: 'admin' as Tab, label: 'Admin' }]

  if (overlay?.kind === 'listing') {
    return (
      <ListingDetailScreen
        listing={overlay.listing}
        onBack={() => setOverlay(null)}
        onEdit={(listing) => setOverlay({ kind: 'edit', listing })}
        onMessage={(threadId) => setOverlay({ kind: 'thread', threadId })}
      />
    )
  }

  if (overlay?.kind === 'edit') {
    return (
      <SellScreen
        listing={overlay.listing}
        onCancel={() => setOverlay({ kind: 'listing', listing: overlay.listing })}
        onPublished={() => {
          setFeedVersion((version) => version + 1)
          setOverlay(null)
          setTab('profile')
        }}
      />
    )
  }

  if (overlay?.kind === 'thread') {
    return (
      <ChatThreadScreen
        threadId={overlay.threadId}
        onBack={() => setOverlay(null)}
        onOpenListing={(listing) => setOverlay({ kind: 'listing', listing })}
      />
    )
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
        {tab === 'profile' && (
          <ProfileScreen
            onOpen={(listing) => setOverlay({ kind: 'listing', listing })}
            onOpenPromotion={() => undefined}
            onSell={() => setTab('sell')}
          />
        )}
        {tab === 'admin' && (isAdmin ? <AdminScreen /> : <AdminSignInScreen onBack={() => setTab('feed')} />)}
      </View>
      <View style={styles.tabBar}>
        {tabs.map((item) => (
          <Pressable
            key={item.id}
            accessibilityRole="tab"
            accessibilityLabel={item.label}
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
    // App.tsx wraps the tree in SafeAreaView, which only insets on iOS; Android
    // draws under the gesture bar, so reserve the same 8pt there.
    paddingBottom: Platform.OS === 'android' ? space(4) : space(2),
  },
  tab: { flex: 1, alignItems: 'center', justifyContent: 'center', minHeight: 48, paddingVertical: space(3) },
  tabLabel: { ...typography.meta, color: colors.muted },
  tabLabelActive: { color: colors.accent, fontWeight: '600' },
})
