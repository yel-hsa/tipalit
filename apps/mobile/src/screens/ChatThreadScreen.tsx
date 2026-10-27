// chat thread screen

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { FlatList, Image, KeyboardAvoidingView, Platform, Pressable, StyleSheet, Text, View } from 'react-native'
import { services } from '@tipalit/services'
import { createId } from '@tipalit/services/ids'
import { campusLabel, priceLabel } from '@tipalit/services/seed'
import { initialsOf } from '@tipalit/services/profile'
import type { ChatItem, Listing, MeetupItem, Seller, Thread } from '@tipalit/services/types'
import { colors, radius, typography, space } from '../theme'
import { useSession } from '../session'
import {
  Avatar,
  Icon,
  IconButton,
  InlineAlert,
  InputField,
  MeetupPickerSheet,
  MeetupProposalCard,
  MessageBubble,
  RateModal,
  ReportModal,
  type ReportTarget,
} from '../components/ported'

type ChatThreadScreenProps = {
  threadId: string
  onBack: () => void
  onOpenListing: (listing: Listing) => void
}

export default function ChatThreadScreen({ threadId, onBack, onOpenListing }: ChatThreadScreenProps) {
  const { profile } = useSession()
  const [thread, setThread] = useState<Thread | null>(null)
  const [listing, setListing] = useState<Listing | undefined>(undefined)
  const [seller, setSeller] = useState<Seller | null>(null)
  const [sellerTyping, setSellerTyping] = useState(false)
  const [draft, setDraft] = useState('')
  const [pickerOpen, setPickerOpen] = useState(false)
  const [rateTarget, setRateTarget] = useState<{ itemId: string } | null>(null)
  const [reportTarget, setReportTarget] = useState<ReportTarget | null>(null)
  const [spots, setSpots] = useState<string[]>([])
  const listRef = useRef<FlatList<ChatItem>>(null)

  const userInitials = initialsOf(profile?.name ?? '')

  const load = useCallback(async () => {
    try {
      const threads = await services.chat.listThreads()
      const found = threads.find((item) => item.id === threadId) ?? null
      setThread(found)
      if (found) {
        const [listings, sellers] = await Promise.all([
          services.listings.getMany([found.listingId]),
          services.profiles.getSellers([found.sellerId]),
        ])
        setListing(listings[0])
        setSeller(sellers[0] ?? null)
      }
    } catch {
      // the web screen renders nothing without a thread; keep the last state
    }
  }, [threadId])

  useEffect(() => {
    void load()
    void services.settings.getMeetupSpots().then((all) => {
      // spots resolve per listing campus once the listing is known
      setSpots(all.qc)
    })
    const unsubscribe = services.chat.subscribe((event) => {
      if (event.type === 'typing') {
        setSellerTyping(event.threadId === threadId ? event.typing : false)
        return
      }
      if (event.threadId === threadId) void load()
    })
    return () => {
      unsubscribe()
    }
  }, [load, threadId])

  // the picker uses the listing's campus spots, like App.tsx does
  useEffect(() => {
    if (!listing) return
    void services.settings.getMeetupSpots().then((all) => setSpots(all[listing.campus]))
  }, [listing])

  const send = async () => {
    const text = draft.trim()
    if (!text) return
    setDraft('')
    try {
      await services.chat.sendMessage(threadId, { id: createId('m'), text })
    } catch {
      // web shows a toast; the item simply stays unsent here
    }
  }

  const respond = async (itemId: string, status: 'accepted' | 'declined') => {
    const reply = { id: createId('m'), text: status === 'accepted' ? 'See you there!' : 'Can we pick another time?' }
    try {
      await services.chat.respondToMeetup(threadId, itemId, status, reply)
    } catch {
      // web rolls back optimistically; the subscribe refresh restores state
      void load()
    }
  }

  const complete = async (itemId: string) => {
    try {
      await services.chat.completeMeetup(threadId, itemId)
      setRateTarget({ itemId })
    } catch {
      void load()
    }
  }

  const rate = async (itemId: string) => {
    setRateTarget({ itemId })
  }

  const submitRating = async (rating: number, comment: string) => {
    const itemId = rateTarget?.itemId
    setRateTarget(null)
    if (!itemId) return
    try {
      await services.chat.rate(threadId, itemId, rating, comment)
    } catch {
      void load()
    }
  }

  const submitReport = async (reason: string, details: string) => {
    if (!reportTarget) return true
    try {
      await services.reports.submit({
        id: createId('r'),
        target: { kind: reportTarget.kind, id: reportTarget.id },
        reason,
        details,
      })
      setReportTarget(null)
      return true
    } catch {
      return false
    }
  }

  const propose = async (proposal: { location: string; time: string }) => {
    setPickerOpen(false)
    try {
      await services.chat.proposeMeetup(threadId, { id: createId('mt'), ...proposal })
    } catch {
      void load()
    }
  }

  const firstName = (seller?.name ?? '').split(' ')[0]

  const renderItem = useCallback(({ item }: { item: ChatItem }) => {
    if (item.kind === 'message') {
      return (
        <MessageBubble
          text={item.text}
          fromMe={item.from === 'me'}
          initials={item.from === 'me' ? userInitials : (seller?.initials ?? '')}
        />
      )
    }
    return (
      <MeetupProposalCard
        item={{
          ...item,
          from: item.from === 'me' ? 'me' : 'them',
        }}
        onRespond={(status) => respond(item.id, status)}
        onProposeNew={() => setPickerOpen(true)}
        onComplete={() => complete(item.id)}
        onRate={() => rate(item.id)}
      />
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userInitials, seller?.initials])

  const listFooter = useMemo(
    () => (
      <>
        {sellerTyping && <Text style={styles.typing}>{firstName} is typing...</Text>}
      </>
    ),
    [sellerTyping, firstName],
  )

  if (!thread || !seller) return null

  return (
    <View style={styles.root}>
      <KeyboardAvoidingView style={styles.flex} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={styles.flex}>
          {/* header: sticky top-0 z-20 flex flex-col gap-md bg-surface-bg px-lg pb-md pt-md */}
          <View style={styles.header}>
            <View style={styles.headerRow}>
              <IconButton
                variant="subtle"
                accessibilityLabel="Back to chats"
                onPress={onBack}
                icon={<Icon name="arrow-left" size={16} color={colors.textSecondary} />}
              />
              <Avatar initials={seller.initials} size="medium" />
              <View style={styles.headerText}>
                <View style={styles.nameRow} accessibilityLabel={`${seller.name}, verified student`}>
                  <Text numberOfLines={1} style={[typography.label, { color: colors.text }]}>
                    {seller.name}
                  </Text>
                  <Icon name="shield-check" size={14} color={colors.brandPrimary} />
                </View>
                <View style={styles.ratingRow}>
                  <Text numberOfLines={1} style={[typography.meta, { color: colors.textSecondary }]}>
                    {seller.program}
                  </Text>
                  {seller.rating != null && (
                    <>
                      <Icon name="star" size={10} color={colors.accent} />
                      <Text style={[typography.meta, { color: colors.textSecondary }]}>
                        {seller.rating.toFixed(1)}
                      </Text>
                    </>
                  )}
                </View>
              </View>
              <IconButton
                variant="subtle"
                accessibilityLabel={`Report ${seller.name}`}
                onPress={() => setReportTarget({ kind: 'user', id: seller.id, name: seller.name })}
                icon={<Icon name="flag" size={16} color={colors.textSecondary} />}
              />
            </View>
            {listing ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel={`View listing: ${listing.title}`}
                onPress={() => onOpenListing(listing)}
                style={({ pressed }) => [styles.listingCard, pressed && styles.listingCardPressed]}
              >
                <Image
                  source={{ uri: listing.imageUrl }}
                  style={styles.listingImage}
                  accessibilityIgnoresInvertColors
                />
                <View style={styles.listingText}>
                  <Text numberOfLines={1} style={[typography.labelSm, { color: colors.text }]}>
                    {listing.title}
                  </Text>
                  <Text style={[typography.meta, { color: colors.textSecondary }]}>
                    {priceLabel(listing)} · {listing.courseCode}
                  </Text>
                </View>
                <Icon name="chevron-right" size={16} color={colors.textSecondary} />
              </Pressable>
            ) : (
              <View style={styles.listingRemoved}>
                <View style={styles.listingRemovedIcon}>
                  <Icon name="package-x" size={16} color={colors.text} />
                </View>
                <Text style={[typography.labelSm, { color: colors.textSecondary }]}>
                  Listing removed by the seller
                </Text>
              </View>
            )}
          </View>

          {/* messages: flex flex-1 flex-col gap-md p-xl */}
          <FlatList
            ref={listRef}
            data={thread.items}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.list}
            onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
            renderItem={renderItem}
            ListHeaderComponent={
              <>
                {listing?.status === 'sold' && (
                  <InlineAlert tone="info" icon="tag">
                    This item has been marked sold
                  </InlineAlert>
                )}
                <Text style={styles.notice}>Meet only at campus-approved spots</Text>
              </>
            }
            ListFooterComponent={listFooter}
          />
        </View>

        {/* composer: sticky bottom-0 flex items-center gap-sm border-t bg-surface-bg px-lg py-md */}
        <View style={styles.composer}>
          <IconButton
            variant="subtle"
            accessibilityLabel="Propose a meetup time"
            onPress={() => setPickerOpen(true)}
            icon={<Icon name="calendar-plus" size={16} color={colors.textSecondary} />}
          />
          <View style={styles.composerField}>
            <InputField
              value={draft}
              onChange={setDraft}
              placeholder="Message..."
              accessibilityLabel="Message"
            />
          </View>
          <IconButton
            variant="primary"
            accessibilityLabel="Send message"
            onPress={send}
            disabled={!draft.trim()}
            icon={<Icon name="send" size={16} color="#ffffff" />}
          />
        </View>
      </KeyboardAvoidingView>

      {pickerOpen && listing && (
        <MeetupPickerSheet
          key={thread.id}
          isOpen
          onClose={() => setPickerOpen(false)}
          spots={spots}
          campusLabel={campusLabel(listing.campus)}
          defaultLocation={listing.meetupSpot}
          onSubmit={propose}
        />
      )}

      {rateTarget && (
        <RateModal
          isOpen
          seller={seller}
          listingTitle={listing?.title}
          onClose={() => setRateTarget(null)}
          onSubmit={submitRating}
        />
      )}

      {reportTarget && (
        <ReportModal
          isOpen
          target={reportTarget}
          onClose={() => setReportTarget(null)}
          onSubmit={submitReport}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: colors.brandTertiary },
  flex: { flex: 1 },
  // header: gap-md(8) bg-surface-bg px-lg(12) pb-md(8) pt-md(8)
  header: { gap: 8, backgroundColor: colors.surface, paddingHorizontal: 12, paddingBottom: 8, paddingTop: 8 },
  headerRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  headerText: { minWidth: 0, flex: 1 },
  nameRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // program + rating row: text-caption-sm with inline 10px accent star, gap-xs
  ratingRow: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  // listing card: flex items-center gap-md(8) rounded-8 bg-bg-faint p-sm(6)
  listingCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bgFaint,
    padding: 6,
  },
  listingCardPressed: { backgroundColor: colors.bgHover },
  // image: size-10 (40) rounded-4
  listingImage: { width: 40, height: 40, borderRadius: radius.sm },
  listingText: { minWidth: 0, flex: 1 },
  // removed: flex items-center gap-md(8) rounded-8 bg-bg-faint p-sm(6)
  listingRemoved: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    borderRadius: radius.md,
    backgroundColor: colors.bgFaint,
    padding: 6,
  },
  listingRemovedIcon: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: radius.sm,
    backgroundColor: colors.bgSubtle,
  },
  // list: gap-md(8) p-xl(16)
  list: { gap: 8, padding: 16, flexGrow: 1 },
  // typing: text-caption-sm text-text-secondary
  typing: { ...typography.meta, color: colors.textSecondary },
  // notice pill: self-center rounded-full bg-surface-bg px-md(8) py-xs(4) text-caption-sm
  notice: {
    alignSelf: 'center',
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    paddingHorizontal: 8,
    paddingVertical: 4,
    ...typography.meta,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  // composer: items-center gap-sm(6) border-t bg-surface-bg px-lg(12) py-md(8)
  composer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    borderTopColor: colors.borderSecondary,
    backgroundColor: colors.surface,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  composerField: { minWidth: 0, flex: 1 },
})
