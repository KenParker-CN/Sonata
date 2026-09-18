import type {CSSProperties, RefObject} from 'react'
import {lazy, Suspense, useEffect, useRef, useState} from 'react'
import type {Track} from '@/types/music'
import {motion} from 'motion/react'
import {Link} from 'react-router-dom'
import {cn} from '@/lib/utils'
import {parseArtists} from '@/utils/parseArtists'
import {artistPath, trackPath} from '@/utils/routes'
import GeneratedArt from '@/components/media/GeneratedArt'

// Lyrics reach into AMLL for both the format parsers and the renderer — a few
// hundred kilobytes that belong to Now Playing, not to the app shell, so the
// column arrives after the overlay does and shows the same box while it loads.
const LyricsPanel = lazy(() => import('@/components/layout/LyricsPanel'))
interface NowPlayingViewProps {
    track: Track | null
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

/** The lyrics box, empty, for as long as its chunk is in flight. */
function LyricsPlaceholder() {
    return (
        <section
            className="mt-4 flex h-80 flex-col rounded-2xl bg-player-border/30 p-5 lg:h-auto lg:min-h-0 lg:flex-1"
            aria-hidden="true"
        >
            <div className="mb-4 h-3 w-16 animate-pulse rounded bg-player-border/60"/>
            <div className="flex min-h-0 flex-1 flex-col justify-center gap-4">
                <div className="h-4 w-2/3 animate-pulse rounded bg-player-border/60"/>
                <div className="h-4 w-4/5 animate-pulse rounded bg-player-border/60"/>
                <div className="h-4 w-1/2 animate-pulse rounded bg-player-border/60"/>
            </div>
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

type FrequencyBand = 'Visualizer'

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
            const accentColor = getComputedStyle(canvas).getPropertyValue('--player-accent').trim() || color
            canvasContext.fillStyle = accentColor
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
        <div className="frequency-band">
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[11px] font-medium uppercase tracking-[0.18em] text-player-foreground">{band}</span>
                <span className="text-[10px] text-player-muted">FFT</span>
            </div>
            <canvas ref={canvasRef} className="h-20 w-full" aria-label={`${band} frequency visualizer`} />
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
        <section className={cn('ambient-visualizer relative flex min-h-0 w-full flex-col justify-end overflow-hidden rounded-2xl border border-player-border/60 p-4', isPlaying && 'is-playing')} style={artworkStyle} aria-label="Music visualizer">
            <div className="ambient-visualizer-wash" aria-hidden="true" />
            <div className="ambient-visualizer-blob ambient-visualizer-blob-one" aria-hidden="true" />
            <div className="ambient-visualizer-blob ambient-visualizer-blob-two" aria-hidden="true" />
            <div className="ambient-visualizer-blob ambient-visualizer-blob-three" aria-hidden="true" />
            <div className="relative z-10 w-full">
                {graph ? (
                    <BandVisualizer band="Visualizer" startRatio={0} endRatio={1} color="rgba(249, 115, 178, 0.9)" analyser={graph.analyser} isPlayingRef={isPlayingRef} />
                ) : (
                    <div className="frequency-band h-32 rounded-xl border border-player-border/50 bg-player/20" />
                )}
            </div>
        </section>
    )
}

export default function NowPlayingView({track, isPlaying, audioElementRef, onClose}: NowPlayingViewProps) {
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
                <div className="flex min-h-0 flex-1 flex-col gap-8 lg:flex-row lg:items-start lg:gap-10">
                    {/* Left column: cover and one full-spectrum visualizer */}
                    <div className="flex min-w-0 flex-1 max-w-2xl flex-col items-center gap-3">
                        <ArtworkDisplay track={track} className="w-[min(72vw,380px)]"/>
                        <div className="w-[min(72vw,380px)]">
                            <VisualizerPanel track={track} isPlaying={isPlaying} audioElementRef={audioElementRef}/>
                        </div>
                    </div>

                    {/* Right column: track details, lyrics, then the tag details */}
                    <aside
                        className="flex min-w-0 w-full shrink-0 flex-col justify-start lg:h-full lg:min-h-0 lg:w-140">
                        <TrackInfo track={track} onNavigate={onClose}/>
                        <Suspense fallback={<LyricsPlaceholder/>}>
                            <LyricsPanel track={track} isPlaying={isPlaying} audioElementRef={audioElementRef}/>
                        </Suspense>
                        <MetadataPanel track={track}/>
                    </aside>
                </div>
            </div>
        </motion.section>
    )
}
