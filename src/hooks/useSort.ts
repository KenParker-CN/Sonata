import { useCallback, useEffect, useMemo, useState } from 'react'
import { compareNames } from '@/utils/collate'

export type SortDirection = 'asc' | 'desc'

/** The chosen key and direction, without the controls that set them. */
export interface SortSelection<K extends string> {
  key: K
  direction: SortDirection
}

export interface SortOption<K extends string> {
  value: K
  label: string
  /** The direction the page reads when you first pick this key. */
  natural: SortDirection
}

export interface SortState<K extends string> extends SortSelection<K> {
  options: readonly SortOption<K>[]
  setKey: (key: K) => void
  toggleDirection: () => void
}

// One entry per page, so an Albums choice cannot leak into Composers.
const STORAGE_PREFIX = 'sonata-sort:'

function naturalOf<K extends string>(
  options: readonly SortOption<K>[],
  key: K,
): SortDirection {
  return options.find(option => option.value === key)?.natural ?? 'asc'
}

/**
 * A page's sort selection, persisted across reloads the way the theme is.
 *
 * `options` must be a module-level constant: the returned callbacks are only
 * stable while its identity is.
 */
export function useSort<K extends string>(
  page: string,
  options: readonly SortOption<K>[],
  fallback: K,
): SortState<K> {
  const [selection, setSelection] = useState<SortSelection<K>>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${page}`)
    const [key, direction] = (saved ?? '').split(':')
    const known = options.find(option => option.value === key)
    // Anything the current option list no longer offers reads as "no stored
    // preference" — a retired key must not leave the page unsorted.
    if (!known) return { key: fallback, direction: naturalOf(options, fallback) }
    return {
      key: known.value,
      direction: direction === 'asc' || direction === 'desc' ? direction : known.natural,
    }
  })

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}${page}`, `${selection.key}:${selection.direction}`)
  }, [page, selection.key, selection.direction])

  const setKey = useCallback(
    (key: K) => setSelection({ key, direction: naturalOf(options, key) }),
    [options],
  )

  const toggleDirection = useCallback(
    () =>
      setSelection(prev => ({
        key: prev.key,
        direction: prev.direction === 'asc' ? 'desc' : 'asc',
      })),
    [],
  )

  return useMemo(
    () => ({ ...selection, options, setKey, toggleDirection }),
    [selection, options, setKey, toggleDirection],
  )
}

/**
 * Sort a copy of `rows` by the live selection. Each comparator describes the
 * ascending side only; the direction is applied here, so a page defines one
 * rule per key instead of a pair of mirror-image branches.
 *
 * Equal rows fall back to name order that ignores the chosen direction: once
 * two artists hold the same track count, A-Z is the only sensible tie.
 */
export function applySort<T, K extends string>(
  rows: readonly T[],
  selection: SortSelection<K>,
  comparators: Record<K, (a: T, b: T) => number>,
  nameOf: (row: T) => string,
): T[] {
  const compare = comparators[selection.key]
  const factor = selection.direction === 'asc' ? 1 : -1
  return [...rows].sort(
    (a, b) => compare(a, b) * factor || compareNames(nameOf(a), nameOf(b)),
  )
}
