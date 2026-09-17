import {useEffect, useRef, useState} from 'react'
import type {Track} from '@/types/music'
import {motion} from 'motion/react'
import {Link} from 'react-router-dom'
import {Info} from 'lucide-react'
import {cn} from '@/lib/utils'
import {parseArtists} from '@/utils/parseArtists'
import {artistPath, trackPath} from '@/utils/routes'
import {activeWordIndex, parseLyrics} from '@/utils/lyrics'

interface NowPlayingViewProps {
    track: Track | null
    currentTime: number
    isPlaying: boolean
    onClose: () => void
}


function TrackInfo({track, onNavigate}: { track: Track | null; onNavigate: () => void }) {
    const artists = track?.artist ? parseArtists(track.artist) : []

    return (
        <div className="min-w-0">
            <h2 className="font-semibold tracking-[-0.035em] text-left">
                {track ? (
                    <Link
                        to={trackPath(track.id)}
                        onClick={onNavigate}
                        className="hover:underline"
                    >
                        {track.title}
                    </Link>
                ) : 'No track selected'}
            </h2>
            <div
                className="mt-1 flex flex-wrap items-left text-player-muted">
                {artists.length > 0 ? artists.map((artist, index) => (
                    <span key={artist}>
            <Link
                to={artistPath(artist)}
                onClick={onNavigate}
                className="text-left hover:text-player-foreground hover:underline"
            >
              {artist}
            </Link>
                        {index < artists.length - 1 && '/'}
          </span>
                )) : <span>Add music to start listening</span>}
            </div>
        </div>
    )
}

function MetadataPanel({track}: { track: Track | null }) {
    const fields = track ? [
        ['Composer', track.composer],
        ['Release', track.releaseDate],
        ['Bit depth', track.bitDepth != null ? `${track.bitDepth}-bit` : undefined],
        ['Sample rate', track.sampleRate ? `${track.sampleRate} Hz` : undefined],

    ].filter(([, value]) => value) : []

    if (fields.length === 0) {
        return (
            <p className="mt-4 rounded-xl border border-dashed border-player-border px-3 py-4 text-xs leading-6 text-player-muted">
                Rich recording details will appear here when they are available in your local tags.
            </p>
        )
    }

    return (
        <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-4 text-left">
            {fields.map(([label, value]) => (
                <div key={label} className="min-w-0">
                    <dt className="text-[11px] uppercase tracking-wider text-player-muted">{label}</dt>
                    <dd className="mt-1 truncate text-sm text-player-foreground">{value}</dd>
                </div>
            ))}
        </dl>
    )
}

function LyricsPanel({track, currentTime}: { track: Track | null; currentTime: number }) {
    const parsedLines = parseLyrics(track?.lyrics)
    // If the metadata contained synced lyrics (timestamps), use the parsed result.
    // Otherwise, fall back to the raw text stored in the track — it may be plain,
    // unsynced lyrics that the parser would otherwise discard.
    const lines = parsedLines.length > 0
        ? parsedLines
        : track?.lyrics
            ? [{ start: 0, end: null, text: track.lyrics, words: [{ text: track.lyrics, start: 0, end: null }] }]
            : []
    // Find the last line whose start time is <= currentTime; that is the
    // line currently being sung. Unsynced lines (end === null) count as
    // active once currentTime has reached or passed their start.
    let activeLine = -1
    for (let i = 0; i < lines.length; i += 1) {
      if (lines[i].start <= currentTime) activeLine = i
      else break
    }
    const activeStart = activeLine >= 0 ? lines[activeLine].start : null
    const scrollContainerRef = useRef<HTMLDivElement>(null)

    // When the active line changes, scroll it into view. Delaying the scroll
    // by one frame lets the DOM settle so the element's offset is accurate.
    useEffect(() => {
      if (activeLine < 0) return
      const container = scrollContainerRef.current
      if (!container) return
      const activeEl = container.querySelectorAll<HTMLElement>('[data-active-line]')
      if (activeEl.length === 0) return
      // Scroll to show the whole active group (e.g. bilingual original +
      // translation sharing one timestamp) rather than just the last line.
      const first = activeEl[0].getBoundingClientRect()
      const last = activeEl[activeEl.length - 1].getBoundingClientRect()
      const containerRect = container.getBoundingClientRect()
      const groupHeight = last.bottom - first.top
      const targetTop = first.top - containerRect.top
      const offset = targetTop - container.clientHeight / 2 + groupHeight / 2
      container.scrollBy({ top: offset, behavior: 'smooth' })
    }, [activeLine])

    return (
        <section className="relative flex min-h-0 flex-1 flex-col rounded-2xl bg-player-border/30 p-5 text-left h-full"
                 aria-label="Lyrics">
            <div ref={scrollContainerRef} className="min-h-0 flex-1 space-y-8 overflow-y-auto pr-10">
                {lines.map((line, index) => {
                    const active = activeStart !== null && line.start === activeStart
                    const wordIndex = active ? activeWordIndex(line.words, currentTime) : -1
                    return (
                        <div
                            key={`${line.start}-${index}`}
                            data-active-line={active ? '' : undefined}
                            className={cn('text-6xl leading-12 transition-all duration-300', active ? 'text-player-foreground' : 'text-player-muted/60')}
                        >
                            {line.words.map((word, wordPosition) => (
                                <span key={`${word.start}-${wordPosition}`}
                                      className={cn(wordPosition <= wordIndex && 'text-player-accent')}>
                  {word.text}
                </span>
                            ))}
                        </div>
                    )
                })}
            </div>
        </section>
    )
}

export default function NowPlayingView({track, currentTime, isPlaying, onClose}: NowPlayingViewProps) {
    const [pinnedTrackId, setPinnedTrackId] = useState<string | null>(null)
    const infoRef = useRef<HTMLDivElement>(null)
    // Deriving the open state from the pinned track id means a newly playing
    // track can never inherit a popover that was left pinned open.
    const infoOpen = pinnedTrackId !== null && pinnedTrackId === track?.id

    const toggleInfo = () => {
        setPinnedTrackId(current => (current === track?.id ? null : (track?.id ?? null)))
    }

    // Clicking outside the popover, or pressing Escape, dismisses a pinned one.
    useEffect(() => {
        if (!infoOpen) return
        const handlePointerDown = (event: PointerEvent) => {
            if (!infoRef.current?.contains(event.target as Node)) setPinnedTrackId(null)
        }
        const handleKeyDown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') setPinnedTrackId(null)
        }
        document.addEventListener('pointerdown', handlePointerDown)
        document.addEventListener('keydown', handleKeyDown)
        return () => {
            document.removeEventListener('pointerdown', handlePointerDown)
            document.removeEventListener('keydown', handleKeyDown)
        }
    }, [infoOpen])

    return (
        <motion.section
            initial={{opacity: 0, y: 24}}
            animate={{opacity: 1, y: 0}}
            exit={{
                opacity: 0,
                y: 24,
                transition: {duration: 0.2, ease: [0.22, 1, 0.36, 1]},
            }}
            transition={{
                duration: 0.32,
                delay: 0.24,
                ease: [0.22, 1, 0.36, 1],
            }}
            className="absolute inset-x-0 bottom-(--player-height) top-0 z-30 flex min-h-0 flex-col overflow-y-auto bg-player text-player-foreground"
            aria-label="Now Playing"
        >
            <div className={cn('now-playing-fluid pointer-events-none absolute inset-0', isPlaying && 'is-playing')} aria-hidden="true">
                <span className="now-playing-fluid-orb now-playing-fluid-orb-one" />
                <span className="now-playing-fluid-orb now-playing-fluid-orb-two" />
                <span className="now-playing-fluid-orb now-playing-fluid-orb-three" />
            </div>
            <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-1 flex-col px-5 pb-8 pt-5">
                {/* Lyrics fill the panel; track info and metadata sit behind the info icon. */}
                <LyricsPanel track={track} currentTime={currentTime}/>

                {track && (
                    <div ref={infoRef} className="group absolute right-5 top-5 z-20">
                        <button
                            type="button"
                            onClick={toggleInfo}
                            aria-label="Track information"
                            aria-expanded={infoOpen}
                            aria-controls="now-playing-track-info"
                            className="rounded-full p-1.5 text-player-muted transition-colors hover:text-player-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                        >
                            <Info size={18}/>
                        </button>
                        {/* Hover (or keyboard focus) reveals the details; clicking the icon pins them open. */}
                        <div
                            id="now-playing-track-info"
                            className={cn(
                                'absolute right-0 top-11 w-80 rounded-2xl border border-player-border/60 bg-player/95 p-5 text-left shadow-2xl backdrop-blur-md',
                                'pointer-events-none opacity-0 transition-opacity duration-200',
                                'group-hover:pointer-events-auto group-hover:opacity-100 group-focus-within:pointer-events-auto group-focus-within:opacity-100',
                                infoOpen && 'pointer-events-auto opacity-100',
                            )}
                        >
                            <TrackInfo track={track} onNavigate={onClose}/>
                            <MetadataPanel track={track}/>
                        </div>
                    </div>
                )}
            </div>
        </motion.section>
    )
}
