import type {RefObject} from 'react'
import {lazy, Suspense, useMemo} from 'react'
import {MicVocal} from 'lucide-react'
import type {Track} from '@/types/music'
import {parseLyrics} from '@/utils/lyrics'

// AMLL plus its Pixi peer dependencies are a few hundred kilobytes and the
// panel is only reachable from Now Playing, so the parser and the renderer load
// on first need instead of with the app shell — the same bargain the M4A
// decoder package makes in the audio hook.
const TimedLyrics = lazy(() => import('@/components/layout/TimedLyrics'))

interface LyricsPanelProps {
    track: Track | null
    isPlaying: boolean
    audioElementRef: RefObject<HTMLAudioElement | null>
}

/**
 * The lyrics column of Now Playing. A track's tag can hold plainly written
 * lyrics, a stamp per line, a stamp per word, or nothing at all, and the three
 * cases need three different things on screen: a scrolling block of text for
 * the untimed case (following it would be guesswork), AMLL for anything with
 * timing, and a quiet note when the file simply has no lyrics.
 */
export default function LyricsPanel({track, isPlaying, audioElementRef}: LyricsPanelProps) {
    const parsed = useMemo(
        () => parseLyrics(track?.lyrics, track?.duration ?? 0),
        [track?.lyrics, track?.duration],
    )

    return (
        <section
            className="mt-4 flex h-80 flex-col rounded-2xl bg-player-border/30 p-5 text-left lg:h-auto lg:min-h-0 lg:flex-1"
            aria-label="Lyrics"
        >
            <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                <p className="section-kicker text-player-accent">Lyrics</p>
                <span className="text-xs text-player-muted">{statusLabel(parsed.synced, parsed.plain)}</span>
            </div>

            {parsed.synced ? (
                <div className="relative min-h-0 flex-1">
                    <Suspense fallback={<LyricsSkeleton/>}>
                        <TimedLyrics
                            lines={parsed.lines}
                            playing={isPlaying}
                            audioElementRef={audioElementRef}
                        />
                    </Suspense>
                </div>
            ) : parsed.plain ? (
                <div
                    className="min-h-0 flex-1 overflow-y-auto pr-2 text-sm leading-7 whitespace-pre-line text-player-muted">
                    {parsed.plain}
                </div>
            ) : (
                <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2 text-center">
                    <MicVocal size={24} className="text-player-muted/40" aria-hidden="true"/>
                    <p className="text-xs text-player-muted">This file carries no lyrics in its tags.</p>
                </div>
            )}
        </section>
    )
}

function statusLabel(synced: boolean, plain: string | null): string {
    if (synced) return 'Synced to playback'
    return plain ? 'Not synced to playback' : 'No lyrics in this file'
}

/** Holds the column while the lyric player's chunk is on its way. */
function LyricsSkeleton() {
    return (
        <div className="flex h-full flex-col justify-center gap-4" aria-hidden="true">
            <div className="h-4 w-2/3 animate-pulse rounded bg-player-border/60"/>
            <div className="h-4 w-4/5 animate-pulse rounded bg-player-border/60"/>
            <div className="h-4 w-1/2 animate-pulse rounded bg-player-border/60"/>
        </div>
    )
}