import { useCallback, useRef, useState } from 'react'
import { parseTrackFile } from '@/services/metadata'
import type { Track } from '@/types/music'

export interface ImportProgress {
  status: 'idle' | 'importing' | 'completed' | 'error'
  current: number
  total: number
  currentFile: string | null
  successCount: number
  failureCount: number
}

interface UseImportManagerResult {
  progress: ImportProgress
  importFiles: (files: File[]) => Promise<void>
  resetImport: () => void
}

export function useImportManager(onTracksParsed: (tracks: Track[]) => void): UseImportManagerResult {
  const [progress, setProgress] = useState<ImportProgress>({
    status: 'idle',
    current: 0,
    total: 0,
    currentFile: null,
    successCount: 0,
    failureCount: 0,
  })

  const isImportingRef = useRef(false)
  const accumulatedTracksRef = useRef<Track[]>([])

  const resetImport = useCallback(() => {
    setProgress({
      status: 'idle',
      current: 0,
      total: 0,
      currentFile: null,
      successCount: 0,
      failureCount: 0,
    })
    accumulatedTracksRef.current = []
    isImportingRef.current = false
  }, [])

  const importFiles = useCallback(async (files: File[]) => {
    if (isImportingRef.current) {
      console.warn('Import already in progress')
      return
    }

    const audioFiles = files.filter(f => f.type.startsWith('audio/'))
    if (audioFiles.length === 0) {
      return
    }

    isImportingRef.current = true
    accumulatedTracksRef.current = []

    setProgress({
      status: 'importing',
      current: 0,
      total: audioFiles.length,
      currentFile: null,
      successCount: 0,
      failureCount: 0,
    })

    // Limit concurrent metadata parsing to avoid saturating the browser's main thread and memory.
    const indexedResults: Array<{ index: number; track: Track | null }> = new Array(audioFiles.length).fill(null)
    const concurrency = Math.min(4, audioFiles.length)
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
        completed === audioFiles.length ||
        completed - lastProgressCount >= 8 ||
        now - lastProgressTime >= 100

      if (shouldRender) {
        lastProgressCount = completed
        lastProgressTime = now
        setProgress({
          status: 'importing',
          current: completed,
          total: audioFiles.length,
          currentFile,
          successCount,
          failureCount,
        })
      }
    }

    const parseWorker = async () => {
      while (nextIndex < audioFiles.length) {
        const originalIndex = nextIndex
        nextIndex += 1
        const file = audioFiles[originalIndex]

        try {
          const track = await parseTrackFile(file)
          indexedResults[originalIndex] = { index: originalIndex, track }
          successCount += 1
        } catch (error) {
          console.error(`Failed to parse file: ${file.name}`, error)
          indexedResults[originalIndex] = { index: originalIndex, track: null }
          failureCount += 1
        }

        updateProgress(file.name)
      }
    }

    await Promise.all(Array.from({ length: concurrency }, parseWorker))

    // Filter out failed parses and sort by original index to restore FileList order
    const newTracks = indexedResults
      .filter(result => result.track !== null)
      .sort((a, b) => a.index - b.index)
      .map(result => result.track!)

    // Final update
    setProgress({
      status: 'completed',
      current: audioFiles.length,
      total: audioFiles.length,
      currentFile: null,
      successCount: indexedResults.filter(r => r.track !== null).length,
      failureCount: indexedResults.filter(r => r.track === null).length,
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
          return {
            status: 'idle',
            current: 0,
            total: 0,
            currentFile: null,
            successCount: 0,
            failureCount: 0,
          }
        }
        return prev
      })
    }, 3000)
  }, [onTracksParsed])

  return {
    progress,
    importFiles,
    resetImport,
  }
}
