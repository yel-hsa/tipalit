import { AlertCircle } from 'lucide-react'
import type { ReactNode } from 'react'

type FormFieldProps = {
  id: string
  error?: string
  children: ReactNode
}

export const errorIdFor = (id: string) => `${id}-error`

// kit fields have no error state; inputs set aria-invalid and aria-describedby themselves
export default function FormField({ id, error, children }: FormFieldProps) {
  return (
    <div
      id={`${id}-field`}
      data-invalid={error ? true : undefined}
      className={`-mx-sm flex flex-col gap-xs rounded-corner-md px-sm transition-colors ${
        error ? 'bg-danger-soft py-sm' : ''
      }`}
    >
      {children}
      {error && (
        <p id={errorIdFor(id)} role="alert" className="flex items-center gap-xs text-label-sm text-danger">
          <AlertCircle size={16} className="shrink-0" />
          {error}
        </p>
      )}
    </div>
  )
}
