import type { Track } from '@/types/music'

/**
 * The one collation every alphabetical list in the app uses. `sensitivity:
 * 'base'` keeps "Beatles" next to "beatles" instead of splitting them on case
 * and lets the platform's locale rules handle accents and punctuation, so the
 * A-Z sections, the sort control and the group pages cannot disagree about who
 * comes first.
 */
export function compareNames(a: string, b: string): number {
  return a.localeCompare(b, undefined, { sensitivity: 'base' })
}

/** Listening order within one album: disc, then track number. */
export function byDiscAndTrack(a: Track, b: Track): number {
  return (
    (a.discNumber ?? 1) - (b.discNumber ?? 1) ||
    (a.trackNumber ?? 0) - (b.trackNumber ?? 0)
  )
}
