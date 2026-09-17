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

const timestampPattern = /(\[|<)(\d{1,3}):(\d{2})(?:[.:](\d{1,3}))?(?:\]|>)/g

function timestampToSeconds(minutes: string, seconds: string, fraction = ''): number {
  const fractionalSeconds = fraction.length === 1
    ? Number(fraction) / 10
    : fraction.length === 2
      ? Number(fraction) / 100
      : Number(fraction) / 1000
  return Number(minutes) * 60 + Number(seconds) + fractionalSeconds
}

function matchesForLine(raw: string): { matches: TimestampMatch[]; text: string } {
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
  for (const rawLine of raw.split(/\r?\n/)) {
    const { matches, text: source } = matchesForLine(rawLine)
    if (matches.length === 0) continue

    const wordMatches = matches.filter(match => match.kind === '<')
    if (wordMatches.length > 0) {
      const words = wordMatches
        .map((marker, index) => ({
          text: source.slice(marker.end, wordMatches[index + 1]?.start ?? source.length).trim(),
          start: marker.time,
          end: wordMatches[index + 1]?.time ?? null,
        }))
        .filter(word => word.text.length > 0)
      if (words.length > 0) {
        lines.push({
          start: words[0].start,
          end: words[words.length - 1].end,
          text: words.map(word => word.text).join(' '),
          words,
        })
      }
      continue
    }

    for (let index = 0; index < matches.length; index += 1) {
      const marker = matches[index]
      const next = matches[index + 1]
      const text = source.slice(marker.end, next?.start ?? source.length).trim()
      if (!text) continue
      lines.push({
        start: marker.time,
        end: next?.time ?? null,
        text,
        words: [{ text, start: marker.time, end: next?.time ?? null }],
      })
    }
  }

  return lines.sort((a, b) => a.start - b.start)
}

export function activeLyricIndex(lines: LyricLine[], currentTime: number): number {
  let active = -1
  for (let index = 0; index < lines.length; index += 1) {
    if (lines[index].start <= currentTime) active = index
    else break
  }
  return active
}

export function activeWordIndex(words: LyricWord[], currentTime: number): number {
  let active = -1
  for (let index = 0; index < words.length; index += 1) {
    if (words[index].start <= currentTime) active = index
    else break
  }
  return active
}
