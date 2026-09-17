import type {CSSProperties, RefObject} from 'react'
import {useEffect, useRef, useState} from 'react'
import type {Track} from '@/types/music'
import {motion} from 'motion/react'
import {Link} from 'react-router-dom'
import {cn} from '@/lib/utils'
import {parseArtists} from '@/utils/parseArtists'
import {artistPath, trackPath} from '@/utils/routes'
import GeneratedArt from '@/components/media/GeneratedArt'
import {activeWordIndex, parseLyrics} from '@/utils/lyrics'

function activeLyricIndex(lines: ReturnType<typeof parseLyrics>, currentTime: number): number {
    let active = -1
    lines.forEach((line, index) => {
        if (line.start <= currentTime) active = index
    })
    return active
}

function plainLyrics(raw: string | null | undefined): string | null {
    return raw?.trim() ? raw.trim() : null
}

interface NowPlayingViewProps {
    track: Track | null
    currentTime: number
    isPlaying: boolean
    audioElementRef: RefObject<HTMLAudioElement | null>
    onClose: () => void
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

function TrackInfo({track, onNavigate}: { track: Track | null; onNavigate: () => void }) {
    const artists = track?.artist ? parseArtists(track.artist) : []

    return (
        <div className="mt-6">
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

type AudioGraph = { context: AudioContext; analyser: AnalyserNode }
const audioGraphs = new WeakMap<HTMLAudioElement, AudioGraph>()

function getAudioGraph(audioElement: HTMLAudioElement): AudioGraph | null {
    const existing = audioGraphs.get(audioElement)
    if (existing) return existing
    try {
        const context = new AudioContext()
        const analyser = context.createAnalyser()
        const source = context.createMediaElementSource(audioElement)
        analyser.fftSize = 128
        analyser.smoothingTimeConstant = 0.82
        source.connect(analyser)
        analyser.connect(context.destination)
        const graph = {context, analyser}
        audioGraphs.set(audioElement, graph)
        return graph
    } catch {
        return null
    }
}

type FrequencyBand = 'Bass' | 'Mid' | 'High'

function BandVisualizer({band, startRatio, endRatio, color, analyser, isPlayingRef}: {
    band: FrequencyBand
    startRatio: number
    endRatio: number
    color: string
    analyser: AnalyserNode
    isPlayingRef: RefObject<boolean>
}) {
    const canvasRef = useRef<HTMLCanvasElement>(null)

    useEffect(() => {
        const canvas = canvasRef.current
        const canvasContext = canvas?.getContext('2d')
        if (!canvas || !canvasContext) return
        const values = new Uint8Array(analyser.frequencyBinCount)
        let frame = 0

        const render = () => {
            const width = canvas.clientWidth
            const height = canvas.clientHeight
            const ratio = window.devicePixelRatio || 1
            if (canvas.width !== width * ratio || canvas.height !== height * ratio) {
                canvas.width = width * ratio
                canvas.height = height * ratio
                canvasContext.setTransform(ratio, 0, 0, ratio, 0, 0)
            }
            analyser.getByteFrequencyData(values)
            canvasContext.clearRect(0, 0, width, height)
            const start = Math.floor(values.length * startRatio)
            const end = Math.max(start + 1, Math.floor(values.length * endRatio))
            const bandValues = values.slice(start, end)
            const barWidth = width / bandValues.length
            canvasContext.fillStyle = color
            bandValues.forEach((value, index) => {
                const level = isPlayingRef.current ? value / 255 : 0.035
                const barHeight = Math.max(3, level * height * 0.82)
                canvasContext.beginPath()
                canvasContext.roundRect(index * barWidth + 1, height - barHeight, Math.max(1, barWidth - 2), barHeight, 3)
                canvasContext.fill()
            })
            frame = requestAnimationFrame(render)
        }

        render()
        return () => cancelAnimationFrame(frame)
    }, [analyser, startRatio, endRatio, color, isPlayingRef])

    return (
        <div className="frequency-band rounded-xl border border-player-border/50 bg-player/20 p-3">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-player-foreground">{band}</span>
                <span className="text-[10px] text-player-muted">FFT</span>
            </div>
            <canvas ref={canvasRef} className="h-24 w-full" aria-label={`${band} frequency visualizer`} />
        </div>
    )
}

function VisualizerPanel({track, isPlaying, audioElementRef}: { track: Track | null; isPlaying: boolean; audioElementRef: RefObject<HTMLAudioElement | null> }) {
    const isPlayingRef = useRef(isPlaying)
    const [graph, setGraph] = useState<AudioGraph | null>(null)
    const artworkStyle = track?.cover ? ({'--visualizer-image': `url(${track.cover})`} as CSSProperties) : undefined

    useEffect(() => {
        isPlayingRef.current = isPlaying
    }, [isPlaying])

    useEffect(() => {
        const audioElement = audioElementRef.current
        if (!audioElement) return
        const nextGraph = getAudioGraph(audioElement)
        setGraph(nextGraph)
        if (nextGraph && isPlayingRef.current && nextGraph.context.state === 'suspended') {
            void nextGraph.context.resume()
        }
    }, [audioElementRef])

    return (
        <section className={cn('ambient-visualizer relative flex min-h-70 flex-1 flex-col justify-end overflow-hidden rounded-2xl border border-player-border/60 p-6', isPlaying && 'is-playing')} style={artworkStyle} aria-label="Music visualizer">
            <div className="ambient-visualizer-wash" aria-hidden="true" />
            <div className="ambient-visualizer-blob ambient-visualizer-blob-one" aria-hidden="true" />
            <div className="ambient-visualizer-blob ambient-visualizer-blob-two" aria-hidden="true" />
            <div className="ambient-visualizer-blob ambient-visualizer-blob-three" aria-hidden="true" />
            <div className="relative z-10 grid grid-cols-1 gap-3 sm:grid-cols-3">
                {graph && (
                    <>
                        <BandVisualizer band="Bass" startRatio={0} endRatio={0.25} color="rgba(249, 115, 178, 0.9)" analyser={graph.analyser} isPlayingRef={isPlayingRef} />
                        <BandVisualizer band="Mid" startRatio={0.25} endRatio={0.6} color="rgba(167, 139, 250, 0.9)" analyser={graph.analyser} isPlayingRef={isPlayingRef} />
                        <BandVisualizer band="High" startRatio={0.6} endRatio={1} color="rgba(103, 232, 249, 0.9)" analyser={graph.analyser} isPlayingRef={isPlayingRef} />
                    </>
                )}
            </div>
            <div className="relative z-10 mt-4">
                <p className="section-kicker text-player-accent">Visualizer</p>
                <p className="mt-2 text-sm text-player-muted">Bass · Mid · High frequency response</p>
            </div>
        </section>
    )
}

function LyricsPanel({track, currentTime, isPlaying, audioElementRef}: { track: Track | null; currentTime: number; isPlaying: boolean; audioElementRef: RefObject<HTMLAudioElement | null> }) {
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
            return <VisualizerPanel track={track} isPlaying={isPlaying} audioElementRef={audioElementRef} />
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

export default function NowPlayingView({track, currentTime, isPlaying, audioElementRef, onClose}: NowPlayingViewProps) {
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
                <div className="flex min-h-0 flex-1 gap-10">
                    {/* Left column: cover on top, info anchored to the bottom zone */}
                    <div className="flex flex-col min-w-0 flex-1 max-w-2xl">
                        <ArtworkDisplay track={track} className="w-[min(72vw,380px)] mx-auto"/>
                        <div className="mt-auto flex w-full flex-col">
                            <TrackInfo track={track} onNavigate={onClose}/>
                            <MetadataPanel track={track}/>
                        </div>
                    </div>

                    {/* Right column: Lyrics - full height */}
                    <aside className="flex min-w-0 shrink-0 flex-col w-140 h-full">
                        <LyricsPanel track={track} currentTime={currentTime} isPlaying={isPlaying} audioElementRef={audioElementRef}/>
                    </aside>
                </div>
            </div>
        </motion.section>
    )
}
