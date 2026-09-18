import { describe, expect, it } from 'vitest'
import type { ILyricsTag } from 'music-metadata'
import { extractLyrics, preferExternalLyrics, serializeLyricsTag } from '@/services/metadata'
import { parseLyrics } from '@/utils/lyrics'

function unsyncedTag(text: string): ILyricsTag {
  return { contentType: 1, timeStampFormat: 0, text, syncText: [] }
}

function syncedTag(syncText: { text: string; timestamp?: number }[]): ILyricsTag {
  return { contentType: 1, timeStampFormat: 2, syncText }
}

describe('serializeLyricsTag', () => {
  it('passes unsynchronized (USLT) text through unchanged', () => {
    expect(serializeLyricsTag(unsyncedTag('Verse one\nVerse two'))).toBe('Verse one\nVerse two')
  })

  it('serializes synchronized (SYLT) millisecond entries into parser-compatible LRC text', () => {
    const tag = syncedTag([
      { text: 'Hel', timestamp: 10_000 },
      { text: 'lo', timestamp: 10_500 },
      { text: '\n' },
      { text: 'World', timestamp: 12_000 },
    ])
    const serialized = serializeLyricsTag(tag)
    expect(serialized).toBe('[00:10.00]<00:10.00>Hel<00:10.50>lo\n[00:12.00]<00:12.00>World')

    // Round-trip through the actual parser: this is what guarantees the
    // metadata layer and the lyrics parser agree on units (seconds), which
    // is exactly where a previous attempt at this feature broke down.
    const parsed = parseLyrics(serialized, 20)
    expect(parsed.synced).toBe(true)
    expect(parsed.lines[0].words.map(w => w.text)).toEqual(['Hel', 'lo'])
    expect(parsed.lines[0].words[0].start).toBeCloseTo(10, 5)
    expect(parsed.lines[0].words[1].start).toBeCloseTo(10.5, 5)
    expect(parsed.lines[1].start).toBeCloseTo(12, 5)
  })
})

describe('extractLyrics', () => {
  it('returns null when there are no lyrics tags', () => {
    expect(extractLyrics(undefined)).toBeNull()
    expect(extractLyrics([])).toBeNull()
  })

  it('joins multiple lyrics entries (e.g. original + translation frames)', () => {
    const tags = [unsyncedTag('Original'), unsyncedTag('Translation')]
    expect(extractLyrics(tags)).toBe('Original\nTranslation')
  })

  it('drops entries that serialize to nothing', () => {
    const tags = [unsyncedTag(''), unsyncedTag('Real lyrics')]
    expect(extractLyrics(tags)).toBe('Real lyrics')
  })
})

describe('preferExternalLyrics', () => {
  it('uses a non-empty external LRC and removes a UTF-8 BOM', () => {
    expect(preferExternalLyrics('embedded', '\uFEFF[00:01.00]external')).toBe('[00:01.00]external')
  })

  it('falls back to embedded lyrics for a missing or empty sidecar', () => {
    expect(preferExternalLyrics('embedded', null)).toBe('embedded')
    expect(preferExternalLyrics('embedded', '  \n')).toBe('embedded')
  })
})
