import { SearchX } from 'lucide-react'
import EmptyState from '@/components/feedback/EmptyState'

interface SearchEmptyStateProps {
  query: string
  onClear: () => void
}

/**
 * Filtered down to nothing. It has to read differently from an empty library:
 * the collection is fine, the query is what found nothing.
 */
export default function SearchEmptyState({ query, onClear }: SearchEmptyStateProps) {
  return (
    <EmptyState
      title={`Nothing matches “${query}”`}
      hint="Try fewer words, or a different spelling."
      icon={SearchX}
      action={
        <button
          type="button"
          onClick={onClear}
          className="rounded-md border border-border px-3 py-1.5 text-sm font-medium transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Clear search
        </button>
      }
    />
  )
}
