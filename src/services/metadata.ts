import type {ILyricsTag} from 'music-metadata'
import {parseBlob} from 'music-metadata'
import type {Track} from '../types/music'
import {makeFileKey, trackIdFor} from '../utils/getFileKey'

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
  let replayGainTrack: number | null = null
  let replayGainAlbum: number | null = null

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

    const commonTags = metadata.common as unknown as Record<string, unknown>
    replayGainTrack = parseReplayGainDb(commonTags.replaygain_track_gain)
    replayGainAlbum = parseReplayGainDb(commonTags.replaygain_album_gain)

    if (replayGainTrack === null || replayGainAlbum === null) {
      for (const tagGroup of Object.values(metadata.native)) {
        for (const tag of tagGroup) {
          const tagId = String(tag.id).toLowerCase()
          if (replayGainTrack === null && tagId === 'replaygain_track_gain') {
            replayGainTrack = parseReplayGainDb(tag.value)
          }
          if (replayGainAlbum === null && tagId === 'replaygain_album_gain') {
            replayGainAlbum = parseReplayGainDb(tag.value)
          }
        }
      }
    }

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
    replayGainTrack,
    replayGainAlbum,
  }
}

function parseReplayGainDb(value: unknown): number | null {
  const raw = Array.isArray(value) ? value[0] : value
  if (typeof raw !== 'string' && typeof raw !== 'number') return null
  const match = String(raw).match(/[-+]?\d+(?:\.\d+)?\s*dB/i)
  if (!match) return null
  const gain = Number.parseFloat(match[0])
  return Number.isFinite(gain) && gain >= -60 && gain <= 60 ? gain : null
}

export function revokeTrackUrls(track: Track): void {
  URL.revokeObjectURL(track.url)
  if (track.cover) {
    URL.revokeObjectURL(track.cover)
  }
}
