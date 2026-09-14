import {
  ArrowDownWideNarrow,
  ArrowUpNarrowWide,
  ArrowUpDown,
} from 'lucide-react'
import type { SortState } from '@/hooks/useSort'

interface SortSelectProps<K extends string> {
  /** Accessible name, e.g. "Sort albums by". */
  label: string
  sort: SortState<K>
}

/**
 * Sort control shown beside a list page's item count: which field, then which
 * way. The label element already names the select, so no aria-label is needed
 * on top of it.
 */
export default function SortSelect<K extends string>({
  label,
  sort,
}: SortSelectProps<K>) {
  const ascending = sort.direction === 'asc'
  return (
    <div className="flex items-center gap-1.5">
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <ArrowUpDown size={14} aria-hidden="true" />
        <span className="sr-only">{label}</span>
        <select
          value={sort.key}
          onChange={event => sort.setKey(event.target.value as K)}
          className="select select-sm rounded-md border border-border bg-card text-xs text-foreground outline-none transition focus:ring-2 focus:ring-ring"
        >
          {sort.options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        onClick={sort.toggleDirection}
        aria-label={`Sort direction: ${ascending ? 'ascending' : 'descending'}. Activate to reverse.`}
        title={ascending ? 'Ascending' : 'Descending'}
                  className="btn btn-ghost btn-sm rounded-md border border-border bg-card text-muted-foreground transition hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        {ascending ? <ArrowUpNarrowWide size={14} /> : <ArrowDownWideNarrow size={14} />}
      </button>
    </div>
  )
}
