import { InputField, SelectField } from '@figma/astraui'
import { Search } from 'lucide-react'
import type { ReactNode } from 'react'

type FilterOption = { value: string; label: string }

type ToolbarProps = {
  query: string
  onQueryChange: (value: string) => void
  searchLabel: string
  placeholder: string
  filters: { label: string; value: string; options: FilterOption[]; onChange: (value: string) => void }[]
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
  return (
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
      {filters.map((filter) => (
        <div key={filter.label} className="w-44">
          <SelectField
            label={filter.label}
            options={filter.options}
            value={filter.value}
            onChange={filter.onChange}
          />
        </div>
      ))}
      {children && <div className="ml-auto pb-sm text-cell text-text-secondary">{children}</div>}
    </div>
  )
}
