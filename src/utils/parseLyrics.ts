import type { Lyrics, LyricLine, LyricWord } from '@/types/music'

/**
 * Parse time string in LRC format [mm:ss.xx] or [mm:ss.xxx] to seconds.
 * Returns null if the format is invalid.
 */
function parseTime(timeStr: string): number | null {
  const match = timeStr.match(/^[\[<](\d{2}):(\d{2})(?:\.(\d+))?[\]>]/)
  if (!match) return null

  const minutes = parseInt(match[1], 10)
  const seconds = parseInt(match[2], 10)
  const milliseconds = match[3] ? parseInt(match[3].padEnd(3, '0').slice(0, 3), 10) : 0

  return minutes * 60 + seconds + milliseconds / 1000
}

/**
 * Parse a single LRC line that may contain word-level timestamps.
 *
 * LRC formats supported:
 * 1. Line-level only: [00:03.200]I saw a field of gold and green
 *    → One LyricLine with no words array
 *
 * 2. Word-level (word-synced): [00:03.200]I[00:03.688] saw[00:04.432] a[00:04.556] field
 *    → One LyricLine with words array containing each word's timestamp
 *
 * Key principle: NEWLINE determines lyric lines, timestamps within a line determine word timing.
 * Multiple timestamps on the same line do NOT create multiple LyricLines.
 */
function parseLrcLine(line: string): LyricLine | null {
  // Find all timestamps in the line
  const timestampRegex = /[\[<]\d{2}:\d{2}(?:\.\d+)?[\]>]/g
  const timestamps = [...line.matchAll(timestampRegex)]

  if (timestamps.length === 0) {
    // No timestamps - this might be metadata like [ti:Title] or plain text
    // Skip metadata tags
    if (line.match(/^\[(ti|ar|al|by|offset):/i)) {
      return null
    }
    // Plain text without timing - treat as unsynced
    return {
      startTime: 0,
      text: line.trim(),
    }
  }

  // Extract the first timestamp for the line start time
  const firstTimestamp = timestamps[0][0]
  const startTime = parseTime(firstTimestamp)
  if (startTime === null) return null

  // If there's only one timestamp, it's line-level sync (no word-level detail)
  if (timestamps.length === 1) {
    // Remove the timestamp to get the text
    const text = line.replace(timestampRegex, '').trim()
    if (!text) return null

    return {
      startTime,
      text,
    }
  }

  // Multiple timestamps - this is word-synced lyrics
  // We need to extract each word with its corresponding timestamp
  const words: LyricWord[] = []

  // Split by timestamps to get segments
  const segments = line.split(timestampRegex)

  // segments[0] is empty or before first timestamp, segments[1+] are the text after each timestamp
  for (let i = 1; i < segments.length; i++) {
    const timestamp = timestamps[i - 1][0]
    const time = parseTime(timestamp)
    const text = segments[i]

    if (time !== null && text) {
      words.push({
        time,
        text,
      })
    }
  }

  // Use the first word's text as the full line text for display purposes
  const fullText = words.map(w => w.text).join('')

  return {
    startTime,
    text: fullText,
    words,
  }
}

/**
 * Parse LRC format lyrics (with or without word-level synchronization).
 *
 * @param lrcContent - Raw LRC string content
 * @returns Parsed Lyrics object, or null if parsing fails
 */
export function parseLrcLyrics(lrcContent: string): Lyrics | null {
  if (!lrcContent || !lrcContent.trim()) {
    return null
  }

  const lines = lrcContent.split('\n')
  const parsedLines: LyricLine[] = []

  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed) continue // Skip empty lines

    const parsed = parseLrcLine(trimmed)
    if (parsed) {
      parsedLines.push(parsed)
    }
  }

  if (parsedLines.length === 0) {
    return null
  }

  // Check if any line has word-level sync to determine if lyrics are synced
  const hasSync = parsedLines.some(line => line.words && line.words.length > 0) ||
                  parsedLines.some(line => line.startTime > 0)

  return {
    synced: hasSync,
    lines: parsedLines,
  }
}

/**
 * Parse plain text lyrics (no timestamps).
 *
 * @param text - Plain text lyrics
 * @returns Unsynced Lyrics object, or null if empty
 */
export function parsePlainTextLyrics(text: string): Lyrics | null {
  if (!text || !text.trim()) {
    return null
  }

  const lines = text.split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0)

  if (lines.length === 0) {
    return null
  }

  return {
    synced: false,
    lines: lines.map(line => ({
      startTime: 0,
      text: line,
    })),
  }
}

/**
 * Detect if a string contains LRC-style timestamps.
 */
export function isLrcFormat(content: string): boolean {
  return /[\[<]\d{2}:\d{2}(?:\.\d+)?[\]>]/.test(content)
}

/**
 * Parse lyrics from various formats.
 * Automatically detects LRC vs plain text and parses accordingly.
 *
 * @param content - Raw lyrics content (may be LRC or plain text)
 * @returns Parsed Lyrics object, or null if no valid lyrics found
 */
export function parseLyrics(content: string | undefined | null): Lyrics | null {
  if (!content || !content.trim()) {
    return null
  }

  const trimmed = content.trim()

  // Check if it's LRC format
  if (isLrcFormat(trimmed)) {
    return parseLrcLyrics(trimmed)
  }

  // Otherwise treat as plain text
  return parsePlainTextLyrics(trimmed)
}

/**
 * Find all current active lyric lines based on playback time.
 * 
 * Supports multiple lines with the same startTime (parallel lyrics).
 * Returns indices of all lines whose startTime <= currentTime and are not yet passed.
 * A line is considered "passed" when the next line's startTime is reached.
 *
 * @param currentTime - Current playback position in seconds
 * @param lyrics - Parsed lyrics object
 * @returns Array of indices of active lines (can be empty or have multiple entries)
 */
export function findActiveLyricLines(currentTime: number, lyrics: Lyrics | null): number[] {
  if (!lyrics || !lyrics.synced || lyrics.lines.length === 0) {
    return []
  }

  const lines = lyrics.lines
  
  // Find all lines whose startTime <= currentTime
  // But we need to determine which ones are still "active"
  // A line remains active until the next distinct startTime is reached
  
  // First, collect all unique startTimes in sorted order
  const uniqueStartTimes = [...new Set(lines.map(line => line.startTime))].sort((a, b) => a - b)
  
  // Find the current time bucket: the largest startTime that is <= currentTime
  let currentBucket: number | null = null
  for (let i = uniqueStartTimes.length - 1; i >= 0; i--) {
    if (uniqueStartTimes[i] <= currentTime) {
      currentBucket = uniqueStartTimes[i]
      break
    }
  }
  
  // If no bucket found (currentTime is before all lyrics), return empty
  if (currentBucket === null) {
    return []
  }
  
  // Return all line indices that belong to this time bucket
  const activeIndices: number[] = []
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startTime === currentBucket) {
      activeIndices.push(i)
    }
  }
  
  return activeIndices
}

/**
 * Find the current active word within a lyric line based on playback time.
 *
 * @param currentTime - Current playback position in seconds
 * @param line - The active lyric line
 * @returns Index of the active word, or -1 if none or line has no word-level sync
 */
export function findActiveWord(currentTime: number, line: LyricLine | undefined): number {
  if (!line || !line.words || line.words.length === 0) {
    return -1
  }

  // Find the last word whose time is <= currentTime
  let activeIndex = -1
  for (let i = 0; i < line.words.length; i++) {
    if (line.words[i].time <= currentTime) {
      activeIndex = i
    } else {
      break
    }
  }

  return activeIndex
}
