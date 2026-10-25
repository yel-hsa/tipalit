import type { ReactNode } from 'react'

export type BadgeVariant = 'default' | 'success' | 'warning' | 'danger' | 'brand' | 'secondary'

type BadgeProps = {
  label: ReactNode
  variant?: BadgeVariant
  className?: string
}

// soft tint + dark text: every pair clears 4.5:1 in both themes
const TONE: Record<BadgeVariant, string> = {
  default: 'bg-bg-subtle text-text-secondary',
  secondary: 'bg-bg-subtle text-text-secondary',
  success: 'bg-success-soft text-success',
  warning: 'bg-warning-soft text-warning',
  danger: 'bg-danger-soft text-danger',
  brand: 'bg-accent-soft text-brand-primary',
}

export default function Badge({ label, variant = 'default', className = '' }: BadgeProps) {
  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-corner-full px-sm py-xs text-caption-sm font-semibold whitespace-nowrap ${TONE[variant]} ${className}`}
    >
      {label}
    </span>
  )
}
