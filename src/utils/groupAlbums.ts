import type { Track } from '@/types/music'
import { parseArtists } from '@/utils/parseArtists'

export interface Album {
  name: string
  albumArtist: string
  cover: string | null
  trackIndices: number[]
}

export const UNKNOWN_ALBUM = 'Unknown Album'
export const UNKNOWN_ARTIST = 'Unknown Artist'

/**
 * Canonical form of an album-artist tag. Routing through parseArtists keeps it
 * in step with the Artists page, which splits the very same tag on `/`, `;` and
 * `&` — the hand-rolled normalizer this replaces only handled `;`, so one album
 * could show up under two different artist spellings across pages.
 */
export function normalizeAlbumArtist(raw: string | null | undefined): string {
  const names = parseArtists(raw ?? '')
  return names.length > 0 ? names.join(', ') : UNKNOWN_ARTIST
}

export function normalizeAlbumName(raw: string | null | undefined): string {
  return (raw ?? '').trim() || UNKNOWN_ALBUM
}

/**
 * Album identity is the normalized pair, never the raw tag. Both arguments are
 * normalized as well, so a caller can pass either a track's raw values or an
 * Album's already-normalized ones and still resolve the same album. That relies
 * on normalizeAlbumArtist/normalizeAlbumName being idempotent.
 */
export function matchesAlbum(
  track: Track,
  albumName: string,
  albumArtist: string,
): boolean {
  return (
    normalizeAlbumName(track.album) === normalizeAlbumName(albumName) &&
    normalizeAlbumArtist(track.albumArtist) === normalizeAlbumArtist(albumArtist)
  )
}

/**
 * The identity of an album as a flat string. Grouping by album and counting how
 * many albums one artist or composer appears on are the same question, so both
 * read this instead of rebuilding the key and risking a different spelling.
 */
export function albumKey(track: Track): string {
  return `${normalizeAlbumName(track.album)}::${normalizeAlbumArtist(track.albumArtist)}`
}

export function groupAlbums(tracks: Track[]): Album[] {
  const map = new Map<string, Album>()

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    const albumName = normalizeAlbumName(track.album)
    // Group by album + albumArtist — not track artist, since tracks within the
    // same album (especially classical / various-artists) may have different
    // track artists but share one albumArtist.
    const albumArtist = normalizeAlbumArtist(track.albumArtist)
    const key = albumKey(track)

    const existing = map.get(key)
    if (existing) {
      existing.trackIndices.push(i)
      if (!existing.cover && track.cover) {
        existing.cover = track.cover
      }
    } else {
      map.set(key, {
        name: albumName,
        albumArtist,
        cover: track.cover,
        trackIndices: [i],
      })
    }
  }

  return Array.from(map.values())
}
