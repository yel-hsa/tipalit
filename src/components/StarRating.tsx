import { IconButton } from '@figma/astraui'
import { Star } from 'lucide-react'
import { useRef, type KeyboardEvent } from 'react'

export const RATING_LABELS = ['Poor', 'Fair', 'Good', 'Great', 'Excellent']

type StarRatingProps = {
  value: number
  onChange?: (value: number) => void
  // read-only stars for summaries
  readOnly?: boolean
}

const STARS = [1, 2, 3, 4, 5]

export default function StarRating({ value, onChange, readOnly }: StarRatingProps) {
  const groupRef = useRef<HTMLDivElement>(null)

  if (readOnly) {
    return (
      <span role="img" aria-label={`${value} out of 5 stars`} className="flex items-center gap-xs">
        {STARS.map((n) => (
          <Star key={n} size={14} className={n <= value ? 'fill-accent text-accent' : 'text-text-tertiary'} />
        ))}
      </span>
    )
  }

  const select = (next: number) => {
    const clamped = Math.min(5, Math.max(1, next))
    onChange?.(clamped)
    groupRef.current?.querySelectorAll<HTMLElement>('[role="radio"]')[clamped - 1]?.focus()
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (event.key === 'ArrowRight' || event.key === 'ArrowUp') {
      event.preventDefault()
      select((value || 0) + 1)
    } else if (event.key === 'ArrowLeft' || event.key === 'ArrowDown') {
      event.preventDefault()
      select((value || 2) - 1)
    }
  }

  return (
    <div className="flex flex-col items-center gap-xs">
      <div ref={groupRef} role="radiogroup" aria-label="Rating" onKeyDown={handleKeyDown} className="flex">
        {STARS.map((n) => (
          <IconButton
            key={n}
            type="button"
            variant="subtle"
            role="radio"
            aria-checked={value === n}
            aria-label={`${n} star${n > 1 ? 's' : ''}, ${RATING_LABELS[n - 1]}`}
            tabIndex={value === n || (value === 0 && n === 1) ? 0 : -1}
            icon={<Star size={28} className={n <= value ? 'fill-accent text-accent' : 'text-text-tertiary'} />}
            onClick={() => select(n)}
            className="size-touch"
          />
        ))}
      </div>
      <p aria-live="polite" className="min-h-5 text-label-sm text-text-secondary">
        {value > 0 ? RATING_LABELS[value - 1] : 'Tap a star to rate'}
      </p>
    </div>
  )
}
