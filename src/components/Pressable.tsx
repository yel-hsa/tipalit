import type { HTMLAttributes, KeyboardEvent, ReactNode } from 'react'

type PressableProps = HTMLAttributes<HTMLDivElement> & {
  onPress: () => void
  children: ReactNode
}

// Card-sized tap target for rich content (product cards, chat rows) that the kit's
// Button can't lay out. Follows the kit's custom-interactive focus pattern.
export default function Pressable({ onPress, className = '', children, ...rest }: PressableProps) {
  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault()
      onPress()
    }
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={onPress}
      onKeyDown={handleKeyDown}
      className={`cursor-pointer transition-colors focus-visible:outline-2 focus-visible:outline-brand-primary focus-visible:outline-offset-2 ${className}`}
      {...rest}
    >
      {children}
    </div>
  )
}
