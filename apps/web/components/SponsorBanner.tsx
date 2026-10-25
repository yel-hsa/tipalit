import { Megaphone, Sparkles } from 'lucide-react'
import Pressable from './Pressable'
import type { Promotion } from '@tipalit/services/types'

type SponsorBannerProps = {
  promotions: Promotion[]
  // which card renders when several are passed
  index?: number
  onOpen: (promotion: Promotion) => void
}

// renders nothing without an active promotion; clicks are tracked by the caller
export default function SponsorBanner({ promotions, index = 0, onOpen }: SponsorBannerProps) {
  const promotion = promotions[index]
  if (!promotion) return null

  const Icon = promotion.type === 'perk' ? Sparkles : Megaphone
  const kindLabel = promotion.type === 'perk' ? 'Student perk' : 'Sponsored'

  return (
    <Pressable
      onPress={() => onOpen(promotion)}
      className="mx-xl mt-xl flex items-center gap-lg overflow-hidden rounded-corner-lg bg-surface-bg p-lg hover:bg-surface-hover"
      aria-label={`${kindLabel}: ${promotion.title} by ${promotion.sponsorName}`}
    >
      {promotion.imageUrl ? (
        <img src={promotion.imageUrl} alt="" className="size-14 shrink-0 rounded-corner-md object-cover" />
      ) : (
        <span className="flex size-14 shrink-0 items-center justify-center rounded-corner-md bg-accent-soft text-text-primary">
          <Icon size={22} aria-hidden="true" />
        </span>
      )}
      <div className="min-w-0 flex-1">
        <p className="text-caption-sm font-semibold uppercase tracking-wide text-text-tertiary">{kindLabel}</p>
        <p className="truncate text-label-sm text-text-primary">{promotion.title}</p>
        <p className="truncate text-caption-sm text-text-secondary">{promotion.sponsorName}</p>
      </div>
      <span className="rounded-corner-full bg-accent-soft px-md py-xs text-caption-sm font-semibold text-text-primary">
        {promotion.type === 'perk' ? 'Claim' : 'View'}
      </span>
    </Pressable>
  )
}
