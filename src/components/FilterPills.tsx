import { Button } from '@figma/astraui'

type FilterPillsProps<T extends string> = {
  label: string
  options: { id: T; label: string }[]
  active: T
  onChange: (id: T) => void
}

/** Single-select toggle pills, the same pattern as the feed's category filter. */
export default function FilterPills<T extends string>({ label, options, active, onChange }: FilterPillsProps<T>) {
  return (
    <div role="toolbar" aria-label={label} className="flex gap-md overflow-x-auto scrollbar-none py-xs">
      {options.map((option) => {
        const isActive = option.id === active
        return (
          <Button
            key={option.id}
            size="small"
            variant={isActive ? 'primary' : 'neutral'}
            aria-pressed={isActive}
            onClick={() => onChange(option.id)}
            className="shrink-0 whitespace-nowrap touch-hit"
          >
            {option.label}
          </Button>
        )
      })}
    </div>
  )
}
