import { AlertCircle, type LucideIcon } from 'lucide-react'
import type { ReactNode } from 'react'

type InlineAlertProps = {
  tone?: 'danger' | 'info'
  icon?: LucideIcon
  children: ReactNode
  action?: ReactNode
}

export default function InlineAlert({ tone = 'danger', icon: Icon = AlertCircle, children, action }: InlineAlertProps) {
  const danger = tone === 'danger'
  return (
    <div
      role={danger ? 'alert' : 'status'}
      className={`flex flex-col gap-md rounded-corner-md p-md ${danger ? 'bg-danger-soft' : 'bg-accent-soft'}`}
    >
      <p className="flex items-start gap-sm text-label-sm text-text-primary">
        <Icon size={16} className={`mt-xs shrink-0 ${danger ? 'text-danger' : 'text-text-primary'}`} aria-hidden="true" />
        <span>{children}</span>
      </p>
      {action && <div className="flex justify-end">{action}</div>}
    </div>
  )
}
