import { useId, type ReactNode } from 'react'
import Pressable from './Pressable'

type SwitchRowProps = {
  label: string
  description?: string
  checked: boolean
  onChange: (checked: boolean) => void
  icon?: ReactNode
}

/**
 * Full-width settings toggle. The kit's SwitchField renders at a fixed 360px
 * (wider than our cards), is uncontrolled and exposes no switch role, so this
 * keeps the same anatomy but fills its container and is fully accessible.
 * The whole row is the tap target.
 */
export default function SwitchRow({ label, description, checked, onChange, icon }: SwitchRowProps) {
  const id = useId()
  const labelId = `${id}-label`
  const descriptionId = `${id}-description`

  return (
    <Pressable
      role="switch"
      aria-checked={checked}
      aria-labelledby={labelId}
      aria-describedby={description ? descriptionId : undefined}
      onPress={() => onChange(!checked)}
      className="flex min-h-touch w-full items-center gap-lg rounded-corner-md text-left"
    >
      {icon && (
        <span
          aria-hidden="true"
          className="flex size-10 shrink-0 items-center justify-center rounded-corner-full bg-bg-subtle text-text-primary"
        >
          {icon}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col gap-xs">
        <span id={labelId} className="text-label text-text-primary">
          {label}
        </span>
        {description && (
          <span id={descriptionId} className="text-label-sm text-text-secondary">
            {description}
          </span>
        )}
      </span>
      <span
        aria-hidden="true"
        className={`flex h-6 w-10 shrink-0 items-center rounded-corner-full p-xs transition-colors ${
          checked ? 'bg-switch-on' : 'bg-switch-off'
        }`}
      >
        <span
          className={`size-4 rounded-corner-full shadow-raised transition-transform ${
            checked ? 'translate-x-4 bg-switch-thumb-on' : 'bg-switch-thumb'
          }`}
        />
      </span>
    </Pressable>
  )
}
