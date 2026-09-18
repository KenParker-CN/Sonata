import type {LyricLine} from '@applemusic-like-lyrics/core'
import {type LyricLine as ParsedLyricLine, parseLrc, parseLrcA2, parseTTML,} from '@applemusic-like-lyrics/lyric'

/**
 * Music tags carry lyrics in whatever shape the tagging tool wrote: a plain
 * block of text, LyRiC with `[mm:ss.xx]` line stamps, enhanced LyRiC with
 * `<mm:ss.xx>` word stamps, TTML, or one of the karaoke formats. AMLL's own
 * parsers read all of them, so this file only decides which one to hand the
 * text to — a home-grown parser would disagree with the renderer about the
 * very same file.
 */

export interface ParsedLyrics {
    /** Lines the lyric player can follow, sorted and de-duplicated. */
    lines: LyricLine[]
    /** True when the tag carried timing, so the player can follow along. */
    synced: boolean
    /** Untimed lyrics, shown as-is. Null when there is nothing to show. */
    plain: string | null
}

const NO_LYRICS: ParsedLyrics = {lines: [], synced: false, plain: null}

// AMLL's parsers accept `h*:m(.s.s)?` stamps — hour prefixes and unpadded
// digits included — so detection has to recognize exactly those shapes.
// Anything narrower falls through to `parseLrc`, which keeps whatever stamps
// it does not strip as part of the words and prints them on screen.
const TIME = '(?:\\d+:)*\\d+(?:\\.\\d+)?'
// A whole TTML document, rather than a fragment that happens to start with "<".
const TTML_DOCUMENT = /^\s*(?:<\?xml|<tt[\s>])/i
const WORD_STAMP = new RegExp(`<${TIME}>`)
// Lyric ID tags (`[ar:…]`, `[ti:…]`) and the same stamps again, this time for
// stripping notation out of a tag that could not be turned into timing.
const ID_TAG_LINE = /^\[[a-z]+:.*]$/i
const LINE_STAMP_ALL = new RegExp(`\\[${TIME}\\]`, 'g')
const WORD_STAMP_ALL = new RegExp(`<${TIME}>`, 'g')

export function parseLyrics(
    raw: string | null | undefined,
    durationSeconds = 0,
): ParsedLyrics {
    const text = raw?.trim()
    if (!text) return NO_LYRICS

    let lines: LyricLine[]
    try {
        lines = normalizeLines(readTimedLines(text), durationSeconds)
    } catch {
        // A tag that looks like a format but does not parse is still readable
        // text, so it falls through to the plain view below.
        return {lines: [], synced: false, plain: plainFromText(text)}
    }

    // Every line stamped 00:00 means the file has stamps but no timing of its
    // own; following it would leave the first line highlighted for the whole
    // track, so it reads as untimed text instead.
    const timed = lines.length > 1 || (lines.length === 1 && lines[0].startTime > 0)
    if (!timed) return {lines: [], synced: false, plain: plainFromText(text)}

    return {lines, synced: true, plain: null}
}

/**
 * The text to show when nothing could be followed. Stamps and ID tags are
 * notation rather than words, so they are stripped: `[00:00.00]One` reads as
 * "One", and a tag holding nothing but `[ar:…]`/`[ti:…]` reads as no lyrics at
 * all instead of as a wall of brackets.
 */
function plainFromText(text: string): string | null {
    const cleaned = text
        .split(/\r?\n/)
        .filter(line => !ID_TAG_LINE.test(line.trim()))
        .map(line => line.replace(LINE_STAMP_ALL, '').replace(WORD_STAMP_ALL, '').trimEnd())
        .join('\n')
        .trim()
    return cleaned.length > 0 ? cleaned : null
}

function readTimedLines(text: string): ParsedLyricLine[] {
    if (TTML_DOCUMENT.test(text)) return parseTTML(text).lines

    // The multiline anchor reads any line, not just the head — karaoke exports
    // usually open with `[ti:…]`-style ID tags the parsers skip on their own.

    if (WORD_STAMP.test(text)) return parseLrcA2(expandLineStamps(text))
    return parseLrc(text)
}

/**
 * `[t1][t2]text` repeats one line's words under several stamps (shared
 * choruses, bilingual tools). `parseLrcA2` reads only the first stamp and
 * would print the second as part of the words, so every stamp gets its own
 * copy of the text — the same thing `parseLrc` does with this input. ID tags
 * are not stamp shapes and stay where they are.
 */
function expandLineStamps(text: string): string {
    const STAMP_PREFIX = /^\s*\[((?:\d+:)*\d+(?:\.\d+)?)]/
    return text
        .split(/\r?\n/)
        .map(line => {
            const stamps: string[] = []
            let rest = line
            for (; ;) {
                const match = rest.match(STAMP_PREFIX)
                if (!match) break
                stamps.push(match[1])
                rest = rest.slice(match[0].length)
            }
            return stamps.length > 1
                ? stamps.map(stamp => `[${stamp}]${rest}`).join('\n')
                : line
        })
        .join('\n')
}

/**
 * Put parsed lines in the shape the player expects: listening order, no empty
 * rows, no line that outlives the track, and translations folded into the line
 * they belong to (bilingual tags stamp both languages identically, which is
 * exactly what `translatedLyric` renders under the main line).
 */
function normalizeLines(lines: ParsedLyricLine[], durationSeconds: number): LyricLine[] {
    const withText = lines
        .map(line => ({...line, text: lineText(line)}))
        .filter(line => line.text.length > 0 && line.words.length > 0)
        .sort((a, b) => a.startTime - b.startTime)

    const merged: LyricLine[] = []
    for (const line of withText) {
        const previous = merged[merged.length - 1]
        if (previous && previous.startTime === line.startTime) {
            // Same stamp: the second language (or a duplicate) rides along with
            // the first instead of becoming a line of its own.
            if (!sameText(previous.translatedLyric, line.text)) {
                previous.translatedLyric = previous.translatedLyric
                    ? `${previous.translatedLyric} ${line.text}`
                    : line.text
            }
            previous.endTime = Math.max(previous.endTime, line.endTime)
            continue
        }
        merged.push({...line})
    }

    const durationMs = durationSeconds > 0 ? Math.round(durationSeconds * 1000) : 0
    merged.forEach((line, index) => {
        const next = merged[index + 1]
        // An untimed tail (parseLrc parks the last line far in the future) would
        // keep that line highlighted for hours; the track's own length ends it.
        const ceiling = next ? next.startTime : durationMs
        if (ceiling > line.startTime && line.endTime > ceiling) line.endTime = ceiling
        if (line.endTime < line.startTime) line.endTime = line.startTime
    })

    return merged
}

function lineText(line: ParsedLyricLine): string {
    return line.words.map(word => word.word).join('').trim()
}

function sameText(a: string, b: string): boolean {
    return a.trim().toLowerCase() === b.trim().toLowerCase()
}
