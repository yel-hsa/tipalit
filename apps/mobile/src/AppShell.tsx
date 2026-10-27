import { useCallback, useRef, useState } from 'react'
import {
  Animated,
  Easing,
  StyleSheet,
  useWindowDimensions,
  View,
} from 'react-native'
import type { Listing } from '@tipalit/services/types'
import { colors } from './theme'
import { BottomTabBar } from './components/ported'
import FeedScreen from './screens/FeedScreen'
import ListingDetailScreen from './screens/ListingDetailScreen'
import SellScreen from './screens/SellScreen'
import ChatListScreen from './screens/ChatListScreen'
import ChatThreadScreen from './screens/ChatThreadScreen'
import ProfileScreen from './screens/ProfileScreen'

type Tab = 'feed' | 'sell' | 'chats' | 'profile'
type Overlay =
  | { kind: 'listing'; listing: Listing }
  | { kind: 'edit'; listing: Listing }
  | { kind: 'thread'; threadId: string }
  | null

export default function AppShell() {
  const { width } = useWindowDimensions()
  const screenWidth = width > 0 ? width : 400
  const searchParams = typeof window !== 'undefined' ? new URLSearchParams(window.location.search) : null
  const initialTab = ['feed', 'sell', 'chats', 'profile'].includes(searchParams?.get('tab') || '')
    ? (searchParams!.get('tab') as Tab)
    : 'feed'
  const [tab, setTab] = useState<Tab>(initialTab)
  const [displayedOverlay, setDisplayedOverlay] = useState<Overlay>(null)
  const [feedVersion, setFeedVersion] = useState(0)

  const slideAnim = useRef(new Animated.Value(screenWidth)).current

  const openOverlay = useCallback(
    (next: Overlay) => {
      if (!next) return
      setDisplayedOverlay(next)
      slideAnim.setValue(screenWidth)
      Animated.spring(slideAnim, {
        toValue: 0,
        damping: 26,
        stiffness: 280,
        mass: 0.8,
        useNativeDriver: true,
      }).start()
    },
    [screenWidth, slideAnim],
  )

  const switchOverlay = useCallback((next: Overlay) => {
    setDisplayedOverlay(next)
  }, [])

  const closeOverlay = useCallback(
    (afterClose?: () => void) => {
      Animated.timing(slideAnim, {
        toValue: screenWidth,
        duration: 220,
        easing: Easing.out(Easing.cubic),
        useNativeDriver: true,
      }).start(() => {
        setDisplayedOverlay(null)
        afterClose?.()
      })
    },
    [screenWidth, slideAnim],
  )

  return (
    <View style={styles.root}>
      <View style={styles.body}>
        {tab === 'feed' && (
          <FeedScreen
            key={feedVersion}
            onOpen={(listing) => openOverlay({ kind: 'listing', listing })}
            onSell={() => setTab('sell')}
            onOpenProfile={() => setTab('profile')}
            onOpenPromotion={() => undefined}
          />
        )}
        {tab === 'sell' && (
          <SellScreen
            onCancel={() => setTab('feed')}
            onPublished={() => {
              setFeedVersion((version) => version + 1)
              setTab('feed')
            }}
          />
        )}
        {tab === 'chats' && (
          <ChatListScreen onOpen={(threadId) => openOverlay({ kind: 'thread', threadId })} />
        )}
        {tab === 'profile' && (
          <ProfileScreen
            onOpen={(listing) => openOverlay({ kind: 'listing', listing })}
            onOpenPromotion={() => undefined}
            onSell={() => setTab('sell')}
          />
        )}
      </View>
      <BottomTabBar
        active={tab === 'feed' ? 'home' : tab}
        onSelect={(next) => {
          if (next !== 'admin') {
            setTab(next === 'home' ? 'feed' : next)
          }
        }}
      />

      {displayedOverlay && (
        <Animated.View
          style={[
            StyleSheet.absoluteFill,
            styles.overlayWrapper,
            { transform: [{ translateX: slideAnim }] },
          ]}
        >
          {displayedOverlay.kind === 'listing' && (
            <ListingDetailScreen
              listing={displayedOverlay.listing}
              onBack={() => closeOverlay()}
              onEdit={(listing) => switchOverlay({ kind: 'edit', listing })}
              onMessage={(threadId) => switchOverlay({ kind: 'thread', threadId })}
            />
          )}
          {displayedOverlay.kind === 'edit' && (
            <SellScreen
              listing={displayedOverlay.listing}
              onCancel={() => switchOverlay({ kind: 'listing', listing: displayedOverlay.listing })}
              onPublished={() => {
                setFeedVersion((version) => version + 1)
                closeOverlay(() => setTab('profile'))
              }}
            />
          )}
          {displayedOverlay.kind === 'thread' && (
            <ChatThreadScreen
              threadId={displayedOverlay.threadId}
              onBack={() => closeOverlay()}
              onOpenListing={(listing) => switchOverlay({ kind: 'listing', listing })}
            />
          )}
        </Animated.View>
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.bg },
  body: { flex: 1 },
  overlayWrapper: {
    backgroundColor: colors.bg,
    zIndex: 100,
  },
})
