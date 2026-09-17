import { parseBlob } from 'music-metadata'
import type { Track } from '../types/music'
import { makeFileKey, trackIdFor } from '../utils/getFileKey'

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

    // Lyrics from metadata. music-metadata-browser exposes lyrics in a few
    // different shapes depending on the tag type and the library version, so
    // try several paths before giving up.
    const rawLyrics = (metadata.common as unknown as {
      lyrics?: unknown[]
    }).lyrics
    if (rawLyrics && rawLyrics.length > 0) {
      const collected: string[] = []
      for (const entry of rawLyrics) {
        if (typeof entry === 'string') {
          collected.push(entry)
          continue
        }
        if (entry && typeof entry === 'object') {
          const candidate = entry as Record<string, unknown>
          // Lyrics tags may contain both the timed original and an untimed translation.
          const lyricParts: string[] = []
          for (const key of ['syncText', 'text', 'value', 'Lyrics', 'lyric']) {
            const value = candidate[key]
            if (typeof value === 'string' && value.trim().length > 0 && !lyricParts.includes(value)) {
              lyricParts.push(value)
            } else if (Array.isArray(value)) {
              for (const part of value) {
                if (typeof part === 'string' && part.trim().length > 0 && !lyricParts.includes(part)) {
                  lyricParts.push(part)
                }
              }
            }
          }
          if (lyricParts.length > 0) collected.push(lyricParts.join('\n'))
          // As a last resort, stringify the object and see whether it contains
          // recognizable lyric text (some encoders nest the text deeper).
          if (!candidate.syncText && !candidate.text && !candidate.value) {
            const flattened = JSON.stringify(entry).replace(/"|^\[|\\]/g, '')
            if (flattened.length > 10 && !flattened.includes('undefined')) {
              collected.push(flattened)
            }
          }
        }
      }
      // Join every collected piece with a blank line so the parser can keep
      // each language / stanza as its own block while still seeing the timestamps.
      lyrics = collected.length > 0 ? collected.join('\n\n') : null
    }

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
