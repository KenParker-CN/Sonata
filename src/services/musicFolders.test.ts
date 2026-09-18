import { describe, expect, it } from 'vitest'
import { lyricsSidecarKey, matchLyricsPath } from '@/services/musicFolders'

describe('LRC sidecar matching', () => {
  it('matches a case-insensitive same-basename file in the same directory', () => {
    expect(matchLyricsPath('Album/Society.flac', ['Album/SOCIETY.lrc'])).toBe('Album/SOCIETY.lrc')
  })

  it('does not match a lyric file from another directory', () => {
    expect(matchLyricsPath('Album/Society.flac', ['Other/Society.lrc'])).toBeNull()
  })

  it('ignores non-LRC files and keeps the directory in the key', () => {
    expect(lyricsSidecarKey('Disc 1/Society.flac')).toBe('disc 1/society')
    expect(matchLyricsPath('Society.flac', ['Society.txt', 'Society.lrc'])).toBe('Society.lrc')
  })
})
