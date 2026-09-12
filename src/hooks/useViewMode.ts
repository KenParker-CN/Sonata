import { useEffect, useState } from 'react'

export type ViewMode = 'grid' | 'list'

// One entry per page, mirroring how the sort selection is stored
const STORAGE_PREFIX = 'sonata-view:'

/**
 * A page's grid/list choice, persisted across reloads. Separate from useSort
 * because it changes the shape of a row rather than its order — the two
 * controls sit side by side and must not fight over one stored string.
 */
export function useViewMode(
  page: string,
  fallback: ViewMode = 'grid',
): [ViewMode, (mode: ViewMode) => void] {
  const [mode, setMode] = useState<ViewMode>(() => {
    const saved = localStorage.getItem(`${STORAGE_PREFIX}${page}`)
    return saved === 'grid' || saved === 'list' ? saved : fallback
  })

  useEffect(() => {
    localStorage.setItem(`${STORAGE_PREFIX}${page}`, mode)
  }, [page, mode])

  return [mode, setMode]
}
