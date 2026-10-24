import { Avatar, IconButton, InputField } from '@figma/astraui'
import { ArrowLeft, CalendarPlus, ChevronRight, Flag, PackageX, Send, ShieldCheck, Star, Tag } from 'lucide-react'
import { useEffect, useRef, useState, type FormEvent } from 'react'
import InlineAlert from '../components/InlineAlert'
import MeetupProposalCard from '../components/MeetupProposalCard'
import MessageBubble from '../components/MessageBubble'
import Pressable from '../components/Pressable'
import { priceLabel } from '../data/seed'
import type { Listing, Seller, Thread } from '../services/types'

type ChatThreadScreenProps = {
  thread: Thread
  listing: Listing | undefined
  seller: Seller
  userInitials: string
  sellerTyping: boolean
  onBack: () => void
  onOpenListing: () => void
  onSend: (text: string) => void
  onPropose: () => void
  onRespond: (itemId: string, status: 'accepted' | 'declined') => void
  onComplete: (itemId: string) => void
  onRate: (itemId: string) => void
  onReport: () => void
}

export default function ChatThreadScreen({
  thread,
  listing,
  seller,
  userInitials,
  sellerTyping,
  onBack,
  onOpenListing,
  onSend,
  onPropose,
  onRespond,
  onComplete,
  onRate,
  onReport,
}: ChatThreadScreenProps) {
  const [draft, setDraft] = useState('')
  const endRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' })
  }, [thread.items.length, sellerTyping])

  const handleSubmit = (event: FormEvent) => {
    event.preventDefault()
    const text = draft.trim()
    if (!text) return
    onSend(text)
    setDraft('')
  }

  const firstName = seller.name.split(' ')[0]

  return (
    <div className="flex min-h-dvh flex-1 flex-col">
      <header className="sticky top-0 z-20 flex flex-col gap-md bg-surface-bg px-lg pb-md pt-md">
        <div className="flex items-center gap-md">
          <IconButton
            variant="subtle"
            icon={<ArrowLeft size={16} />}
            aria-label="Back to chats"
            onClick={onBack}
            className="touch-hit"
          />
          <Avatar type="initial" initials={seller.initials} size="medium" />
          <div className="min-w-0 flex-1">
            <p role="heading" aria-level={1} className="flex items-center gap-xs text-label text-text-primary">
              <span className="truncate">{seller.name}</span>
              <ShieldCheck size={14} className="shrink-0 text-brand-primary" aria-hidden="true" />
              <span className="sr-only">Verified student</span>
            </p>
            <p className="text-caption-sm text-text-secondary truncate">
              {seller.program}
              {seller.rating != null && (
                <span className="ml-1 inline-flex items-center gap-xs align-middle">
                  <Star size={10} className="fill-accent text-accent" aria-hidden="true" />
                  {seller.rating.toFixed(1)}
                </span>
              )}
            </p>
          </div>
          <IconButton
            variant="subtle"
            icon={<Flag size={16} />}
            aria-label={`Report ${seller.name}`}
            onClick={onReport}
            className="touch-hit text-text-secondary"
          />
        </div>
        {listing ? (
          <Pressable
            onPress={onOpenListing}
            aria-label={`View listing: ${listing.title}`}
            className="flex items-center gap-md rounded-corner-md bg-bg-faint p-sm hover:bg-bg-hover"
          >
            <img src={listing.imageUrl} alt="" className="size-10 shrink-0 rounded-corner-sm object-cover" />
            <div className="min-w-0 flex-1">
              <p className="text-label-sm text-text-primary truncate">{listing.title}</p>
              <p className="text-caption-sm text-text-secondary">
                {priceLabel(listing)} &middot; {listing.courseCode}
              </p>
            </div>
            <ChevronRight size={16} className="shrink-0 text-text-secondary" />
          </Pressable>
        ) : (
          <p className="flex items-center gap-md rounded-corner-md bg-bg-faint p-sm text-label-sm text-text-secondary">
            <span className="flex size-10 shrink-0 items-center justify-center rounded-corner-sm bg-bg-subtle">
              <PackageX size={16} aria-hidden="true" />
            </span>
            Listing removed by the seller
          </p>
        )}
      </header>

      <div className="flex flex-1 flex-col gap-md p-xl" aria-live="polite">
        {listing?.status === 'sold' && <InlineAlert tone="info" icon={Tag}>This item has been marked sold</InlineAlert>}
        <p className="self-center rounded-corner-full bg-surface-bg px-md py-xs text-center text-caption-sm text-text-secondary">
          Meet only at campus-approved spots
        </p>
        {thread.items.map((item) =>
          item.kind === 'message' ? (
            <MessageBubble
              key={item.id}
              text={item.text}
              fromMe={item.from === 'me'}
              initials={item.from === 'me' ? userInitials : seller.initials}
            />
          ) : (
            <MeetupProposalCard
              key={item.id}
              item={item}
              onRespond={(status) => onRespond(item.id, status)}
              onProposeNew={onPropose}
              onComplete={() => onComplete(item.id)}
              onRate={() => onRate(item.id)}
            />
          ),
        )}
        {sellerTyping && <p className="text-caption-sm text-text-secondary">{firstName} is typing...</p>}
        <div ref={endRef} />
      </div>

      <form
        onSubmit={handleSubmit}
        className="sticky bottom-0 z-20 flex items-center gap-sm border-t border-border-secondary bg-surface-bg px-lg py-md"
      >
        <IconButton
          type="button"
          variant="subtle"
          icon={<CalendarPlus size={16} />}
          aria-label="Propose a meetup time"
          onClick={onPropose}
          className="touch-hit"
        />
        <InputField
          className="min-w-0 flex-1"
          aria-label="Message"
          placeholder="Message..."
          autoComplete="off"
          value={draft}
          onChange={setDraft}
        />
        <IconButton
          type="submit"
          variant="primary"
          icon={<Send size={16} />}
          aria-label="Send message"
          disabled={!draft.trim()}
          className="touch-hit"
        />
      </form>
    </div>
  )
}
