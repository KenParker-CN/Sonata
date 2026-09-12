import { useMemo, useState } from 'react'
import { searchTerms } from '@/utils/search'

export interface Search {
  /** Raw text, for the input and for echoing back what found nothing. */
  query: string
  setQuery: (query: string) => void
  /** The query split into terms. Empty until something is typed. */
  terms: string[]
  active: boolean
}

/**
 * A page's keyword filter. Deliberately not persisted, unlike the sort and view
 * choices: a query is a question being asked right now, not a preference.
 */
export function useSearch(): Search {
  const [query, setQuery] = useState('')
  const terms = useMemo(() => searchTerms(query), [query])
  return { query, setQuery, terms, active: terms.length > 0 }
}
