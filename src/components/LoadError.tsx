import { Button } from '@figma/astraui'
import { RotateCcw, WifiOff } from 'lucide-react'
import EmptyState from './EmptyState'

type LoadErrorProps = {
  what: string
  onRetry: () => void
  className?: string
}

export default function LoadError({ what, onRetry, className }: LoadErrorProps) {
  return (
    <EmptyState
      className={className}
      icon={WifiOff}
      title={`Couldn\u2019t load ${what}`}
      body="Check your connection, then try again."
      action={
        <Button variant="primary" size="small" iconStart={<RotateCcw size={14} />} onClick={onRetry} className="touch-hit">
          Retry
        </Button>
      }
    />
  )
}
