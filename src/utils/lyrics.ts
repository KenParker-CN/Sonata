/**
 * Self-contained LRC-family lyrics parser.
 *
 * Everything here works in SECONDS (floats), matching `<audio>.currentTime`
 * natively — there is no separate millisecond representation to keep in
 * sync, and therefore no unit-mismatch class of bug between the parser and
 * the player. (A previous attempt at this feature bounced between a
 * seconds-based parser and an AMLL-based, milliseconds-based one across
 * several merges; that kind of split is exactly what produces "the
 * highlight is always a little off no matter what I change" symptoms.)
 *
 * Supported line shapes, all detected on the same pass over the raw text:
 *  - Standard line-synced LRC: `[mm:ss.xx] text`
 *  - A line repeated under several stamps (shared chorus): back-to-back
 *    stamps with no text between them, e.g. `[00:12.00][00:34.00]text`,
 *    become independent lines that all show the same text.
 *  - Word/karaoke-level, angle-bracket style:
 *    `[mm:ss.xx]<mm:ss.xx>word<mm:ss.xx>word...`
 *  - Word/karaoke-level, bracket style: `[mm:ss.xx]word[mm:ss.xx]word...`
 *  - Bilingual lines: two lines sharing the exact same leading stamp — the
 *    second becomes the first line's translation instead of its own row.
 *  - Metadata `[offset:±ms]`: shifts every timestamp by that amount.
 *  - Untimed text (no recognizable stamps at all): shown verbatim, no
 *    scroll-following attempted — guessing at timing for a file that has
 *    none of its own is worse than not trying.
 *
 * Word segments are NOT trimmed: with word-level formats, the whitespace
 * between two words often belongs to one segment or the other (a segment can
 * even split a single word across two timestamps), so trimming would eat
 * spacing or truncate a word — something that reads as "the sync is wrong"
 * even when every timestamp is numerically correct. Only whole, word-less
 * lines are trimmed for display.
 */

export interface LyricWord {
  /** Raw text of this segment — intentionally not trimmed; see file doc. */
  text: string
  /** Seconds. */
  start: number
  /** Seconds. Null until `parseLyrics` fills it in from the next segment/line/track end. */
  end: number | null
}

export interface LyricLine {
  /** Seconds. */
  start: number
  /** Seconds. Null only transiently; `parseLyrics` always resolves it before returning. */
  end: number | null
  /** Primary-language text, trimmed for line-level lyrics; concatenation of words for karaoke lines. */
  text: string
  /** Second language sharing this line's timestamp, if any. */
  translation: string | null
  /** Karaoke segments. A plain line-synced lyric has exactly one word spanning the whole line. */
  words: LyricWord[]
}

export interface ParsedLyrics {
  /** Sorted by start time, all timestamps resolved. Empty when nothing could be synced. */
  lines: LyricLine[]
  /** True when at least one real timestamp was found and it is safe to follow playback. */
  synced: boolean
  /** Untimed fallback text (stamps/ID tags stripped), or null when there is nothing to show. */
  plain: string | null
}

const NO_LYRICS: ParsedLyrics = {lines: [], synced: false, plain: null}

/** `[mm:ss]`, `[mm:ss.xx]`, `[h:mm:ss.xx]` — minutes/hours then seconds then an optional fraction. */
const BRACKET_STAMP = /\[(\d{1,3}(?::\d{1,2})?):(\d{2})(?:[.:](\d{1,3}))?]/g
const ANGLE_STAMP = /<(\d{1,3}(?::\d{1,2})?):(\d{2})(?:[.:](\d{1,3}))?>/g
const OFFSET_TAG = /\[offset:\s*([+-]?\d+)]/i
/** A line that is pure metadata (`[ar:...]`, `[ti:...]`, ...) — never a lyric, even an empty one. */
const ID_TAG_LINE = /^\[[a-z]+:[^\]]*]$/i

interface StampMatch {
  /** Character offset where the bracket/angle sequence starts. */
  start: number
  /** Character offset right after the closing bracket/angle. */
  end: number
  /** Seconds. */
  time: number
  kind: '[' | '<'
}

function toSeconds(major: string, seconds: string, fraction?: string): number {
  // `major` is minutes, or `h:mm` when the file stamps hours for very long tracks.
  const majorParts = major.split(':').map(Number)
  const minutes = majorParts.length === 2 ? majorParts[0] * 60 + majorParts[1] : majorParts[0]
  const frac = !fraction
    ? 0
    : fraction.length === 1
      ? Number(fraction) / 10
      : fraction.length === 2
        ? Number(fraction) / 100
        : Number(fraction) / 1000
  return minutes * 60 + Number(seconds) + frac
}

function findStamps(line: string): StampMatch[] {
  const stamps: StampMatch[] = []
  for (const pattern of [BRACKET_STAMP, ANGLE_STAMP] as const) {
    pattern.lastIndex = 0
    let match: RegExpExecArray | null
    while ((match = pattern.exec(line)) !== null) {
      stamps.push({
        start: match.index,
        end: pattern.lastIndex,
        time: toSeconds(match[1], match[2], match[3]),
        kind: pattern === BRACKET_STAMP ? '[' : '<',
      })
    }
  }
  stamps.sort((a, b) => a.start - b.start)
  return stamps
}

/** One raw line turned into zero or more lyric lines (a repeated-stamp line yields several). */
function parseLine(raw: string): LyricLine[] {
  if (ID_TAG_LINE.test(raw.trim())) return []

  const stamps = findStamps(raw)
  if (stamps.length === 0) return []

  // A run of stamps with nothing between them is the "same line, several
  // times" convention (repeated chorus), not word timing — collapse it back
  // to a single anchor and remember every time it should reappear at.
  let leadingRunEnd = 1
  while (
    leadingRunEnd < stamps.length &&
    stamps[leadingRunEnd - 1].kind === '[' &&
    stamps[leadingRunEnd].kind === '[' &&
    raw.slice(stamps[leadingRunEnd - 1].end, stamps[leadingRunEnd].start) === ''
  ) {
    leadingRunEnd += 1
  }
  const repeatTimes = stamps.slice(0, leadingRunEnd).map(s => s.time)
  const rest = stamps.slice(leadingRunEnd - 1) // keeps the last leading stamp as the content anchor

  if (rest.length <= 1) {
    // Plain line-synced lyric (optionally repeated at several timestamps).
    const text = raw.slice(rest[0]?.end ?? 0).trim()
    return repeatTimes.map(time => ({
      start: time,
      end: null,
      text,
      translation: null,
      words: [{text, start: time, end: null}],
    }))
  }

  // Check for bilingual format: look for angle brackets with the same time as the line start
  // Format: [time]<time>words<time>words...<time>translation
  const lineStartTime = rest[0].time
  const angleStamps = rest.filter(s => s.kind === '<')
  
  // Find if there's a translation (angle bracket with same time as line start, appearing after words)
  let translation: string | null = null
  let wordStamps = rest
  
  if (angleStamps.length > 0) {
    // Find the last angle stamp that has the same time as line start
    const translationStampIndex = angleStamps.findIndex((s, idx) => 
      s.time === lineStartTime && idx > 0 && raw.slice(s.end).trim().length > 0
    )
    
    if (translationStampIndex !== -1) {
      const translationStamp = angleStamps[translationStampIndex]
      translation = raw.slice(translationStamp.end).trim()
      // Remove the translation part from the raw string for word parsing
      raw = raw.slice(0, translationStamp.start)
      // Re-find stamps on the trimmed string
      wordStamps = findStamps(raw).slice(leadingRunEnd - 1)
    }
  }

  // Word/karaoke line: every remaining stamp bounds one segment. Segments are
  // NOT trimmed — see the file-level doc comment for why.
  const words: LyricWord[] = []
  for (let i = 0; i < wordStamps.length; i += 1) {
    const segmentEnd = wordStamps[i + 1]?.start ?? raw.length
    words.push({
      text: raw.slice(wordStamps[i].end, segmentEnd),
      start: wordStamps[i].time,
      end: wordStamps[i + 1]?.time ?? null,
    })
  }
  const realWords = words.filter(word => word.text.length > 0)
  if (realWords.length === 0) return []

  const text = realWords.map(word => word.text).join('')
  return repeatTimes.map(time => ({
    start: time,
    end: null,
    text,
    translation,
    words: realWords,
  }))
}

/** Strips recognizable stamps/ID lines and returns whatever text is left, for the untimed fallback. */
function plainFallback(text: string): string | null {
  const cleaned = text
    .split(/\r?\n/)
    .filter(line => !ID_TAG_LINE.test(line.trim()) && !OFFSET_TAG.test(line))
    .map(line => line.replace(BRACKET_STAMP, '').replace(ANGLE_STAMP, '').trim())
    .filter(line => line.length > 0)
    .join('\n')
  return cleaned.length > 0 ? cleaned : null
}

export function parseLyrics(raw: string | null | undefined, durationSeconds = 0): ParsedLyrics {
  const text = raw?.trim()
  if (!text) return NO_LYRICS

  const offsetMatch = text.match(OFFSET_TAG)
  const offsetSeconds = offsetMatch ? Number(offsetMatch[1]) / 1000 : 0

  // If there are no line breaks, split by bracket timestamps to create lines
  let linesToParse: string[]
  if (!text.includes('\n') && !text.includes('\r')) {
    // Split by bracket timestamps that start a new line
    // Look for [ followed by time digits, which indicates a new line
    const lines: string[] = []
    let currentLine = ''
    let i = 0
    while (i < text.length) {
      if (text[i] === '[' && /\d/.test(text[i + 1] || '')) {
        if (currentLine.trim()) {
          lines.push(currentLine.trim())
        }
        currentLine = ''
      }
      currentLine += text[i]
      i++
    }
    if (currentLine.trim()) {
      lines.push(currentLine.trim())
    }
    linesToParse = lines
  } else {
    linesToParse = text.split(/\r?\n/)
  }

  const rawLines = linesToParse.flatMap(parseLine)
  if (rawLines.length === 0) return {lines: [], synced: false, plain: plainFallback(text)}

  const shifted = rawLines.map(line => ({
    ...line,
    start: line.start + offsetSeconds,
    words: line.words.map(word => ({...word, start: word.start + offsetSeconds})),
  }))
  shifted.sort((a, b) => a.start - b.start)

  // Bilingual: a second line landing on the exact same timestamp as the one
  // before it is that line's translation, not a row of its own.
  const merged: LyricLine[] = []
  for (const line of shifted) {
    const previous = merged[merged.length - 1]
    if (previous && previous.start === line.start) {
      previous.translation = previous.translation
        ? `${previous.translation} ${line.text}`
        : line.text
      continue
    }
    merged.push(line)
  }

  // Resolve every remaining null end: a word's end falls back to its line's
  // end, and a line's end falls back to the next line's start, or the
  // track's duration for the last line.
  merged.forEach((line, index) => {
    const next = merged[index + 1]
    const ceiling = next ? next.start : durationSeconds > 0 ? durationSeconds + offsetSeconds : line.start
    line.end = line.end ?? Math.max(ceiling, line.start)
    line.words.forEach(word => {
      word.end = word.end ?? line.end
    })
  })

  // Stamps that only ever say 00:00 mean the file has markup but no real
  // timing of its own; following it would pin the first line highlighted for
  // the whole track, so it is safer to show it as plain, unsynced text.
  const timed = merged.length > 1 || (merged.length === 1 && merged[0].start > 0)
  if (!timed) return {lines: [], synced: false, plain: plainFallback(text)}

  return {lines: merged, synced: true, plain: null}
}

/** Index of the line that should be highlighted at `currentTime` (seconds), or -1 before the first line. */
export function activeLyricIndex(lines: readonly LyricLine[], currentTime: number): number {
  let active = -1
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].start <= currentTime) active = index
    else break
  }
  return active
}

/** Index of the word that should be highlighted at `currentTime` (seconds) within one line, or -1 before the first word. */
export function activeWordIndex(words: readonly LyricWord[], currentTime: number): number {
  let active = -1
  for (let index = 0; index < words.length; index += 1) {
    if (words[index].start <= currentTime) active = index
    else break
  }
  return active
}
