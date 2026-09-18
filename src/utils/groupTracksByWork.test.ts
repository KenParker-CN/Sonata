import { describe, expect, it } from 'vitest'
import type { Track } from '@/types/music'
import { groupTracksByWork } from '@/utils/groupTracksByWork'

function makeTrack(overrides: Partial<Track> & { id: string; title: string }): Track {
  return {
    url: '',
    artist: '',
    album: '',
    albumArtist: '',
    composer: null,
    trackNumber: null,
    discNumber: null,
    cover: null,
    duration: 0,
    fileKey: overrides.id,
    filePath: '',
    ...overrides,
  }
}

describe('groupTracksByWork', () => {
  it('keeps a single "Work: Section"-shaped title as a standalone track', () => {
    // Regression test: a lone candidate title (only one track, never joined
    // by a second consecutive movement) must NOT become a collapsible work
    // group with a single row — it is far more likely an excerpt or an
    // arrangement, exactly per this module's own doc comment.
    const tracks: Track[] = [
      makeTrack({
        id: '1',
        title: 'Bassoon Concerto in C major, RV 478: Diminutions on the Forlana',
        composer: 'Vivaldi',
      }),
    ]

    const items = groupTracksByWork(tracks)

    expect(items).toHaveLength(1)
    expect(items[0]).toEqual({ type: 'track', track: tracks[0] })
  })

  it('still merges two or more consecutive tracks that share the same work', () => {
    const tracks: Track[] = [
      makeTrack({ id: '1', title: 'Symphony No. 5 in C minor, Op. 67: I. Allegro con brio', composer: 'Beethoven' }),
      makeTrack({ id: '2', title: 'Symphony No. 5 in C minor, Op. 67: II. Andante con moto', composer: 'Beethoven' }),
    ]

    const items = groupTracksByWork(tracks)

    expect(items).toHaveLength(1)
    expect(items[0]).toMatchObject({
      type: 'work',
      composer: 'Beethoven',
      work: 'Symphony No. 5 in C minor, Op. 67',
      entries: [
        { movement: 'I. Allegro con brio' },
        { movement: 'II. Andante con moto' },
      ],
    })
  })

  it('does not merge two singleton candidates from different, non-adjacent contexts', () => {
    const tracks: Track[] = [
      makeTrack({ id: '1', title: 'Piano Sonata No. 14: Adagio sostenuto', composer: 'Beethoven' }),
      makeTrack({ id: '2', title: 'Interlude', composer: 'Beethoven' }),
      makeTrack({ id: '3', title: 'Cello Suite No. 1: Prelude', composer: 'Bach' }),
    ]

    const items = groupTracksByWork(tracks)

    expect(items).toEqual([
      { type: 'track', track: tracks[0] },
      { type: 'track', track: tracks[1] },
      { type: 'track', track: tracks[2] },
    ])
  })

  it('splits runs across a composer change even when the work title matches', () => {
    const tracks: Track[] = [
      makeTrack({ id: '1', title: 'Concerto in D major: I. Allegro', composer: 'Composer A' }),
      makeTrack({ id: '2', title: 'Concerto in D major: II. Adagio', composer: 'Composer B' }),
    ]

    const items = groupTracksByWork(tracks)

    expect(items).toEqual([
      { type: 'track', track: tracks[0] },
      { type: 'track', track: tracks[1] },
    ])
  })
})
