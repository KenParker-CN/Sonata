import type {KeyboardEvent, RefObject} from 'react'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {ChevronDown, MicVocal} from 'lucide-react'
import type {Track} from '@/types/music'
import {activeLyricIndex, activeWordIndex, parseLyrics} from '@/utils/lyrics'
import type {ParsedLyrics, LyricLine} from '@/utils/lyrics'
import {cn} from '@/lib/utils'

interface LyricsPanelProps {
    track: Track | null
    audioElementRef: RefObject<HTMLAudioElement | null>
    onSeek: (time: number) => void
}

export default function LyricsPanel({track, audioElementRef, onSeek}: LyricsPanelProps) {
    return <LyricsPanelBody key={track?.id ?? 'none'} track={track} audioElementRef={audioElementRef} onSeek={onSeek}/>
}

/**
 * Highlight timing is driven by the same requestAnimationFrame loop as the
 * player. The active line changes React state only at line boundaries, while
 * the current word fill is written directly to the DOM for smooth karaoke fill.
 */
function LyricsPanelBody({track, audioElementRef, onSeek}: LyricsPanelProps) {
    const parsed: ParsedLyrics = useMemo(
        () => parseLyrics(track?.lyrics, track?.duration ?? 0),
        [track?.lyrics, track?.duration],
    )

    const [activeLine, setActiveLine] = useState(-1)
    const [activeWord, setActiveWord] = useState(-1)
    const [isFollowing, setIsFollowing] = useState(true)
    const activeLineRef = useRef(-1)
    const activeWordRef = useRef(-1)
    const wordFillRef = useRef<HTMLSpanElement | null>(null)
    const activeLineElRef = useRef<HTMLDivElement | null>(null)
    const lyricsScrollerRef = useRef<HTMLDivElement | null>(null)
    const suppressScrollRef = useRef(false)
    const suppressScrollTimerRef = useRef<number | null>(null)

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

    const scrollToActiveLine = useCallback((behavior: ScrollBehavior = 'smooth') => {
        const container = lyricsScrollerRef.current
        const line = activeLineElRef.current
        if (!container || !line) return
        suppressScrollRef.current = true
        if (suppressScrollTimerRef.current !== null) window.clearTimeout(suppressScrollTimerRef.current)
        const target = line.offsetTop - (container.clientHeight - line.offsetHeight) / 2
        container.scrollTo({top: Math.max(0, target), behavior})
        suppressScrollTimerRef.current = window.setTimeout(() => {
            suppressScrollRef.current = false
        }, behavior === 'smooth' ? 500 : 50)
    }, [])

    useEffect(() => {
        if (isFollowing && activeLine >= 0) scrollToActiveLine()
    }, [activeLine, isFollowing, scrollToActiveLine])

    useEffect(() => () => {
        if (suppressScrollTimerRef.current !== null) window.clearTimeout(suppressScrollTimerRef.current)
    }, [])

    const handleLyricsScroll = () => {
        if (!suppressScrollRef.current) setIsFollowing(false)
    }

    const resumeFollowing = () => {
        setIsFollowing(true)
        window.requestAnimationFrame(() => scrollToActiveLine())
    }

    const seekToLine = (time: number) => {
        onSeek(time)
        setIsFollowing(true)
        window.requestAnimationFrame(() => scrollToActiveLine())
    }

    return (
        <section
            className="mt-4 flex h-80 flex-col rounded-2xl bg-player-border/30 p-5 text-left lg:h-auto lg:min-h-0 lg:flex-1"
            aria-label="Lyrics"
        >
            <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
                <p className="section-kicker text-player-accent">Lyrics</p>
                <div className="flex items-center gap-2">
                    {!isFollowing && parsed.synced && (
                        <button
                            type="button"
                            onClick={resumeFollowing}
                            className="inline-flex items-center gap-1 rounded-full border border-player-border px-2 py-1 text-[11px] text-player-foreground transition-colors hover:border-player-accent hover:text-player-accent"
                        >
                            <ChevronDown size={13} aria-hidden="true" />
                            Current line
                        </button>
                    )}
                    <span className="text-xs text-player-muted">{statusLabel(parsed.synced, parsed.plain)}</span>
                </div>
            </div>

            {parsed.synced ? (
                <div
                    ref={lyricsScrollerRef}
                    onScroll={handleLyricsScroll}
                    className="min-h-0 flex-1 overflow-y-auto pr-2 [mask-image:linear-gradient(to_bottom,transparent,black_8%,black_92%,transparent)]"
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
                                onSeek={seekToLine}
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

function LyricLineRow({line, isActive, isPast, activeWord, wordFillRef, elRef, onSeek}: {
    line: LyricLine
    isActive: boolean
    isPast: boolean
    activeWord: number
    wordFillRef?: RefObject<HTMLSpanElement | null>
    elRef?: RefObject<HTMLDivElement | null>
    onSeek: (time: number) => void
}) {
    const isKaraoke = line.words.length > 1

    const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault()
            onSeek(line.start)
        }
    }

    return (
        <div
            ref={elRef}
            role="button"
            tabIndex={0}
            onClick={() => onSeek(line.start)}
            onKeyDown={handleKeyDown}
            className={cn(
                'cursor-pointer rounded-lg text-lg font-semibold leading-8 outline-none transition-[color,opacity,transform,background-color] duration-300 hover:bg-player-border/30 focus-visible:ring-2 focus-visible:ring-player-accent',
                isActive
                    ? 'scale-[1.04] text-player-foreground'
                    : isPast
                        ? 'text-player-muted/45'
                        : 'text-player-muted/75',
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
                <p className={cn('mt-1 text-sm font-normal transition-colors duration-300', isActive ? 'text-player-muted' : 'text-player-muted/55')}>
                    {line.translation}
                </p>
            )}
        </div>
    )
}
