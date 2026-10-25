import { useEffect, useSyncExternalStore, type RefObject } from 'react'

const FOCUSABLE =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'

type DialogEntry = { id: number; canClose: () => boolean; close: () => void }

// only the topmost dialog handles Escape, since a confirm can open over a sheet
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

// traps focus in the nearest [role="dialog"] ancestor; the kit modal exposes no ref
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
      // the kit Modal's close button has no accessible name
      dialog?.querySelectorAll('button:not([aria-label])').forEach((button) => {
        if (!button.textContent?.trim()) button.setAttribute('aria-label', 'Close')
      })
      const first = body?.querySelector<HTMLElement>(FOCUSABLE)
      ;(first ?? dialog)?.focus()
    })

    // dialogs mount wherever their owner renders them, so inert siblings up the tree
    const inerted: HTMLElement[] = []
    const inertSiblings = () => {
      let node: HTMLElement | null = dialog
      while (node && node !== document.body) {
        const parent: HTMLElement | null = node.parentElement
        if (!parent) break
        for (const sibling of Array.from(parent.children)) {
          if (sibling === node || !(sibling instanceof HTMLElement)) continue
          if (sibling.inert) continue
          sibling.inert = true
          inerted.push(sibling)
        }
        node = parent
      }
    }
    const frame2 = requestAnimationFrame(inertSiblings)

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
      cancelAnimationFrame(frame2)
      document.removeEventListener('keydown', onKeyDown)
      inerted.forEach((element) => {
        element.inert = false
      })
      const index = stack.indexOf(entry)
      if (index !== -1) stack.splice(index, 1)
      emit()
      if (opener?.isConnected) opener.focus()
    }
  }, [isOpen, bodyRef, canClose, onClose])
}
