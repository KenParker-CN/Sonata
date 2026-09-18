import { describe, expect, it } from 'vitest'
import { activeLyricIndex, activeWordIndex, parseLyrics } from '@/utils/lyrics'

describe('parseLyrics', () => {
  it('returns nothing for empty/whitespace-only input', () => {
    expect(parseLyrics(null)).toEqual({ lines: [], synced: false, plain: null })
    expect(parseLyrics(undefined)).toEqual({ lines: [], synced: false, plain: null })
    expect(parseLyrics('   \n  ')).toEqual({ lines: [], synced: false, plain: null })
  })

  it('parses standard line-synced LRC with correct SECOND-based timestamps', () => {
    const lrc = [
      '[00:00.00]Intro',
      '[00:12.50]First line',
      '[00:34.75]Second line',
    ].join('\n')

    const result = parseLyrics(lrc, 60)
    expect(result.synced).toBe(true)
    expect(result.lines).toHaveLength(3)
    // Regression check: 00:12.50 must be 12.5 SECONDS, not 12500 (a
    // milliseconds/seconds mix-up is exactly the historical bug this parser
    // is designed to avoid — see file-level doc comment in lyrics.ts).
    expect(result.lines[1].start).toBeCloseTo(12.5, 5)
    expect(result.lines[2].start).toBeCloseTo(34.75, 5)
    expect(result.lines[1].text).toBe('First line')
  })

  it('resolves each line end to the next line start, and the last line to track duration', () => {
    const lrc = ['[00:00.00]One', '[00:10.00]Two'].join('\n')
    const result = parseLyrics(lrc, 30)
    expect(result.lines[0].end).toBeCloseTo(10, 5)
    expect(result.lines[1].end).toBeCloseTo(30, 5)
  })

  it('parses angle-bracket word-level (karaoke) timing without losing inter-word spacing', () => {
    const line = '[00:10.00]<00:10.00>Hello <00:10.50>world<00:11.00>'
    const result = parseLyrics(line, 20)
    expect(result.synced).toBe(true)
    expect(result.lines).toHaveLength(1)
    const words = result.lines[0].words
    expect(words.map(w => w.text)).toEqual(['Hello ', 'world'])
    expect(words[0].start).toBeCloseTo(10, 5)
    expect(words[1].start).toBeCloseTo(10.5, 5)
    expect(words[1].end).toBeCloseTo(11, 5)
    // The joined line text must not have swallowed the space between words.
    expect(result.lines[0].text).toBe('Hello world')
  })

  it('parses bracket-style word-level timing (each word gets its own [mm:ss] stamp)', () => {
    const line = '[00:05.00]word1[00:05.50]word2[00:06.00]word3'
    const result = parseLyrics(line, 20)
    const words = result.lines[0].words
    expect(words.map(w => w.text)).toEqual(['word1', 'word2', 'word3'])
    expect(words[0].start).toBeCloseTo(5, 5)
    expect(words[2].start).toBeCloseTo(6, 5)
  })

  it('treats a repeated stamp on one line as a bilingual translation, not a new row', () => {
    const lrc = ['[00:10.00]Hello', '[00:10.00]你好'].join('\n')
    const result = parseLyrics(lrc, 30)
    expect(result.lines).toHaveLength(1)
    expect(result.lines[0].text).toBe('Hello')
    expect(result.lines[0].translation).toBe('你好')
  })

  it('expands a chorus repeated under several timestamps on one raw line into independent lines', () => {
    const lrc = '[00:05.00][00:45.00]Chorus text'
    const result = parseLyrics(lrc, 60)
    expect(result.lines).toHaveLength(2)
    expect(result.lines[0].start).toBeCloseTo(5, 5)
    expect(result.lines[1].start).toBeCloseTo(45, 5)
    expect(result.lines[0].text).toBe('Chorus text')
    expect(result.lines[1].text).toBe('Chorus text')
  })

  it('applies a metadata [offset:ms] tag to every timestamp', () => {
    const lrc = ['[offset:-500]', '[00:10.00]Line'].join('\n')
    const result = parseLyrics(lrc, 30)
    expect(result.lines).toHaveLength(1)
    // -500ms offset means the line is displayed 0.5s earlier.
    expect(result.lines[0].start).toBeCloseTo(9.5, 5)
  })

  it('falls back to unsynced plain text when every stamp is 00:00 (no real timing)', () => {
    const lrc = ['[00:00.00]Line one', '[00:00.00]Line two'].join('\n')
    const result = parseLyrics(lrc, 30)
    // Two lines sharing timestamp 0 are treated as bilingual (see test above),
    // and a single merged line at start 0 with no other timed line is
    // indistinguishable from "no real sync data" — it must not be followed.
    expect(result.synced).toBe(false)
    expect(result.plain).toContain('Line one')
  })

  it('strips ID tags and stamps for plain, fully unsynced lyrics', () => {
    const raw = ['[ar:Some Artist]', '[ti:Some Title]', 'Just plain lyrics', 'no timestamps here'].join('\n')
    const result = parseLyrics(raw, 30)
    expect(result.synced).toBe(false)
    expect(result.plain).toBe('Just plain lyrics\nno timestamps here')
  })

  it('falls back to plain text for a file with no timestamps at all', () => {
    const result = parseLyrics('Verse one\nVerse two', 30)
    expect(result.synced).toBe(false)
    expect(result.plain).toBe('Verse one\nVerse two')
  })
})

describe('activeLyricIndex', () => {
  const lines = [
    { start: 0, end: 10, text: 'a', translation: null, words: [] },
    { start: 10, end: 20, text: 'b', translation: null, words: [] },
    { start: 20, end: 30, text: 'c', translation: null, words: [] },
  ]

  it('returns -1 before the first line starts', () => {
    expect(activeLyricIndex(lines, -1)).toBe(-1)
  })

  it('returns the current line at and after its start, up to (not including) the next start', () => {
    expect(activeLyricIndex(lines, 0)).toBe(0)
    expect(activeLyricIndex(lines, 9.999)).toBe(0)
    expect(activeLyricIndex(lines, 10)).toBe(1)
    expect(activeLyricIndex(lines, 25)).toBe(2)
  })
})

describe('activeWordIndex', () => {
  const words = [
    { text: 'Hello ', start: 10, end: 10.5 },
    { text: 'world', start: 10.5, end: 11 },
  ]

  it('returns -1 before the first word starts', () => {
    expect(activeWordIndex(words, 9)).toBe(-1)
  })

  it('returns the active word by start time', () => {
    expect(activeWordIndex(words, 10.2)).toBe(0)
    expect(activeWordIndex(words, 10.5)).toBe(1)
  })
})
