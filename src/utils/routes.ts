/**
 * Detail routes in one place so a `Link`, an `NavLink` and a programmatic
 * navigation can never disagree about where an entity lives.
 */

export function albumPath(albumName: string, albumArtist: string): string {
  return `/albums/${encodeURIComponent(albumArtist)}/${encodeURIComponent(albumName)}`
}

export function artistPath(artistName: string): string {
  return `/artists/${encodeURIComponent(artistName)}`
}

export function composerPath(composerName: string): string {
  return `/composers/${encodeURIComponent(composerName)}`
}

export function playlistPath(playlistId: string): string {
  return `/playlists/${playlistId}`
}

export function trackPath(trackId: string): string {
  return `/tracks/${encodeURIComponent(trackId)}`
}
