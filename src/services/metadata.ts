import type {ILyricsTag} from 'music-metadata'
import {parseBlob} from 'music-metadata'
import type {Track} from '../types/music'
import {makeFileKey, trackIdFor} from '../utils/getFileKey'
import {serializeSyncLyrics} from '../utils/serializeSyncLyrics'

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

    // ReplayGain tags are intentionally not read: applying them would multiply
    // the same value the fade engine interpolates toward and the two would
    // fight over `<audio>.volume`.

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

    // Lyrics from metadata. `common.lyrics` holds one entry per USLT / SYLT /
    // ©lyr / LYRICS tag, and one file often carries two — the original and its
    // translation — stamped identically. A SYLT frame stores per-word stamps
    // instead of text with stamps in it, so it is written back out as enhanced
    // LyRiC and every kind ends up in one string the lyric player can read.
    lyrics = collectLyrics(metadata.common.lyrics)

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

// ID3v2 numbers what a lyrics frame carries. 0-3 describe the words themselves
// (unspecified, lyrics, transcription, movement name); 4 and up are events,
// chords, trivia and URLs, which would only be noise under the lyrics.
const LYRIC_CONTENT_TYPES = new Set([0, 1, 2, 3])

function collectLyrics(tags: ILyricsTag[] | undefined): string | null {
  if (!tags || tags.length === 0) return null

  const parts: string[] = []
  for (const tag of tags) {
    // USLT frames carry no content type at all, so only a stated one filters.
    if (tag.contentType !== undefined && !LYRIC_CONTENT_TYPES.has(tag.contentType)) continue
    const text = tag.syncText?.length ? serializeSyncLyrics(tag.syncText) : tag.text?.trim()
    if (text) parts.push(text)
  }

  return parts.length > 0 ? parts.join('\n') : null
}

export function revokeTrackUrls(track: Track): void {
  URL.revokeObjectURL(track.url)
  if (track.cover) {
    URL.revokeObjectURL(track.cover)
  }
}
