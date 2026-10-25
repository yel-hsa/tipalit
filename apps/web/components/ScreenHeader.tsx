import { IconButton } from '@figma/astraui'
import { ArrowLeft } from 'lucide-react'
import type { ReactNode } from 'react'

type ScreenHeaderProps = {
  title: string
  subtitle?: string
  onBack?: () => void
  trailing?: ReactNode
}

export default function ScreenHeader({ title, subtitle, onBack, trailing }: ScreenHeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-brand-tertiary px-xl pt-xl pb-lg flex items-center gap-md">
      {onBack && (
        <IconButton
          variant="neutral"
          icon={<ArrowLeft size={16} />}
          aria-label="Back"
          onClick={onBack}
          className="touch-hit"
        />
      )}
      <div className="flex-1 min-w-0">
        <p role="heading" aria-level={1} className="text-title text-text-primary truncate">
          {title}
        </p>
        {subtitle && <p className="text-label-sm text-text-secondary mt-xs">{subtitle}</p>}
      </div>
      {trailing}
    </header>
  )
}
