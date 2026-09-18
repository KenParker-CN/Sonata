export type RepeatMode = 'off' | 'one' | 'all'
export interface Track {
  id: string
  url: string
  artist: string
  title: string
  album: string
  albumArtist: string
  composer?: string | null
  trackNumber: number | null
  discNumber: number | null
  cover: string | null
  duration: number
  fileKey: string
  filePath: string
  releaseDate?: string | null
  copyright?: string | null
  bitDepth?: number | null
  sampleRate?: number | null
  bitrate?: number | null
  codec?: string | null
  lossless?: boolean | null
  replayGainTrack?: number | null
  replayGainAlbum?: number | null
  /** Raw LRC-family text extracted from the file's tag; parsed on demand by src/utils/lyrics.ts. */
  lyrics?: string | null
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
  /** Optional fields: playlists stored before they existed carry none of them. */
  description?: string | null
  /** Epoch ms. Unknown for playlists created before timestamps were recorded. */
  createdAt?: number
  updatedAt?: number
}

/**
 * A single entry in the playback queue.
 * - id: unique id for THIS queue entry (a track may appear multiple times)
 * - trackId: id of the referenced track — stable across library edits, unlike
 *   an array index which shifts whenever a track is removed
 *
 * The player keeps one queue as the single source of truth for playback order.
 */
export interface QueueItem {
  id: string
  trackId: string
}
