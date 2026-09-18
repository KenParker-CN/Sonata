/**
 * SYLT frames hold per-word stamps rather than text with stamps in it, so they
 * are written back out as enhanced LyRiC — the one text format that keeps both
 * the line break and the word timing. `parseLyrics()` reads it back later.
 *
 * This file deliberately imports nothing: it runs at import time, on the main
 * bundle, while the parsers it feeds live behind Now Playing's lazy chunk.
 */

/** One SYLT entry: a word (or several) and the millisecond it starts at. */
export interface SyncLyricEntry {
    text: string
    timestamp?: number
}

export function serializeSyncLyrics(entries: SyncLyricEntry[]): string | null {
    const lines: string[] = []
    let lineStart: number | null = null
    let lineBody = ''
    let fallbackStamp = 0

    const flush = () => {
        const body = lineBody.trim()
        if (body && lineStart !== null) lines.push(`[${formatStamp(lineStart)}]${body}`)
        lineStart = null
        lineBody = ''
    }

    for (const entry of entries) {
        const stamp = Number.isFinite(entry.timestamp)
            ? Math.max(0, entry.timestamp as number)
            : fallbackStamp
        fallbackStamp = stamp
        // A newline inside the entry is the only line break SYLT gives us.
        const segments = entry.text.split(/\r?\n/)

        segments.forEach((segment, index) => {
            if (segment) {
                if (lineStart === null) lineStart = stamp
                lineBody += `<${formatStamp(stamp)}>${segment}`
            }
            if (index < segments.length - 1) flush()
        })
    }

    flush()
    return lines.length > 0 ? lines.join('\n') : null
}

// LyRiC stamps are `mm:ss.xx`; centiseconds are far finer than lyrics need and
// the format's most portable precision.
function formatStamp(ms: number): string {
    const total = Math.max(0, Math.round(ms))
    const minutes = Math.floor(total / 60_000)
    const seconds = Math.floor(total % 60_000 / 1000)
    const centis = Math.floor(total % 1000 / 10)
    return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}.${String(centis).padStart(2, '0')}`
}
