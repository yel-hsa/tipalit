import { useEffect, type RefObject } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Moves focus into a dialog on open, keeps Tab inside it, and returns focus to
 * the opener on close. `bodyRef` points at content inside the dialog; the
 * nearest [role="dialog"] ancestor is used as the trap boundary so this works
 * with the kit Modal, which exposes no ref or focus handling of its own.
 */
export default function useDialogFocus(isOpen: boolean, bodyRef: RefObject<HTMLElement | null>) {
  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    let dialog: HTMLElement | null = null

    const frame = requestAnimationFrame(() => {
      const body = bodyRef.current
      dialog = body?.closest<HTMLElement>('[role="dialog"]') ?? body
      // The kit Modal's close button has no accessible name.
      dialog?.querySelectorAll('button:not([aria-label])').forEach((button) => {
        if (!button.textContent?.trim()) button.setAttribute('aria-label', 'Close')
      })
      const first = body?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? dialog)?.focus()
    })

    const trap = (event: KeyboardEvent) => {
      if (event.key !== 'Tab' || !dialog) return
      const items = Array.from(dialog.querySelectorAll<HTMLElement>(FOCUSABLE))
      if (items.length === 0) return
      const first = items[0]
      const last = items[items.length - 1]
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault()
        last.focus()
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault()
        first.focus()
      } else if (!dialog.contains(document.activeElement)) {
        event.preventDefault()
        first.focus()
      }
    }
    document.addEventListener('keydown', trap)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', trap)
      if (opener?.isConnected) opener.focus()
    }
  }, [isOpen, bodyRef])
}
