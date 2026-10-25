import { useEffect, useRef, useState } from 'react'

// simulates a network round trip
export default function usePendingAction() {
  const [pending, setPending] = useState(false)
  const timer = useRef<number | null>(null)

  useEffect(
    () => () => {
      if (timer.current) window.clearTimeout(timer.current)
    },
    [],
  )

  const run = (fn: () => void, ms: number) => {
    if (pending) return
    setPending(true)
    timer.current = window.setTimeout(() => {
      timer.current = null
      setPending(false)
      fn()
    }, ms)
  }

  return { pending, run }
}
