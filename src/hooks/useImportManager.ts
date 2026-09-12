import { useCallback, useRef, useState } from 'react'
import { parseTrackFile } from '@/services/metadata'
import { saveImport, type StoredRoot, type StoredTrack } from '@/services/libraryStore'
import type { Track } from '@/types/music'

export interface ImportProgress {
  status: 'idle' | 'importing' | 'completed'
  current: number
  total: number
  currentFile: string | null
  successCount: number
  failureCount: number
}

// Both import sources produce this: a stable path plus a way to read the bytes.
// A directory handle defers its read so the progress bar covers it.
export interface ImportEntry {
  path: string
  getFile: () => Promise<File>
}

interface UseImportManagerResult {
  progress: ImportProgress
  importEntries: (entries: ImportEntry[], root: StoredRoot | null) => Promise<void>
}

const INITIAL_PROGRESS: ImportProgress = {
  status: 'idle',
  current: 0,
  total: 0,
  currentFile: null,
  successCount: 0,
  failureCount: 0,
}

export function useImportManager(onTracksParsed: (tracks: Track[]) => void): UseImportManagerResult {
  const [progress, setProgress] = useState<ImportProgress>(INITIAL_PROGRESS)

  const isImportingRef = useRef(false)

  const importEntries = useCallback(async (entries: ImportEntry[], root: StoredRoot | null) => {
    if (isImportingRef.current) {
      console.warn('Import already in progress')
      return
    }
    if (entries.length === 0) return

    isImportingRef.current = true

    setProgress({
      status: 'importing',
      current: 0,
      total: entries.length,
      currentFile: null,
      successCount: 0,
      failureCount: 0,
    })

    // Limit concurrent metadata parsing to avoid saturating the browser's main thread and memory.
    const indexedResults: Array<{ index: number; track: Track | null }> = new Array(entries.length).fill(null)
    const concurrency = Math.min(4, entries.length)
    let nextIndex = 0
    let completed = 0
    let successCount = 0
    let failureCount = 0
    let lastProgressCount = 0
    let lastProgressTime = 0

    const updateProgress = (currentFile: string) => {
      completed += 1
      const now = Date.now()
      const shouldRender =
        completed === entries.length ||
        completed - lastProgressCount >= 8 ||
        now - lastProgressTime >= 100

      if (shouldRender) {
        lastProgressCount = completed
        lastProgressTime = now
        setProgress({
          status: 'importing',
          current: completed,
          total: entries.length,
          currentFile,
          successCount,
          failureCount,
        })
      }
    }

    const parseWorker = async () => {
      while (nextIndex < entries.length) {
        const originalIndex = nextIndex
        nextIndex += 1
        const entry = entries[originalIndex]
        const name = entry.path.split('/').pop() ?? entry.path

        try {
          const track = await parseTrackFile(await entry.getFile(), entry.path)
          indexedResults[originalIndex] = { index: originalIndex, track }
          successCount += 1
        } catch (error) {
          console.error(`Failed to parse file: ${entry.path}`, error)
          indexedResults[originalIndex] = { index: originalIndex, track: null }
          failureCount += 1
        }

        updateProgress(name)
      }
    }

    await Promise.all(Array.from({ length: concurrency }, parseWorker))

    // Filter out failed parses and sort by original index to keep the picked order
    const newTracks = indexedResults
      .filter(result => result.track !== null)
      .sort((a, b) => a.index - b.index)
      .map(result => result.track!)

    if (root) await cacheImport(newTracks, root)

    // Final update
    setProgress({
      status: 'completed',
      current: entries.length,
      total: entries.length,
      currentFile: null,
      successCount: newTracks.length,
      failureCount: failureCount,
    })

    // Notify parent component to add tracks
    if (newTracks.length > 0) {
      onTracksParsed(newTracks)
    }

    isImportingRef.current = false

    // Auto-dismiss after 3 seconds
    setTimeout(() => {
      setProgress(prev => {
        if (prev.status === 'completed') {
          return INITIAL_PROGRESS
        }
        return prev
      })
    }, 3000)
  }, [onTracksParsed])

  return {
    progress,
    importEntries,
  }
}

// IndexedDB keeps the metadata and the cover bytes so a reload doesn't have to
// re-parse; a quota error only costs the cache, never the running library.
async function cacheImport(tracks: Track[], root: StoredRoot): Promise<void> {
  const records: StoredTrack[] = []
  for (const track of tracks) {
    records.push({
      id: track.id,
      fileKey: track.fileKey,
      rootId: root.id,
      cover: track.cover ? await readCoverBytes(track.cover) : null,
      metadata: { ...track, url: '', cover: null },
    })
  }
  try {
    await saveImport(root, records)
  } catch (error) {
    console.error('Failed to cache the imported library', error)
  }
}

// The cover is already an object URL, so reading it back is cheaper than making
// the parser return its bytes separately.
async function readCoverBytes(url: string): Promise<Blob> {
  const response = await fetch(url)
  return response.blob()
}
