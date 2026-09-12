import type { Track } from '@/types/music'
import { parseArtists } from '@/utils/parseArtists'
import { albumKey } from '@/utils/groupAlbums'

export interface Artist {
  name: string
  trackCount: number
  albumCount: number
  /** Total length of the distinct tracks credited to this artist. */
  duration: number
}

/**
 * Everyone a track credits: its own artist tag plus the album artist. The
 * Artists page, the artist detail page and the "Play artist" action all go
 * through this, so a track cannot be counted under an artist there and missing
 * from that artist's page here.
 */
export function trackArtists(track: Track): string[] {
  return [...new Set([...parseArtists(track.artist), ...parseArtists(track.albumArtist)])]
}

export function hasArtist(track: Track, artistName: string): boolean {
  return trackArtists(track).includes(artistName)
}

export function groupArtists(tracks: Track[]): Artist[] {
  // artist name → everything the sort control can order the page by
  const map = new Map<
    string,
    { trackIds: Set<string>; albumKeys: Set<string>; duration: number }
  >()

  for (const track of tracks) {
    const names = trackArtists(track)

    // If no valid artists found, use "Unknown Artist"
    for (const name of names.length > 0 ? names : ['Unknown Artist']) {
      let bucket = map.get(name)
      if (!bucket) {
        bucket = { trackIds: new Set(), albumKeys: new Set(), duration: 0 }
        map.set(name, bucket)
      }
      bucket.trackIds.add(track.id)
      bucket.albumKeys.add(albumKey(track))
      bucket.duration += track.duration
    }
  }

  // Counts are set sizes, so a track credited to an artist twice still counts once
  return Array.from(map.entries(), ([name, bucket]) => ({
    name,
    trackCount: bucket.trackIds.size,
    albumCount: bucket.albumKeys.size,
    duration: bucket.duration,
  }))
}
