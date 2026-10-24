import { Avatar, Badge, Button } from '@figma/astraui'
import { MessageCircle, Search } from 'lucide-react'
import EmptyState from '../components/EmptyState'
import LoadError from '../components/LoadError'
import Pressable from '../components/Pressable'
import ScreenHeader from '../components/ScreenHeader'
import { ChatRowSkeleton } from '../components/Skeleton'
import { threadNeedsReply } from '../data/seed'
import type { Listing, Seller, Thread } from '../services/types'

type ChatListScreenProps = {
  threads: Thread[]
  loading: boolean
  error: boolean
  onRetry: () => void
  getListing: (id: string) => Listing | undefined
  getSeller: (id: string) => Seller
  onOpen: (threadId: string) => void
  onBrowse: () => void
}

const previewOf = (thread: Thread) => {
  const last = thread.items[thread.items.length - 1]
  if (!last) return 'Say hi to start the conversation'
  const prefix = last.from === 'me' ? 'You: ' : ''
  if (last.kind === 'message') return `${prefix}${last.text}`
  const status = last.status === 'pending' ? 'proposed' : last.status
  return `${prefix}Meetup ${status} \u00b7 ${last.time}`
}

export default function ChatListScreen({
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
    <div className="flex flex-1 flex-col">
      <ScreenHeader title="Chats" subtitle="Arrange meetups with verified sellers" />

      <div className="px-xl pb-xl">
        {loading ? (
          <div role="status" aria-label="Loading chats" className="overflow-hidden rounded-corner-lg bg-surface-bg">
            {[0, 1, 2, 3].map((key) => (
              <ChatRowSkeleton key={key} />
            ))}
          </div>
        ) : error ? (
          <LoadError what="chats" onRetry={onRetry} />
        ) : threads.length === 0 ? (
          <EmptyState
            icon={MessageCircle}
            title="No conversations yet"
            body="Message a seller from any listing to arrange a campus meetup."
            action={
              <Button variant="primary" size="small" iconStart={<Search size={14} />} onClick={onBrowse} className="touch-hit">
                Browse listings
              </Button>
            }
          />
        ) : (
          <ul className="overflow-hidden rounded-corner-lg bg-surface-bg">
            {threads.map((thread) => {
              const listing = getListing(thread.listingId)
              const seller = getSeller(thread.sellerId)
              const needsReply = threadNeedsReply(thread)
              return (
                <li key={thread.id} className="border-b border-border-secondary last:border-b-0">
                  <Pressable
                    onPress={() => onOpen(thread.id)}
                    className="flex items-center gap-lg p-lg hover:bg-surface-hover"
                  >
                    <Avatar type="initial" initials={seller.initials} size="large" />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-sm">
                        <p className="text-label text-text-primary truncate">{seller.name}</p>
                        {needsReply && <Badge variant="warning" label="Respond" />}
                      </div>
                      <p className="text-caption-sm text-text-secondary truncate">
                        {listing ? `${listing.status === 'sold' ? 'Sold \u00b7 ' : ''}${listing.title}` : 'Listing removed'}
                      </p>
                      <p className="text-label-sm text-text-secondary truncate">{previewOf(thread)}</p>
                    </div>
                    {listing && (
                      <img
                        src={listing.imageUrl}
                        alt=""
                        loading="lazy"
                        className="size-12 shrink-0 rounded-corner-md object-cover"
                      />
                    )}
                  </Pressable>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </div>
  )
}
