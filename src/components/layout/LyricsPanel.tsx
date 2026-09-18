import type {RefObject} from 'react'
import {useEffect, useMemo, useRef, useState} from 'react'
import {MicVocal} from 'lucide-react'
import type {Track} from '@/types/music'
import {activeLyricIndex, activeWordIndex, parseLyrics} from '@/utils/lyrics'
import type {ParsedLyrics, LyricLine} from '@/utils/lyrics'
import {cn} from '@/lib/utils'

interface LyricsPanelProps {
    track: Track | null
    audioElementRef: RefObject<HTMLAudioElement | null>
}

/**
 * The lyrics column of Now Playing. Keyed by track id in the default export
 * below so a track change remounts the highlight state from scratch — the
 * clean way to "reset on prop change" without reaching for an effect that
 * calls setState synchronously (React flags that pattern for good reason:
 * it costs an extra render pass every remount).
 */
export default function LyricsPanel({track, audioElementRef}: LyricsPanelProps) {
    return <LyricsPanelBody key={track?.id ?? 'none'} track={track} audioElementRef={audioElementRef}/>
}

/**
 * Highlight timing is driven by the SAME requestAnimationFrame loop the
 * progress bar in useAudioPlayer already runs on (reading `audio.currentTime`
 * every frame), rather than the `timeupdate` event (which fires only a few
 * times a second and would visibly lag or lead the seek bar relative to each
 * other). Per-word "karaoke" fill is applied directly to a DOM node's style
 * on every frame instead of through React state, so a smooth 60fps sweep
 * does not force a React re-render on every frame — only a line or word
 * BOUNDARY change (a handful of times per line) goes through `setState`.
 */
function LyricsPanelBody({track, audioElementRef}: LyricsPanelProps) {
    const parsed: ParsedLyrics = useMemo(
        () => parseLyrics(track?.lyrics, track?.duration ?? 0),
        [track?.lyrics, track?.duration],
    )

    const [activeLine, setActiveLine] = useState(-1)
    const [activeWord, setActiveWord] = useState(-1)
    const activeLineRef = useRef(-1)
    const activeWordRef = useRef(-1)
    const wordFillRef = useRef<HTMLSpanElement | null>(null)
    const activeLineElRef = useRef<HTMLDivElement | null>(null)

    useEffect(() => {
        if (!parsed.synced || parsed.lines.length === 0) return

        let frame = 0
        const tick = () => {
            const audio = audioElementRef.current
            if (audio) {
                const time = audio.currentTime
                const lineIndex = activeLyricIndex(parsed.lines, time)
                if (lineIndex !== activeLineRef.current) {
                    activeLineRef.current = lineIndex
                    setActiveLine(lineIndex)
                }

                const line = lineIndex >= 0 ? parsed.lines[lineIndex] : null
                const wordIndex = line && line.words.length > 1 ? activeWordIndex(line.words, time) : -1
                if (wordIndex !== activeWordRef.current) {
                    activeWordRef.current = wordIndex
                    setActiveWord(wordIndex)
                }

                // Smooth per-word fill: written straight to the DOM, no re-render.
                if (line && wordIndex >= 0 && wordFillRef.current) {
                    const word = line.words[wordIndex]
                    const span = Math.max(0.001, (word.end ?? word.start) - word.start)
                    const progress = Math.min(1, Math.max(0, (time - word.start) / span))
                    wordFillRef.current.style.clipPath = `inset(0 ${(100 - progress * 100).toFixed(2)}% 0 0)`
                }
            }
            frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frame)
    }, [parsed, audioElementRef])

    useEffect(() => {
        activeLineElRef.current?.scrollIntoView({block: 'center', behavior: 'smooth'})
    }, [activeLine])

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
                <div 
                    className="min-h-0 flex-1 overflow-y-auto pr-2" 
                    style={{
                        maskImage: 'linear-gradient(to bottom, transparent, black 8%, black 92%, transparent)',
                        overscrollBehavior: 'contain'
                    }}
                    onWheel={(e) => e.stopPropagation()}
                    onTouchStart={(e) => e.stopPropagation()}
                    onTouchMove={(e) => e.stopPropagation()}
                    onTouchEnd={(e) => e.stopPropagation()}
                >
                    <div className="flex flex-col gap-4 py-10">
                        {parsed.lines.map((line, index) => (
                            <LyricLineRow
                                key={`${line.start}-${index}`}
                                line={line}
                                isActive={index === activeLine}
                                isPast={index < activeLine}
                                activeWord={index === activeLine ? activeWord : -1}
                                wordFillRef={index === activeLine ? wordFillRef : undefined}
                                elRef={index === activeLine ? activeLineElRef : undefined}
                            />
                        ))}
                    </div>
                </div>
            ) : parsed.plain ? (
                <div className="min-h-0 flex-1 overflow-y-auto pr-2 text-sm leading-7 whitespace-pre-line text-player-muted">
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

function LyricLineRow({line, isActive, isPast, activeWord, wordFillRef, elRef}: {
    line: LyricLine
    isActive: boolean
    isPast: boolean
    activeWord: number
    wordFillRef?: RefObject<HTMLSpanElement | null>
    elRef?: RefObject<HTMLDivElement | null>
}) {
    const isKaraoke = line.words.length > 1

    return (
        <div
            ref={elRef}
            className={cn(
                'text-lg font-semibold leading-8 transition-colors duration-300',
                isActive ? 'text-player-foreground' : isPast ? 'text-player-muted/50' : 'text-player-muted',
            )}
        >
            <p>
                {isKaraoke
                    ? line.words.map((word, index) => (
                        <span key={index} className="relative inline whitespace-pre">
                            <span className={isActive && index < activeWord ? 'text-player-foreground' : undefined}>
                                {word.text}
                            </span>
                            {isActive && index === activeWord && (
                                <span
                                    ref={wordFillRef}
                                    aria-hidden="true"
                                    className="absolute inset-0 overflow-hidden text-player-foreground"
                                    style={{clipPath: 'inset(0 100% 0 0)'}}
                                >
                                    {word.text}
                                </span>
                            )}
                        </span>
                    ))
                    : line.text}
            </p>
            {line.translation && (
                <p className={cn('mt-1 text-sm font-normal', isActive ? 'text-player-muted' : 'text-player-muted/60')}>
                    {line.translation}
                </p>
            )}
        </div>
    )
}
