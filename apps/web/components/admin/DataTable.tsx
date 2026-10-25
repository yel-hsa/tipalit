import { ArrowDown, ArrowUp, ChevronsUpDown } from 'lucide-react'
import { useMemo, useState, type CSSProperties, type ReactNode } from 'react'

export type Column<T> = {
  id: string
  header: string
  // tailwind width class, e.g. 'w-40'
  width?: string
  align?: 'left' | 'right'
  render: (row: T) => ReactNode
  // makes the header a sort button; return a comparable value per row
  sortValue?: (row: T) => string | number
}

type SortState = { id: string; direction: 'asc' | 'desc' }

type DataTableProps<T> = {
  label: string
  columns: Column<T>[]
  rows: T[]
  rowKey: (row: T) => string
  onRowClick?: (row: T) => void
  rowLabel?: (row: T) => string
  empty?: ReactNode
  // dims rows that are no longer actionable
  rowMuted?: (row: T) => boolean
  // rows per page; omit to render every row
  pageSize?: number
  // sort applied before the first header click
  initialSort?: SortState
}

const compare = (a: string | number, b: string | number) =>
  typeof a === 'number' && typeof b === 'number' ? a - b : String(a).localeCompare(String(b))

export default function DataTable<T>({
  label,
  columns,
  rows,
  rowKey,
  onRowClick,
  rowLabel,
  empty,
  rowMuted,
  pageSize,
  initialSort,
}: DataTableProps<T>) {
  const [sort, setSort] = useState<SortState | null>(initialSort ?? null)
  const [page, setPage] = useState(0)

  const sorted = useMemo(() => {
    const column = sort ? columns.find((entry) => entry.id === sort.id) : undefined
    if (!sort || !column?.sortValue) return rows
    const factor = sort.direction === 'asc' ? 1 : -1
    return [...rows].sort((a, b) => factor * compare(column.sortValue!(a), column.sortValue!(b)))
  }, [rows, sort, columns])

  const pageCount = pageSize ? Math.max(1, Math.ceil(sorted.length / pageSize)) : 1
  const currentPage = Math.min(page, pageCount - 1)
  const visible = pageSize ? sorted.slice(currentPage * pageSize, (currentPage + 1) * pageSize) : sorted

  if (rows.length === 0 && empty) return <>{empty}</>

  const toggleSort = (column: Column<T>) => {
    if (!column.sortValue) return
    setPage(0)
    setSort((current) =>
      current?.id !== column.id
        ? { id: column.id, direction: 'asc' }
        : current.direction === 'asc'
          ? { id: column.id, direction: 'desc' }
          : null,
    )
  }

  return (
    <div className="overflow-hidden rounded-corner-lg border border-border-primary bg-surface-bg">
      <div className="max-h-[calc(100dvh-19rem)] overflow-auto">
        <table className="w-full table-fixed border-collapse text-left">
          <caption className="sr-only">{label}</caption>
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-border-primary bg-bg-faint">
              {columns.map((column) => {
                const active = sort?.id === column.id
                const sortable = Boolean(column.sortValue)
                return (
                  <th
                    key={column.id}
                    scope="col"
                    aria-sort={active ? (sort.direction === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={`px-lg py-md text-th uppercase tracking-wide text-text-secondary ${column.width ?? ''} ${
                      column.align === 'right' ? 'text-right' : ''
                    }`}
                  >
                    {sortable ? (
                      <button
                        type="button"
                        onClick={() => toggleSort(column)}
                        className={`inline-flex items-center gap-xs uppercase tracking-wide transition-colors hover:text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary ${
                          column.align === 'right' ? 'flex-row-reverse' : ''
                        } ${active ? 'text-text-primary' : ''}`}
                      >
                        {column.header}
                        {active ? (
                          sort.direction === 'asc' ? (
                            <ArrowUp size={12} aria-hidden="true" />
                          ) : (
                            <ArrowDown size={12} aria-hidden="true" />
                          )
                        ) : (
                          <ChevronsUpDown size={12} className="opacity-50" aria-hidden="true" />
                        )}
                      </button>
                    ) : (
                      column.header
                    )}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {visible.map((row, index) => {
              const muted = rowMuted?.(row) ?? false
              const interactive = Boolean(onRowClick)
              return (
                <tr
                  key={rowKey(row)}
                  style={{ '--i': Math.min(index, 12) } as CSSProperties}
                  onClick={onRowClick ? () => onRowClick(row) : undefined}
                  onKeyDown={
                    onRowClick
                      ? (event) => {
                          if (event.key === 'Enter' || event.key === ' ') {
                            event.preventDefault()
                            onRowClick(row)
                          }
                        }
                      : undefined
                  }
                  tabIndex={interactive ? 0 : undefined}
                  aria-label={interactive ? rowLabel?.(row) : undefined}
                  className={`stagger animate-rise-in border-b border-border-secondary last:border-b-0 transition-colors ${
                    interactive
                      ? 'cursor-pointer hover:bg-bg-hover focus-visible:bg-bg-hover focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary'
                      : ''
                  } ${muted ? 'opacity-60' : ''}`}
                >
                  {columns.map((column) => (
                    <td
                      key={column.id}
                      className={`px-lg py-md align-middle text-cell text-text-primary ${column.align === 'right' ? 'text-right' : ''}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {pageSize && sorted.length > pageSize && (
        <div className="flex items-center justify-between gap-md border-t border-border-secondary px-lg py-sm">
          <span className="text-caption-sm text-text-secondary tabular-nums">
            {currentPage * pageSize + 1}–{Math.min((currentPage + 1) * pageSize, sorted.length)} of {sorted.length}
          </span>
          <div className="flex items-center gap-xs">
            <button
              type="button"
              onClick={() => setPage(currentPage - 1)}
              disabled={currentPage === 0}
              className="rounded-corner-sm px-sm py-xs text-caption-sm text-text-primary hover:bg-bg-hover disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              Previous
            </button>
            <span className="px-xs text-caption-sm text-text-secondary tabular-nums">
              {currentPage + 1} / {pageCount}
            </span>
            <button
              type="button"
              onClick={() => setPage(currentPage + 1)}
              disabled={currentPage >= pageCount - 1}
              className="rounded-corner-sm px-sm py-xs text-caption-sm text-text-primary hover:bg-bg-hover disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
