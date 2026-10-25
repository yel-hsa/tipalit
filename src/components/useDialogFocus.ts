import { useEffect, useSyncExternalStore, type RefObject } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type DialogEntry = { id: number; canClose: () => boolean; close: () => void }

// Only the topmost dialog may handle Escape, since a confirm can open over a sheet.
const stack: DialogEntry[] = []
const listeners = new Set<() => void>()
let nextId = 0

function emit() {
  listeners.forEach((listener) => listener())
}

function subscribe(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

function getOpenCount() {
  return stack.length
}

export function useOpenDialogCount() {
  return useSyncExternalStore(subscribe, getOpenCount, () => 0)
}

export type DialogFocusOptions = {
  canClose?: () => boolean
  onClose?: () => void
}

/**
 * Moves focus into a dialog on open, keeps Tab inside it, closes it on Escape
 * (when it is the topmost dialog and `canClose` allows), and returns focus to
 * the opener on close. `bodyRef` points at content inside the dialog; the
 * nearest [role="dialog"] ancestor is used as the trap boundary so this works
 * with the kit Modal, which exposes no ref or focus handling of its own.
 */
export default function useDialogFocus(
  isOpen: boolean,
  bodyRef: RefObject<HTMLElement | null>,
  options?: DialogFocusOptions,
) {
  const canClose = options?.canClose
  const onClose = options?.onClose

  useEffect(() => {
    if (!isOpen) return
    const opener = document.activeElement instanceof HTMLElement ? document.activeElement : null
    let dialog: HTMLElement | null = null

    const entry: DialogEntry = {
      id: ++nextId,
      canClose: () => canClose?.() ?? true,
      close: () => onClose?.(),
    }
    stack.push(entry)
    emit()

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

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        if (stack[stack.length - 1] !== entry) return
        if (!entry.canClose()) return
        entry.close()
        return
      }
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
    document.addEventListener('keydown', onKeyDown)

    return () => {
      cancelAnimationFrame(frame)
      document.removeEventListener('keydown', onKeyDown)
      const index = stack.indexOf(entry)
      if (index !== -1) stack.splice(index, 1)
      emit()
      if (opener?.isConnected) opener.focus()
    }
  }, [isOpen, bodyRef, canClose, onClose])
}
