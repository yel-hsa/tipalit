import { InputField } from '@figma/astraui'
import { Search, X } from 'lucide-react'
import type { ReactNode } from 'react'
import SelectField from '../SelectField'

type FilterOption = { value: string; label: string }

type Filter = {
  label: string
  value: string
  options: FilterOption[]
  onChange: (value: string) => void
  // the value that means "no filter applied"; defaults to 'all'
  defaultValue?: string
}

type ToolbarProps = {
  query: string
  onQueryChange: (value: string) => void
  searchLabel: string
  placeholder: string
  filters: Filter[]
  // right-aligned summary, e.g. "12 of 40 listings"
  children?: ReactNode
}

export default function Toolbar({
  query,
  onQueryChange,
  searchLabel,
  placeholder,
  filters,
  children,
}: ToolbarProps) {
  const isDefault = (filter: Filter) => filter.value === (filter.defaultValue ?? 'all')
  const activeFilters = filters.filter((filter) => !isDefault(filter))
  const hasQuery = query.trim().length > 0
  const canClear = hasQuery || activeFilters.length > 0

  const clearAll = () => {
    onQueryChange('')
    filters.forEach((filter) => {
      if (!isDefault(filter)) filter.onChange(filter.defaultValue ?? 'all')
    })
  }

  return (
    <div className="flex flex-col gap-sm">
      <div className="flex flex-wrap items-end gap-md">
        <div className="min-w-64 flex-1">
          <InputField
            type="search"
            aria-label={searchLabel}
            placeholder={placeholder}
            prefix={<Search size={16} />}
            value={query}
            onChange={onQueryChange}
          />
        </div>
        {filters.map((filter) => {
          const active = !isDefault(filter)
          return (
            <div key={filter.label} className="w-44">
              <SelectField
                label={filter.label}
                options={filter.options}
                value={filter.value}
                onChange={filter.onChange}
                className={active ? 'rounded-corner-md ring-1 ring-brand-primary/40' : undefined}
              />
            </div>
          )
        })}
        {canClear && (
          <button
            type="button"
            onClick={clearAll}
            className="mb-xs inline-flex items-center gap-xs rounded-corner-full border border-border-primary px-md py-xs text-caption-sm text-text-secondary transition-colors hover:bg-bg-hover hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
          >
            <X size={12} aria-hidden="true" />
            Clear {activeFilters.length + (hasQuery ? 1 : 0) === 1 ? 'filter' : 'filters'}
          </button>
        )}
        {children && <div className="ml-auto pb-sm text-cell text-text-secondary tabular-nums">{children}</div>}
      </div>

      {activeFilters.length > 0 && (
        <p aria-live="polite" className="text-caption-sm text-text-tertiary">
          Filtered by{' '}
          {activeFilters
            .map((filter) => {
              const option = filter.options.find((entry) => entry.value === filter.value)
              return `${filter.label.toLowerCase()}: ${option?.label ?? filter.value}`
            })
            .join(' · ')}
        </p>
      )}
    </div>
  )
}
