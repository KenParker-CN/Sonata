import type { Track } from '@/types/music'
import { parseArtists } from '@/utils/parseArtists'
import { albumKey } from '@/utils/groupAlbums'

export interface Composer {
  name: string
  trackCount: number
  albumCount: number
  /** Total length of the distinct tracks this composer wrote on. */
  duration: number
}

/**
 * The composers one track names. Composer tags carry the same separators as
 * artist tags, so both go through parseArtists — otherwise "Beethoven; Mozart"
 * would be listed as a single composer on the Composers page while every other
 * surface matched the raw string.
 */
export function trackComposers(track: Track): string[] {
  return parseArtists(track.composer ?? '')
}

export function hasComposer(track: Track, composerName: string): boolean {
  return trackComposers(track).includes(composerName)
}

// Group tracks by the COMPOSER metadata tag (Track.composer).
// Tracks without a composer tag do not participate — the composers page
// reflects tagged classical metadata only.
export function groupComposers(tracks: Track[]): Composer[] {
  // composer name → its tracks, the albums those tracks sit on, and total length
  const map = new Map<
    string,
    { trackIds: Set<string>; albumKeys: Set<string>; duration: number }
  >()

  for (const track of tracks) {
    const composerNames = trackComposers(track)
    if (composerNames.length === 0) continue

    for (const composerName of composerNames) {
      let bucket = map.get(composerName)
      if (!bucket) {
        bucket = { trackIds: new Set(), albumKeys: new Set(), duration: 0 }
        map.set(composerName, bucket)
      }
      bucket.trackIds.add(track.id)
      bucket.albumKeys.add(albumKey(track))
      bucket.duration += track.duration
    }
  }

  // Ordering belongs to the page's sort control, not here
  return Array.from(map.entries(), ([name, bucket]) => ({
    name,
    trackCount: bucket.trackIds.size,
    albumCount: bucket.albumKeys.size,
    duration: bucket.duration,
  }))
}
