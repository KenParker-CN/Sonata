import type { Track } from '@/types/music'

export interface Album {
  name: string
  albumArtist: string
  cover: string | null
  trackIndices: number[]
  hasHiRes?: boolean // true if any track in this album is 24-bit
}

export function groupAlbums(tracks: Track[]): Album[] {
  const map = new Map<string, Album>()

  for (let i = 0; i < tracks.length; i++) {
    const track = tracks[i]
    const albumName = track.album.trim() || 'Unknown Album'
    // Normalize albumArtist: replace semicolons with commas, trim whitespace
    const normalizedAlbumArtist = (track.albumArtist || '')
      .replace(/;/g, ', ')
      .split(',')
      .map(a => a.trim())
      .filter(Boolean)
      .join(', ') || 'Unknown Artist'

    // Group by album + normalized albumArtist — not track artist, since tracks within
    // the same album (especially classical / various-artists) may have
    // different track artists but share one albumArtist.
    const key = `${albumName}::${normalizedAlbumArtist}`

    if (map.has(key)) {
      const album = map.get(key)!
      album.trackIndices.push(i)
      if (!album.cover && track.cover) {
        album.cover = track.cover
      }
      // Mark as Hi-Res if any track is 24-bit
      if (track.bitDepth === 24) {
        album.hasHiRes = true
      }
    } else {
      map.set(key, {
        name: albumName,
        albumArtist: normalizedAlbumArtist,
        cover: track.cover,
        trackIndices: [i],
        hasHiRes: track.bitDepth === 24,
      })
    }
  }

  return Array.from(map.values())
}
