import { useCallback, useEffect, useRef, useState } from 'react'

// Plays an exit animation before the parent unmounts the overlay: the caller swaps in
// its *-out class while `closing` is true, then onClose fires once the animation ends.
export default function useOverlayExit(isOpen: boolean, onClose: () => void, exitMs: number) {
  const [closing, setClosing] = useState(false)
  const [wasOpen, setWasOpen] = useState(isOpen)
  const closingRef = useRef(false)
  const timerRef = useRef<number | undefined>(undefined)
  const onCloseRef = useRef(onClose)
  onCloseRef.current = onClose

  // reset during render, not in an effect, so a reopen never paints one frame of the exit animation
  if (isOpen !== wasOpen) {
    setWasOpen(isOpen)
    if (isOpen) {
      closingRef.current = false
      setClosing(false)
    }
  }

  useEffect(() => () => window.clearTimeout(timerRef.current), [])

  // stable identity: useDialogFocus re-runs its effect when onClose changes, which
  // would steal focus back to the first control on every parent re-render
  const requestClose = useCallback(() => {
    if (closingRef.current) return
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      onCloseRef.current()
      return
    }
    closingRef.current = true
    setClosing(true)
    timerRef.current = window.setTimeout(() => onCloseRef.current(), exitMs)
  }, [exitMs])

  return { closing, requestClose }
}
