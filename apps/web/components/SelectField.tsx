import { useEffect, useId, useRef, useState } from 'react'

// Local accessible replacement for the Astra kit's SelectField. The kit component
// hardcodes id="select-list" / aria-controls="select-list" and renders its label as an
// unassociated <span>, so every instance on a screen shares one duplicate ID and the
// combobox has no accessible name. This mirrors the kit's visuals and interaction but
// generates unique IDs via useId and wires aria-labelledby / aria-controls correctly.

type SelectOption = { value: string; label: string }

type SelectFieldProps = {
  options: SelectOption[]
  value?: string
  onChange: (value: string) => void
  placeholder?: string
  label?: string
  description?: string
  state?: 'empty' | 'default'
  disabled?: boolean
  className?: string
}

const VISIBLE_OPTIONS = 5
const OPTION_HEIGHT = 36
const EXIT_MS = 180

export default function SelectField({
  options,
  value = '',
  onChange,
  placeholder = 'Select an option',
  label,
  description,
  disabled = false,
  className,
}: SelectFieldProps) {
  const [open, setOpen] = useState(false)
  const [closing, setClosing] = useState(false)
  const [activeIndex, setActiveIndex] = useState(-1)
  const rootRef = useRef<HTMLDivElement>(null)
  const optionRefs = useRef<(HTMLDivElement | null)[]>([])

  // unique per-instance IDs so multiple selects on one screen never collide
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, '')
  const labelId = `select-label-${uid}`
  const listId = `select-list-${uid}`
  const optionId = (i: number) => `select-opt-${uid}-${i}`

  const selected = options.find((o) => o.value === value)
  const displayText = selected ? selected.label : placeholder

  const scrollTo = (i: number) => {
    if (i < 0) return
    requestAnimationFrame(() => optionRefs.current[i]?.scrollIntoView({ block: 'nearest' }))
  }

  const openList = () => {
    if (disabled) return
    setClosing(false)
    setOpen(true)
    const i = Math.max(options.findIndex((o) => o.value === value), 0)
    setActiveIndex(i)
    scrollTo(i)
  }

  const closeList = () => {
    if (!open) return
    setClosing(true)
    window.setTimeout(() => {
      setOpen(false)
      setClosing(false)
      setActiveIndex(-1)
    }, EXIT_MS)
  }

  const choose = (v: string) => {
    onChange(v)
    closeList()
  }

  // close on outside pointer down
  useEffect(() => {
    const onDown = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) closeList()
    }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open])

  // keyboard interaction
  useEffect(() => {
    if (disabled) return
    const onKey = (e: KeyboardEvent) => {
      if (!open) {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault()
          openList()
        }
        return
      }
      switch (e.key) {
        case 'Escape':
          e.preventDefault()
          closeList()
          break
        case 'ArrowDown':
          e.preventDefault()
          setActiveIndex((i) => {
            const n = Math.min(i + 1, options.length - 1)
            scrollTo(n)
            return n
          })
          break
        case 'ArrowUp':
          e.preventDefault()
          setActiveIndex((i) => {
            const n = Math.max(i - 1, 0)
            scrollTo(n)
            return n
          })
          break
        case 'Enter':
        case ' ':
          e.preventDefault()
          if (activeIndex >= 0 && activeIndex < options.length) choose(options[activeIndex].value)
          break
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, activeIndex, options, disabled])

  return (
    <div className={`relative ${className ?? ''}`} ref={rootRef}>
      <div className="flex flex-col gap-1.5">
        {label && (
          <span id={labelId} className="text-label-sm font-medium text-text-primary">
            {label}
          </span>
        )}
        <div
          className={`bg-bg-subtle flex items-center gap-2 rounded-lg px-3 py-2.5 cursor-pointer transition-colors ${
            disabled ? 'opacity-50 cursor-not-allowed' : 'hover:bg-bg-hover'
          }`}
          onClick={() => (open ? closeList() : openList())}
          tabIndex={disabled ? -1 : 0}
          role="combobox"
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={open ? listId : undefined}
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          aria-labelledby={label ? labelId : undefined}
          aria-label={label ? undefined : placeholder}
          aria-disabled={disabled || undefined}
        >
          <span
            className={`flex-1 font-sans text-input-sm leading-none ${
              selected ? 'text-text-primary' : 'text-text-secondary'
            } font-normal`}
          >
            {displayText}
          </span>
          <svg
            className={`shrink-0 text-text-secondary transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>
        {description && <span className="text-video-title text-text-secondary">{description}</span>}
      </div>
      {(open || closing) && !disabled && (
        <div
          id={listId}
          className={`absolute top-full left-0 right-0 mt-1 bg-surface-bg border border-border-primary rounded-lg shadow-lg z-50 overflow-y-auto transition-[opacity,transform] duration-200 ${
            closing ? 'opacity-0 -translate-y-1' : 'opacity-100 translate-y-0'
          }`}
          role="listbox"
          aria-labelledby={label ? labelId : undefined}
          style={{ maxHeight: `${OPTION_HEIGHT * Math.min(VISIBLE_OPTIONS, options.length)}px` }}
          data-state={closing ? 'closing' : 'open'}
        >
          {options.map((opt, i) => (
            <div
              key={opt.value}
              id={optionId(i)}
              className={`px-3 py-2 cursor-pointer text-input-sm font-sans transition-colors hover:bg-bg-hover ${
                activeIndex === i ? 'bg-bg-hover' : ''
              } ${value === opt.value ? 'bg-brand-tertiary text-brand-primary font-medium' : ''}`}
              onClick={() => choose(opt.value)}
              onMouseEnter={() => setActiveIndex(i)}
              role="option"
              aria-selected={value === opt.value}
              ref={(el) => {
                optionRefs.current[i] = el
              }}
            >
              {opt.label}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
