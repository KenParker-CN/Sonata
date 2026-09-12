import type { Playlist } from '@/types/music'

/** What the playlist details dialog edits — raw form text, trimmed by the caller. */
export interface PlaylistDetails {
  name: string
  description: string
}

/**
 * Every edit carries the clock. `now` comes from the caller because a state
 * updater must stay pure.
 */
export function touch(playlist: Playlist, now: number): Playlist {
  return { ...playlist, createdAt: playlist.createdAt ?? now, updatedAt: now }
}
