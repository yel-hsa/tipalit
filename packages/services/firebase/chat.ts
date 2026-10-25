import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  query,
  where,
  orderBy,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { onAuthStateChanged, type User } from 'firebase/auth'
import { SEED_THREADS } from '../seed'
import { ServiceError } from '../errors'
import { createId } from '../ids'
import type { ChatEvent, ChatItem, ChatService, Listing, MeetupItem, Thread } from '../types'
import { getFirebaseAuth, getFirebaseDb, isFirebaseConfigured } from './config'

export function createFirebaseChat(): ChatService {
  const db = getFirebaseDb()
  const auth = getFirebaseAuth()
  const listeners = new Set<(event: ChatEvent) => void>()

  const getCurrentUserId = (): string => {
    const user = auth.currentUser
    if (!user) {
      return 'anonymous_user'
    }
    return user.uid
  }

  const emit = (event: ChatEvent) => listeners.forEach((l) => l(event))

  return {
    async listThreads(): Promise<Thread[]> {
      if (!isFirebaseConfigured()) {
        return structuredClone(SEED_THREADS)
      }

      // 'anonymous_user' never matches a chats doc, so the participant rule denies the query
      const user = auth.currentUser
      if (!user) return []
      const uid = user.uid

      // no fallback here: failures must surface, not become fabricated demo threads
      const chatsCol = collection(db, 'chats')
      const qBuyer = query(chatsCol, where('buyer_id', '==', uid))
      const qSeller = query(chatsCol, where('seller_id', '==', uid))

      const [snapBuyer, snapSeller] = await Promise.all([
        getDocs(qBuyer),
        getDocs(qSeller),
      ])

      const chatDocs = new Map<string, any>()
      snapBuyer.forEach((d) => chatDocs.set(d.id, { id: d.id, ...d.data() }))
      snapSeller.forEach((d) => chatDocs.set(d.id, { id: d.id, ...d.data() }))

      const threads: Thread[] = []
      for (const [chatId, data] of chatDocs.entries()) {
        const messagesCol = collection(db, 'chats', chatId, 'messages')
        const messagesQuery = query(messagesCol, orderBy('created_at', 'asc'))
        const messagesSnap = await getDocs(messagesQuery)

        const items: ChatItem[] = []
        messagesSnap.forEach((mDoc) => {
          const mData = mDoc.data()
          const from: 'me' | 'seller' = mData.sender_id === uid ? 'me' : 'seller'

          if (mData.message_type === 'meetup_proposal' || mData.kind === 'meetup') {
            items.push({
              id: mDoc.id,
              kind: 'meetup',
              from,
              time: mData.time || mData.meetup_time || '1:00 PM',
              location: mData.location || mData.meetup_spot || 'Library Plaza',
              status: mData.status || 'pending',
              completed: mData.completed,
              rating: mData.rating,
            })
          } else {
            items.push({
              id: mDoc.id,
              kind: 'message',
              from,
              text: mData.content || mData.text || '',
            })
          }
        })

        threads.push({
          id: chatId,
          listingId: data.listing_id || data.listingId,
          sellerId: data.seller_id || data.sellerId,
          items,
        })
      }

      return threads
    },

    async openThread(listing: Pick<Listing, 'id' | 'sellerId'>): Promise<Thread> {
      const uid = getCurrentUserId()
      const threadId = createId('t')

      if (!isFirebaseConfigured()) {
        const existing = SEED_THREADS.find((t) => t.listingId === listing.id)
        if (existing) return existing
        return {
          id: threadId,
          listingId: listing.id,
          sellerId: listing.sellerId,
          items: [],
        }
      }

      try {
        const chatsCol = collection(db, 'chats')
        const q = query(
          chatsCol,
          where('listing_id', '==', listing.id),
          where('buyer_id', '==', uid),
        )
        const snap = await getDocs(q)
        if (!snap.empty) {
          const docSnap = snap.docs[0]
          return {
            id: docSnap.id,
            listingId: listing.id,
            sellerId: listing.sellerId,
            items: [],
          }
        }

        const newChatRef = doc(chatsCol, threadId)
        await setDoc(newChatRef, {
          listing_id: listing.id,
          buyer_id: uid,
          seller_id: listing.sellerId,
          last_message: '',
          updated_at: new Date().toISOString(),
          created_at: serverTimestamp(),
        })

        return {
          id: threadId,
          listingId: listing.id,
          sellerId: listing.sellerId,
          items: [],
        }
      } catch (err) {
        // app.tsx needs the error to stop navigating and show its toast
        console.error('[TIPalit Firebase Chat] Error opening thread:', err)
        if (err instanceof ServiceError) throw err
        throw new ServiceError('network', "Couldn't open the chat.")
      }
    },

    async sendMessage(threadId: string, message: { id: string; text: string }): Promise<ChatItem> {
      const uid = getCurrentUserId()
      const item: ChatItem = {
        id: message.id,
        kind: 'message',
        from: 'me',
        text: message.text,
      }

      if (isFirebaseConfigured()) {
        try {
          const messageDocRef = doc(db, 'chats', threadId, 'messages', message.id)
          const nowIso = new Date().toISOString()
          await setDoc(messageDocRef, {
            chat_id: threadId,
            sender_id: uid,
            content: message.text,
            message_type: 'text',
            is_read: false,
            created_at: nowIso,
          })

          const chatDocRef = doc(db, 'chats', threadId)
          await updateDoc(chatDocRef, {
            last_message: message.text,
            updated_at: nowIso,
          }).catch(() => {})
        } catch (err) {
          console.error('[TIPalit Firebase Chat] Send message error:', err)
          throw new ServiceError('network', "Couldn't send message.")
        }
      }

      emit({ type: 'message', threadId, item })
      return item
    },

    async proposeMeetup(
      threadId: string,
      proposal: { id: string; location: string; time: string },
    ): Promise<MeetupItem> {
      const uid = getCurrentUserId()
      const item: MeetupItem = {
        id: proposal.id,
        kind: 'meetup',
        from: 'me',
        time: proposal.time,
        location: proposal.location,
        status: 'pending',
      }

      if (isFirebaseConfigured()) {
        try {
          const messageDocRef = doc(db, 'chats', threadId, 'messages', proposal.id)
          const nowIso = new Date().toISOString()
          await setDoc(messageDocRef, {
            chat_id: threadId,
            sender_id: uid,
            message_type: 'meetup_proposal',
            kind: 'meetup',
            location: proposal.location,
            meetup_spot: proposal.location,
            time: proposal.time,
            meetup_time: proposal.time,
            status: 'pending',
            is_read: false,
            created_at: nowIso,
          })

          // the chat doc's allowlist covers only metadata; the meetup lives on the message
          const chatDocRef = doc(db, 'chats', threadId)
          await updateDoc(chatDocRef, { updated_at: nowIso }).catch(() => {})
        } catch (err) {
          console.error('[TIPalit Firebase Chat] Propose meetup error:', err)
          throw new ServiceError('network', "Couldn't send meetup proposal.")
        }
      }

      emit({ type: 'meetupUpdated', threadId, item })
      return item
    },

    async respondToMeetup(
      threadId: string,
      itemId: string,
      status: 'accepted' | 'declined',
      reply: { id: string; text: string },
    ): Promise<void> {
      if (isFirebaseConfigured()) {
        try {
          const messageDocRef = doc(db, 'chats', threadId, 'messages', itemId)
          await updateDoc(messageDocRef, {
            status,
            updated_at: new Date().toISOString(),
          })
          await this.sendMessage(threadId, reply)
        } catch (err) {
          console.error('[TIPalit Firebase Chat] Respond to meetup error:', err)
          if (err instanceof ServiceError) throw err
          throw new ServiceError('network', "Couldn't send your response.")
        }
      }
    },

    async completeMeetup(threadId: string, itemId: string): Promise<void> {
      if (isFirebaseConfigured()) {
        try {
          const messageDocRef = doc(db, 'chats', threadId, 'messages', itemId)
          await updateDoc(messageDocRef, {
            completed: true,
            updated_at: new Date().toISOString(),
          })
        } catch (err) {
          console.error('[TIPalit Firebase Chat] Complete meetup error:', err)
          if (err instanceof ServiceError) throw err
          throw new ServiceError('network', "Couldn't mark the meetup done.")
        }
      }
    },

    async rate(
      threadId: string,
      itemId: string,
      rating: number,
      comment: string,
    ): Promise<void> {
      // review rules reject 'anonymous_user', so fail before writing half the exchange state
      const user = auth.currentUser
      if (!user) throw new ServiceError('unauthenticated', 'Sign in to leave a review.')
      const uid = user.uid
      if (isFirebaseConfigured()) {
        let chatData: Record<string, any> = {}
        try {
          // only the keys firestore.rules permits on a message update
          const messageDocRef = doc(db, 'chats', threadId, 'messages', itemId)
          await updateDoc(messageDocRef, {
            rating,
            rating_comment: comment || '',
            completed: true,
            updated_at: new Date().toISOString(),
          })

          const chatSnap = await getDoc(doc(db, 'chats', threadId))
          chatData = chatSnap.exists() ? chatSnap.data() : {}
        } catch (err) {
          console.error('[TIPalit Firebase Chat] Rate review error:', err)
          if (err instanceof ServiceError) throw err
          throw new ServiceError('network', "Couldn't save your rating.")
        }

        const listingId = (chatData.listing_id || chatData.listingId || '') as string
        const chatSellerId = (chatData.seller_id || chatData.sellerId || '') as string
        const buyerId = (chatData.buyer_id || chatData.buyerId || '') as string

        // older chat docs may predate seller_id; fall back to the listing
        let sellerId = chatSellerId
        if (!sellerId && listingId) {
          try {
            const listingSnap = await getDoc(doc(db, 'listings', listingId))
            if (listingSnap.exists()) {
              const listingData = listingSnap.data()
              sellerId = (listingData.seller_id || listingData.sellerId || '') as string
            }
          } catch (err) {
            console.warn('[TIPalit Firebase Chat] Could not resolve the listing seller:', err)
          }
        }

        // the reviewee is the counterparty; never review yourself
        let revieweeId = ''
        if (uid && uid === sellerId) revieweeId = buyerId
        else if (sellerId && sellerId !== uid) revieweeId = sellerId
        if (!revieweeId || revieweeId === uid) {
          throw new ServiceError('invalid', 'This exchange has no one left to review.')
        }

        try {
          const reviewDocRef = doc(collection(db, 'reviews'))
          await setDoc(reviewDocRef, {
            chat_id: threadId,
            listing_id: listingId,
            meetup_message_id: itemId,
            reviewer_id: uid,
            reviewee_id: revieweeId,
            rating,
            comment: comment || '',
            rating_comment: comment || '',
            created_at: new Date().toISOString(),
          })
        } catch (err) {
          console.error('[TIPalit Firebase Chat] Rate review error:', err)
          if (err instanceof ServiceError) throw err
          throw new ServiceError('network', "Couldn't save your rating.")
        }
      }
    },

    async setListingStatus(
      threadId: string,
      status: Extract<Listing['status'], 'reserved' | 'sold'>,
    ): Promise<void> {
      if (!isFirebaseConfigured()) return
      try {
        const chatDocRef = doc(db, 'chats', threadId)
        const chatSnap = await getDoc(chatDocRef)
        if (!chatSnap.exists()) return
        const data = chatSnap.data()
        const listingId = data.listing_id || data.listingId
        if (!listingId) return
        const listingDocRef = doc(db, 'listings', listingId)
        await updateDoc(listingDocRef, {
          status,
          updated_at: new Date().toISOString(),
        })
      } catch (err) {
        console.error('[TIPalit Firebase Chat] setListingStatus error:', err)
        throw new ServiceError('network', "Couldn't update the listing.")
      }
    },

    subscribe(listener: (event: ChatEvent) => void): () => void {
      listeners.add(listener)

      const unsubFires: Array<() => void> = []

      if (isFirebaseConfigured()) {
        // rules deny chat queries for an unresolved uid, so wait for auth to resolve
        onAuthStateChanged(
          auth,
          (user) => {
            if (!user || unsubFires.length > 0) return
            const uid = user.uid
            const chatsCol = collection(db, 'chats')
            const messageUnsubs = new Map<string, () => void>()

            const watchMessages = (chatId: string) => {
              if (messageUnsubs.has(chatId)) return
              const messagesQuery = query(collection(db, 'chats', chatId, 'messages'), orderBy('created_at', 'asc'))
              const stop = onSnapshot(
                messagesQuery,
                (snapshot) => {
                  snapshot.docChanges().forEach((change) => {
                    // only newly written docs; edits arrive via reload
                    if (change.type !== 'added') return
                    const data = change.doc.data()
                    // skip our own writes; sendMessage/proposeMeetup already emit them
                    if (data.sender_id === uid) return
                    const from: 'me' | 'seller' = 'seller'
                    if (data.message_type === 'meetup_proposal' || data.kind === 'meetup') {
                      const item: MeetupItem = {
                        id: change.doc.id,
                        kind: 'meetup',
                        from,
                        time: data.time || data.meetup_time || '1:00 PM',
                        location: data.location || data.meetup_spot || 'Library Plaza',
                        status: data.status || 'pending',
                        completed: data.completed,
                        rating: data.rating,
                      }
                      emit({ type: 'meetupUpdated', threadId: chatId, item })
                    } else {
                      const item: ChatItem = {
                        id: change.doc.id,
                        kind: 'message',
                        from,
                        text: data.content || data.text || '',
                      }
                      emit({ type: 'message', threadId: chatId, item })
                    }
                  })
                },
                (error) => {
                  console.warn('[TIPalit Firebase Chat] messages onSnapshot error:', error)
                },
              )
              messageUnsubs.set(chatId, stop)
            }

            const watchChats = (q: ReturnType<typeof query>) => {
              const stop = onSnapshot(
                q,
                (snapshot) => {
                  snapshot.docChanges().forEach((change) => {
                    if (change.type === 'added' || change.type === 'modified') watchMessages(change.doc.id)
                    // removed chats stop listening; the thread list reload drops them
                  })
                },
                (error) => {
                  console.warn('[TIPalit Firebase Chat] chats onSnapshot error:', error)
                },
              )
              unsubFires.push(stop)
            }

            watchChats(query(chatsCol, where('buyer_id', '==', uid)))
            watchChats(query(chatsCol, where('seller_id', '==', uid)))

            unsubFires.push(() => {
              messageUnsubs.forEach((stop) => stop())
              messageUnsubs.clear()
            })
          },
          (err) => console.warn('[TIPalit Firebase Chat] auth watch error:', err),
        )
      }
      return () => {
        listeners.delete(listener)
        unsubFires.forEach((stop) => stop())
      }
    },
  }
}
