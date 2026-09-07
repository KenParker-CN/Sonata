export type RepeatMode = 'off' | 'one' | 'all'

export type Page = 'library' | 'artists' | 'albums' | 'playlists'

/**
 * Word-level timing for synchronized lyrics.
 * Each word has a timestamp indicating when it should be highlighted during playback.
 */
export interface LyricWord {
  time: number // seconds
  text: string
}

/**
 * A single line of lyrics with optional word-level synchronization.
 * - startTime: when this line becomes active
 * - text: the full text of the line
 * - words: optional word-level timings (if present, enables word-by-word highlighting)
 * - translation: optional translation text for this line
 * - romanization: optional romanization/pinyin for this line
 */
export interface LyricLine {
  startTime: number // seconds
  text: string
  words?: LyricWord[]
  translation?: string
  romanization?: string
}

/**
 * Lyrics data structure supporting both synced and unsynced lyrics.
 * - synced: true if timestamps are available, false for plain text lyrics
 * - lines: array of lyric lines
 */
export interface Lyrics {
  synced: boolean
  lines: LyricLine[]
}

export interface Track {
  id: string
  url: string
  artist: string
  title: string
  album: string
  albumArtist: string
  trackNumber: number | null
  discNumber: number | null
  cover: string | null
  duration: number
  fileKey?: string
  filePath?: string
  releaseDate?: string | null
  copyright?: string | null
  bitDepth?: number | null
  sampleRate?: number | null
  bitrate?: number | null
  lyrics?: Lyrics | null
}

export interface Playlist {
  id: string
  name: string
  trackIds: string[]
}
