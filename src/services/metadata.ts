import { parseBlob } from 'music-metadata-browser'
import type { Track, Lyrics } from '../types/music'
import { getFileKey } from '../utils/getFileKey'
import { parseLyrics } from '../utils/parseLyrics'

let trackIdCounter = 0

function generateTrackId(): string {
  trackIdCounter += 1
  return `track-${Date.now()}-${trackIdCounter}`
}

export async function parseTrackFile(file: File): Promise<Track> {
  const url = URL.createObjectURL(file)
  const fileKey = getFileKey(file)
  let artist = ''
  let albumArtist = 'Unknown Artist'
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
  let lyrics: Lyrics | null = null

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

    // Extract lyrics from metadata
    // Priority: SYLT (synced lyrics in ID3v2) > USLT/common.lyrics (unsynced)
    // Note: metadata.common.lyrics may contain LRC-formatted text with timestamps
    // We parse it using our parseLyrics utility which handles both synced and unsynced formats
    
    // Check for embedded lyrics in various sources
    let rawLyrics: string | undefined
    
    // Try common.lyrics first (music-metadata normalizes various lyric tags here)
    if (metadata.common.lyrics && metadata.common.lyrics.length > 0) {
      // lyrics is an array of strings, take the first one
      rawLyrics = metadata.common.lyrics[0]
    }
    
    // If no common lyrics, check native tags for SYLT (ID3v2 synced lyrics) or USLT
    if (!rawLyrics && metadata.native) {
      // Check ID3v2.3 or ID3v2.4 native tags
      const id3Tags = metadata.native['ID3v2.3'] || metadata.native['ID3v2.4']
      if (id3Tags) {
        // Look for SYLT (synchronized lyrics) or USLT (unsynchronized lyrics)
        const syltTag = id3Tags.find(tag => tag.id === 'SYLT')
        const usltTag = id3Tags.find(tag => tag.id === 'USLT')
        
        if (syltTag?.value?.text) {
          rawLyrics = syltTag.value.text
        } else if (usltTag?.value?.text) {
          rawLyrics = usltTag.value.text
        }
      }
    }
    
    // Parse the raw lyrics content
    if (rawLyrics) {
      lyrics = parseLyrics(rawLyrics)
    }

    // Album artist fallback: albumartist → artist → 'Unknown Artist'
    albumArtist = metadata.common.albumartist || metadata.common.artist || 'Unknown Artist'

    // Track number from metadata (track is { no, of } object)
    const trackNo = metadata.common.track?.no
    if (typeof trackNo === 'number' && !isNaN(trackNo)) {
      trackNumber = trackNo
    }

    // Disc number from metadata. music-metadata exposes it as common.disk
    // (generic tag id "disk"); fall back to common.disc for other builds.
    const discNo = (metadata.common as any).disk?.no ?? (metadata.common as any).disc?.no
    if (typeof discNo === 'number' && !isNaN(discNo)) {
      discNumber = discNo
    }

    // Release date from metadata (date or year field)
    const dateValue = metadata.common.date || metadata.common.year
    if (dateValue) {
      // Extract just the year from various date formats (e.g., "2023", "2023-05-15", etc.)
      const yearMatch = String(dateValue).match(/^(\d{4})/)
      if (yearMatch) {
        releaseDate = yearMatch[1]
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
    id: generateTrackId(),
    url,
    artist,
    title,
    album,
    albumArtist,
    trackNumber,
    discNumber,
    cover,
    duration,
    fileKey,
    filePath: file.webkitRelativePath || file.name,
    releaseDate,
    copyright,
    bitDepth,
    sampleRate,
    bitrate,
    lyrics,
  }
}

export function revokeTrackUrls(track: Track): void {
  URL.revokeObjectURL(track.url)
  if (track.cover) {
    URL.revokeObjectURL(track.cover)
  }
}
