import type { LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type EmptyStateProps = {
  icon: LucideIcon
  title: string
  body: string
  action?: ReactNode
  className?: string
}

export default function EmptyState({ icon: Icon, title, body, action, className = '' }: EmptyStateProps) {
  return (
    <div
      className={`flex flex-col items-center gap-md rounded-corner-lg border border-border-primary bg-surface-bg px-xl py-2xl text-center ${className}`}
    >
      {/* Flat two-shape illustration behind the icon */}
      <div aria-hidden="true" className="relative mb-sm flex size-20 items-center justify-center">
        <span className="absolute inset-0 rounded-corner-full bg-accent-soft" />
        <span className="absolute -right-xs top-0 size-6 rounded-corner-full bg-accent" />
        <span className="absolute -left-xs bottom-sm size-3 rounded-corner-full bg-bg-hover" />
        <Icon size={32} className="relative text-text-primary" />
      </div>
      <p role="heading" aria-level={2} className="text-label font-semibold text-text-primary">
        {title}
      </p>
      <p className="max-w-64 text-label-sm text-text-secondary">{body}</p>
      {action && <div className="mt-sm flex flex-wrap justify-center gap-md">{action}</div>}
    </div>
  )
}
