import {parseBlob} from 'music-metadata'
import type {ILyricsTag} from 'music-metadata'
import type {Track} from '../types/music'
import {makeFileKey, trackIdFor} from '../utils/getFileKey'

// LRC-family stamp precision: centiseconds are the format's most portable
// fraction and far finer than lyrics timing needs.
function formatLrcStamp(ms: number): string {
  const total = Math.max(0, Math.round(ms))
  const minutes = Math.floor(total / 60_000)
  const seconds = Math.floor((total % 60_000) / 1000)
  const centis = Math.floor((total % 1000) / 10)
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
}

/**
 * Turns one music-metadata lyrics tag into the LRC-with-angle-brackets text
 * `src/utils/lyrics.ts` parses. Two shapes come out of `music-metadata`:
 *  - USLT (unsynchronized): a plain text block — passed through as-is.
 *  - SYLT (synchronized): a flat list of {text, timestamp} syllables/words in
 *    milliseconds. A newline embedded in an entry's text is the only line
 *    break SYLT gives us, so it doubles as both a syllable and a line-end
 *    marker here.
 */
export function serializeLyricsTag(tag: ILyricsTag): string {
  if (tag.syncText.length === 0) return tag.text ?? ''

  const lines: string[] = []
  let lineStart: number | null = null
  let lineBody = ''
  let fallbackMs = 0

  const flush = () => {
    const body = lineBody.trim()
    if (body && lineStart !== null) lines.push(`[${formatLrcStamp(lineStart)}]${body}`)
    lineStart = null
    lineBody = ''
  }

  for (const entry of tag.syncText) {
    const ms = Number.isFinite(entry.timestamp) ? Math.max(0, entry.timestamp as number) : fallbackMs
    fallbackMs = ms
    const segments = (entry.text ?? '').split(/\r?\n/)

    segments.forEach((segment, index) => {
      if (segment) {
        lineStart ??= ms
        lineBody += `<${formatLrcStamp(ms)}>${segment}`
      }
      if (index < segments.length - 1) flush()
    })
  }
  flush()

  return lines.join('\n')
}

/**
 * A track's tag can carry several lyrics entries at once (original text plus
 * a translation, stored as separate frames). Each is serialized on its own,
 * then joined: `parseLyrics` sorts every resulting line by timestamp and
 * folds lines that land on the exact same stamp together as a translation
 * pair, so it does not matter that the two blocks arrive back-to-back here
 * rather than already interleaved.
 */
export function extractLyrics(lyricsTags: ILyricsTag[] | undefined): string | null {
  if (!lyricsTags || lyricsTags.length === 0) return null
  const blocks = lyricsTags.map(serializeLyricsTag).filter(block => block.trim().length > 0)
  return blocks.length > 0 ? blocks.join('\n') : null
}

// `path` is the track's location relative to the folder the user picked, which
// is what persistence later re-matches the cached metadata against.
export async function parseTrackFile(file: File, path: string): Promise<Track> {
  const url = URL.createObjectURL(file)
  const fileKey = makeFileKey(path, file.size, file.lastModified)
  let artist = ''
  let albumArtist = 'Unknown Artist'
  let composer: string | null = null
  let title = file.name.replace(/\.[^.]+$/, '')
  let album = ''
  let trackNumber: number | null = null
  let discNumber: number | null = null
  let cover: string | null = null
  let duration = 0
  let releaseDate: string | null = null
  let copyright: string | null = null
  let bitDepth: number | null = null
  let sampleRate: number | null = null
  let bitrate: number | null = null
  let codec: string | null = null
  let lossless: boolean | null = null
  let lyrics: string | null = null

  try {
    const metadata = await parseBlob(file)
    artist = metadata.common.artist || ''
    title = metadata.common.title || file.name.replace(/\.[^.]+$/, '')
    album = metadata.common.album || ''
    duration = metadata.format.duration || 0

    // Audio technical info from format metadata
    bitDepth = metadata.format.bitsPerSample ?? null
    sampleRate = metadata.format.sampleRate ?? null
    bitrate = metadata.format.bitrate ?? null
    codec = metadata.format.codec ?? null
    lossless = metadata.format.lossless ?? null


    // Album artist fallback: albumartist → artist → 'Unknown Artist'
    albumArtist = metadata.common.albumartist || metadata.common.artist || 'Unknown Artist'

    // Composer from the audio metadata tag (COMPOSER/TCOM).
    // music-metadata exposes it as an array; do NOT fall back to the title/filename.
    composer = (metadata.common.composer && metadata.common.composer[0]) || null

    // Track number from metadata (track is { no, of } object)
    const trackNo = metadata.common.track?.no
    if (typeof trackNo === 'number' && !isNaN(trackNo)) {
      trackNumber = trackNo
    }

    // Disc number from metadata. music-metadata exposes it as common.disk
    const discNo = metadata.common.disk?.no
    if (typeof discNo === 'number' && !isNaN(discNo)) {
      discNumber = discNo
    }

    const dateValue = metadata.common.originaldate ?? metadata.common.date

    if (dateValue) {
      // originaldate 可能是 { year, month, day } 对象或字符串
      if (typeof dateValue === 'object' && 'year' in dateValue) {
        const { year, month, day } = dateValue as { year: number; month?: number; day?: number }
        const parts = [year.toString()]
        if (month) {
          parts.push(month.toString().padStart(2, '0'))
          if (day) {
            parts.push(day.toString().padStart(2, '0'))
          }
        }
        releaseDate = parts.join('-')
      } else {
        releaseDate = String(dateValue)
      }
    }

    // Copyright from metadata
    copyright = metadata.common.copyright || null

    // Lyrics tag (USLT/SYLT, Vorbis LYRICS, MP4 ©lyr, ...) → LRC-family text
    // that src/utils/lyrics.ts can parse directly.
    lyrics = extractLyrics(metadata.common.lyrics)

    if (metadata.common.picture?.[0]) {
      const pic = metadata.common.picture[0]
      const blob = new Blob([new Uint8Array(pic.data)], { type: pic.format })
      cover = URL.createObjectURL(blob)
    }
  } catch {
    // Metadata parsing failed; use filename as title, albumArtist stays 'Unknown Artist'
  }

  return {
    id: trackIdFor(fileKey),
    url,
    artist,
    title,
    album,
    albumArtist,
    composer,
    trackNumber,
    discNumber,
    cover,
    duration,
    fileKey,
    filePath: path,
    releaseDate,
    copyright,
    bitDepth,
    sampleRate,
    bitrate,
    codec,
    lossless,
    lyrics,
  }
}
export function revokeTrackUrls(track: Track): void {
  URL.revokeObjectURL(track.url)
  if (track.cover) {
    URL.revokeObjectURL(track.cover)
  }
}
