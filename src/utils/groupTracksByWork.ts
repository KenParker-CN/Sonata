import type {Track} from '@/types/music'
import {parseClassicalTitle} from '@/utils/parseClassicalTitle'

/**
 * One line of an album's track list: either a work spanning several consecutive
 * tracks, or a standalone track shown with its original title.
 *
 * A parsed "Work: Section" title is only a candidate. It becomes a work when at
 * least two consecutive tracks share it; a candidate that occurs once stays a
 * standalone track, because a lone "Bassoon Concerto in C major, RV 478:
 * Diminutions on the Forlana" is far more likely an excerpt or an arrangement
 * than a one-movement work.
 */
export type TrackListItem =
    | {
    type: 'work'
    composer: string
    work: string
    entries: { track: Track; movement: string }[]
}
    | { type: 'track'; track: Track }

export type WorkItem = Extract<TrackListItem, { type: 'work' }>

// Tags disagree about spacing far more often than about casing, so runs of
// whitespace collapse for comparison. Display keeps the first track's own
// spelling. Composer stays part of the identity: adjacent works by different
// composers that share a title ("Concerto in D major") must not merge.
function candidateKey(composer: string, work: string): string {
    return `${composer}::${work.replace(/\s+/g, ' ')}`
}

export function groupTracksByWork(tracks: Track[]): TrackListItem[] {
    const items: TrackListItem[] = []
    let run: (WorkItem & { key: string }) | null = null

    // A run only survives as a work when it holds more than one track. A
    // candidate that never picked up a second consecutive track collapses
    // back into a standalone entry, keeping its original (unsplit) title.
    const flush = () => {
        if (!run) return
        if (run.entries.length > 1) {
            items.push({type: 'work', composer: run.composer, work: run.work, entries: run.entries})
        } else {
            items.push({type: 'track', track: run.entries[0].track})
        }
        run = null
    }

    for (const track of tracks) {
        const parsed = parseClassicalTitle(track.title)
        const composer = track.composer?.trim() || ''

        // No candidate section at all: this track ends any run and stands alone.
        if (parsed.movement === null) {
            flush()
            items.push({type: 'track', track})
            continue
        }

        const key = candidateKey(composer, parsed.work)
        if (run && run.key === key) {
            run.entries.push({track, movement: parsed.movement})
        } else {
            flush()
            run = {
                type: 'work',
                composer,
                work: parsed.work,
                entries: [{track, movement: parsed.movement}],
                key,
            }
        }
    }

    flush()
    return items
}
