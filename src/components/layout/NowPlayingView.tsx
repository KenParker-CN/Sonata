import type {CSSProperties} from 'react'
import {useEffect, useRef} from 'react'
import type {Track} from '@/types/music'
import {motion} from 'motion/react'
import {Link} from 'react-router-dom'
import {cn} from '@/lib/utils'
import {parseArtists} from '@/utils/parseArtists'
import {artistPath} from '@/utils/routes'
import GeneratedArt from '@/components/media/GeneratedArt'
import {activeLyricIndex, activeWordIndex, parseLyrics, plainLyrics} from '@/utils/lyrics'

interface NowPlayingViewProps {
    track: Track | null
    currentTime: number
}

function ArtworkDisplay({track, className}: { track: Track | null; className?: string }) {
    return (
        <div
            className={cn('artwork-surface relative aspect-square shrink-0 overflow-hidden bg-player-border shadow-2xl', className)}
        >
            <GeneratedArt
                name={track?.title ?? 'Now Playing'}
                src={track?.cover ?? null}
                className="aspect-square"
            />
        </div>
    )
}

function TrackInfo({track}: { track: Track | null }) {
    const artists = track?.artist ? parseArtists(track.artist) : []

    return (
        <div className="mt-6">
            <h2 className="font-semibold tracking-[-0.035em] text-left">
                {track ? <h4>{track.title}</h4> : 'No track selected'}
            </h2>
            <div
                className="mt-1 flex flex-wrap items-left text-player-muted">
                {artists.length > 0 ? artists.map((artist, index) => (
                    <span key={artist}>
            <Link to={artistPath(artist)} className="text-left hover:text-player-foreground hover:underline">
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

    return (
        <section className="mt-2 rounded-2xl bg-player-border/30 p-5 text-left">
            {fields.length > 0 ? (
                <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
                    {fields.map(([label, value]) => (
                        <div key={label} className="min-w-0">
                            <dt className="text-[11px] uppercase tracking-wider text-player-muted">{label}</dt>
                            <dd className="mt-1 truncate text-sm text-player-foreground">{value}</dd>
                        </div>
                    ))}
                </dl>
            ) : (
                <div
                    className="rounded-xl border border-dashed border-player-border px-4 py-6 text-sm leading-6 text-player-muted">
                    Rich recording details will appear here when they are available in your local tags.
                </div>
            )}
        </section>
    )
}

function LyricsPanel({track, currentTime}: { track: Track | null; currentTime: number }) {
    const lines = parseLyrics(track?.lyrics)
    const activeLine = activeLyricIndex(lines, currentTime)
    // Bilingual lyrics put the original and the translation under one timestamp;
    // the active group is every line sharing that timestamp, not just the last.
    const activeStart = activeLine >= 0 ? lines[activeLine].start : null
    const activeLineRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        activeLineRef.current?.scrollIntoView({behavior: 'smooth', block: 'center'})
    }, [activeStart])

    if (lines.length === 0) {
        const plain = plainLyrics(track?.lyrics)
        if (!plain) {
            return (
                <section
                    className="flex min-h-70 flex-1 flex-col justify-center rounded-2xl border border-dashed border-player-border px-6 py-10 text-center">
                    <p className="text-lg font-medium text-player-foreground">Lyrics and text</p>
                    <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-player-muted">
                        Timestamped lyrics, libretti, and program notes will appear here when available in the recording
                        metadata.
                    </p>
                </section>
            )
        }

        return (
            <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-player-border/30 p-5 text-left h-full"
                     aria-label="Lyrics">
                <div className="mb-4 flex items-center justify-between shrink-0">
                    <p className="section-kicker text-player-accent">Lyrics</p>
                    <span className="text-xs text-player-muted">Not synced to playback</span>
                </div>
                <div className="min-h-0 flex-1 overflow-y-auto whitespace-pre-line pr-2 text-sm leading-7 text-player-muted">
                    {plain}
                </div>
            </section>
        )
    }

    return (
        <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-player-border/30 p-5 text-left h-full"
                 aria-label="Lyrics">
            <div className="mb-4 flex items-center justify-between shrink-0">
                <p className="section-kicker text-player-accent">Lyrics</p>
                <span className="text-xs text-player-muted">Synced to playback</span>
            </div>
            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
                {lines.map((line, index) => {
                    const active = activeStart !== null && line.start === activeStart
                    const wordIndex = active ? activeWordIndex(line.words, currentTime) : -1
                    return (
                        <div
                            key={`${line.start}-${index}`}
                            ref={active && lines[index - 1]?.start !== line.start ? activeLineRef : undefined}
                            className={cn('text-sm leading-7 transition-all duration-300', active ? 'text-player-foreground' : 'text-player-muted/60')}
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

export default function NowPlayingView({track, currentTime}: NowPlayingViewProps) {
    const artworkStyle = track?.cover ? ({backgroundImage: `url(${track.cover})`} as CSSProperties) : undefined

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
            <div className="pointer-events-none absolute inset-0 opacity-30 blur-3xl" style={artworkStyle}
                 aria-hidden="true"/>
            <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-1 flex-col px-5 pb-8 pt-5">
                <div className="flex min-h-0 flex-1 gap-10">
                    {/* Left column: cover on top, info anchored to the bottom zone */}
                    <div className="flex flex-col min-w-0 flex-1 max-w-2xl">
                        <p className="section-kicker mb-6 shrink-0 text-player-accent">Now Playing</p>
                        <ArtworkDisplay track={track} className="w-[min(72vw,380px)] mx-auto"/>
                        <div className="mt-auto flex w-full flex-col">
                            <TrackInfo track={track}/>
                            <MetadataPanel track={track}/>
                        </div>
                    </div>

                    {/* Right column: Lyrics - full height */}
                    <aside className="flex min-w-0 shrink-0 flex-col w-140 h-full">
                        <LyricsPanel track={track} currentTime={currentTime}/>
                    </aside>
                </div>
            </div>
        </motion.section>
    )
}
