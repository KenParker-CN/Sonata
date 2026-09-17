export interface LyricWord {
  text: string
  start: number
  end: number | null
}

export interface LyricLine {
  start: number
  end: number | null
  text: string
  words: LyricWord[]
}

interface TimestampMatch {
  start: number
  end: number
  time: number
  kind: '[' | '<'
}

const timestampPattern = /([[<])(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?[\]>]/g

function timestampToSeconds(minutes: string, seconds: string, fraction = ''): number {
  const fractionalSeconds = fraction.length === 1
    ? Number(fraction) / 10
    : fraction.length === 2
      ? Number(fraction) / 100
      : Number(fraction) / 1000
  return Number(minutes) * 60 + Number(seconds) + fractionalSeconds
}

function matchesForLine(raw: string): { matches: TimestampMatch[]; text: string } {
  timestampPattern.lastIndex = 0
  const matches: TimestampMatch[] = []
  let match: RegExpExecArray | null
  while ((match = timestampPattern.exec(raw)) !== null) {
    matches.push({
      start: match.index,
      end: timestampPattern.lastIndex,
      time: timestampToSeconds(match[2], match[3], match[4]),
      kind: match[1] as '[' | '<',
    })
  }
  timestampPattern.lastIndex = 0
  return { matches, text: raw }
}

export function parseLyrics(raw: string | null | undefined): LyricLine[] {
  if (!raw?.trim()) return []

  const lines: LyricLine[] = []
  let lastStart = 0
  let pendingText = ''

  for (const rawLine of raw.split(/\r?\n/)) {
    const { matches, text: source } = matchesForLine(rawLine)
    if (matches.length === 0) {
      // Unsynced line: append to the pending buffer. If we already have
      // parsed lines, this line will be attached to the last known timestamp
      // when the next synced line arrives (or at the end).
      if (rawLine.trim().length > 0) {
        pendingText += (pendingText.length > 0 ? '\n' : '') + rawLine
      }
      continue
    }

    // Flush any pending unsynced text as its own line, anchored at the
    // last known timestamp (or 0 if nothing parsed yet).
    if (pendingText.length > 0) {
      lines.push({
        start: lastStart,
        end: null,
        text: pendingText.trim(),
        words: [{ text: pendingText.trim(), start: lastStart, end: null }],
      })
      pendingText = ''
    }

    lastStart = matches[0].time

    const wordMatches = matches.filter(match => match.kind === '<')
    if (wordMatches.length > 0) {
      const words = wordMatches
        .map((marker, index) => ({
          text: source.slice(marker.end, wordMatches[index + 1]?.start ?? source.length),
          start: marker.time,
          end: wordMatches[index + 1]?.time ?? null,
        }))
        .filter(word => word.text.trim().length > 0)
      if (words.length > 0) {
        lines.push({
          start: words[0].start,
          end: words[words.length - 1].end,
          text: words.map(word => word.text).join('').trim(),
          words,
        })
      }
      continue
    }

    const segments = matches.map((marker, index) => {
      const nextStart = matches[index + 1]?.start ?? source.length
      // When two timestamps are back-to-back with no gap, the text between
      // them is the word that belongs to the earlier timestamp.  Make sure
      // we always capture it, even when nextStart equals marker.end.
      const raw = source.slice(marker.end, nextStart)
      return {
        start: marker.time,
        end: matches[index + 1]?.time ?? null,
        raw,
      }
    })
    const words = segments
      .filter(segment => segment.raw.trim().length > 0)
      .map(segment => ({ text: segment.raw, start: segment.start, end: segment.end }))
    if (words.length === 0) continue
    if (words.length === 1) {
      // A lone text run spans the whole line, however many stamps repeat it.
      words[0].start = segments[0].start
      words[0].end = segments[segments.length - 1].end
    }
    lines.push({
      start: segments[0].start,
      end: segments[segments.length - 1].end,
      text: words.map(word => word.text).join('').trim(),
      words,
    })
  }

  // Flush any remaining pending unsynced text at the end of the song.
  if (pendingText.length > 0) {
    lines.push({
      start: lastStart,
      end: null,
      text: pendingText.trim(),
      words: [{ text: pendingText.trim(), start: lastStart, end: null }],
    })
  }

  return lines.sort((a, b) => a.start - b.start)
}

export function activeWordIndex(words: LyricWord[], currentTime: number): number {
  let active = -1
  for (let index = 0; index < words.length; index += 1) {
    if (words[index].start <= currentTime) active = index
    else break
  }
  return active
}
