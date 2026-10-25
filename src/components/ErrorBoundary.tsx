import { Button } from '@figma/astraui'
import { TriangleAlert } from 'lucide-react'
import { Component, type ErrorInfo, type ReactNode } from 'react'
import EmptyState from './EmptyState'

type ErrorBoundaryProps = {
  children: ReactNode
  /** Full-viewport framing for boundaries rendered outside PhoneShell. */
  fullScreen?: boolean
}

type ErrorBoundaryState = {
  hasError: boolean
}

export default class ErrorBoundary extends Component<ErrorBoundaryProps, ErrorBoundaryState> {
  state: ErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('Unhandled render error', error, info.componentStack)
  }

  render() {
    if (!this.state.hasError) return this.props.children

    const fallback = (
      <EmptyState
        icon={TriangleAlert}
        title="Something went wrong"
        body="This screen hit an unexpected error. Reload to get back to browsing."
        action={
          <Button variant="primary" className="touch-hit" onClick={() => window.location.reload()}>
            Reload
          </Button>
        }
      />
    )

    if (this.props.fullScreen) {
      return (
        <div className="min-h-dvh flex items-center justify-center bg-surface-hover px-xl">
          <div className="w-full max-w-phone">{fallback}</div>
        </div>
      )
    }

    return <div className="flex flex-1 items-center justify-center px-xl py-2xl">{fallback}</div>
  }
}
