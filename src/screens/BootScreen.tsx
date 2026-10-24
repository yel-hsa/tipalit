import Spinner from '../components/Spinner'
import Wordmark from '../components/Wordmark'

export default function BootScreen() {
  return (
    <div role="status" aria-label="Loading TIPalit" className="flex flex-1 flex-col items-center justify-center gap-2xl">
      <Wordmark size="lg" />
      <span className="text-text-secondary">
        <Spinner size={20} />
      </span>
    </div>
  )
}
