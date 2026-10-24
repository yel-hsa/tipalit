import { Button } from '@figma/astraui'
import { CATEGORIES } from '../data/seed'

type CategoryPillsProps = {
  active: string
  onChange: (category: string) => void
}

export default function CategoryPills({ active, onChange }: CategoryPillsProps) {
  return (
    <div
      role="toolbar"
      aria-label="Filter by category"
      className="flex gap-md overflow-x-auto scrollbar-none -mx-xl px-xl py-sm"
    >
      {CATEGORIES.map((category) => {
        const isActive = category === active
        return (
          <Button
            key={category}
            size="small"
            variant={isActive ? 'primary' : 'neutral'}
            aria-pressed={isActive}
            onClick={() => onChange(category)}
            className="shrink-0 whitespace-nowrap touch-hit"
          >
            {category}
          </Button>
        )
      })}
    </div>
  )
}
