import type {CSSProperties, RefObject} from 'react'
import {useEffect, useRef, useState} from 'react'
import type {Track} from '@/types/music'
import {motion} from 'motion/react'
import {Link} from 'react-router-dom'
import {X, Settings} from 'lucide-react'
import {cn} from '@/lib/utils'
import {parseArtists} from '@/utils/parseArtists'
import {artistPath, trackPath} from '@/utils/routes'
import GeneratedArt from '@/components/media/GeneratedArt'
import {BackgroundRender} from '@applemusic-like-lyrics/react'
import LyricsPanel from '@/components/layout/LyricsPanel'

interface NowPlayingViewProps {
    track: Track | null
    isPlaying: boolean
    audioElementRef: RefObject<HTMLAudioElement | null>
    onClose: () => void
}

interface BackgroundSettings {
    fps: number
    renderScale: number
    flowSpeed: number
    staticMode: boolean
    lowFreqVolume: number
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

function MetadataSection({track}: { track: Track | null }) {
    const fields = track ? [
        ['Released on', track.releaseDate],

        ['Format', track.codec],
        ['Bit depth', track.bitDepth != null ? `${track.bitDepth}-bit` : undefined],
        ['Sample rate', track.sampleRate ? `${track.sampleRate} Hz` : undefined],
        ['Bitrate', track.bitrate ? `${(track.bitrate)} kbps` : undefined],
    ].filter(([, value]) => value) : []

    if (fields.length === 0) return null

    return (
        <section className="space-y-3">
            <h3 className="text-[11px] font-medium uppercase tracking-[0.18em] text-player-muted">Metadata</h3>
            <dl className="space-y-2">
                {fields.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-4">
                        <dt className="text-xs text-player-muted shrink-0">{label}</dt>
                        <dd className="text-sm text-player-foreground truncate text-right">{value}</dd>
                    </div>
                ))}
            </dl>
        </section>
    )
}

function PersonnelSection({track}: { track: Track | null }) {
    // Placeholder for future personnel data
    const fields = track ? [
        ['Composer', track.composer],
    ].filter(([, value]) => value) : []

    if (fields.length === 0) return null
    // This section will only show when personnel data is available
    return null
}

function CreditsSection({track}: { track: Track | null }) {
    // Placeholder for future credits data
    const fields = track ? [
        ['Copyright', track.copyright],
    ].filter(([, value]) => value) : []

    if (fields.length === 0) return null
    // This section will only show when credits data is available
    return null
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
            canvasContext.fillStyle = getComputedStyle(canvas).getPropertyValue('--player-accent').trim() || color
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
        <section className={cn('ambient-visualizer relative flex min-h-0 w-full flex-col justify-end overflow-hidden rounded-xl border border-player-border/60 p-4', isPlaying && 'is-playing')} style={artworkStyle} aria-label="Music visualizer">
            <div className="relative z-10 w-full">
                {graph ? (
                    <BandVisualizer band="Visualizer" startRatio={0} endRatio={1} color="rgba(249, 115, 178, 0.9)" analyser={graph.analyser} isPlayingRef={isPlayingRef} />
                ) : (
                    <div className="frequency-band h-20 rounded-lg border border-player-border/50 bg-player/20" />
                )}
            </div>
        </section>
    )
}

function BackgroundSettingsPanel({settings, onChange, onClose}: {
    settings: BackgroundSettings
    onChange: (settings: BackgroundSettings) => void
    onClose: () => void
}) {
    return (
        <div className="absolute right-4 top-4 z-40 w-80 rounded-xl border border-player-border/60 bg-player/95 backdrop-blur-sm p-4 shadow-2xl">
            <div className="mb-4 flex items-center justify-between">
                <h3 className="text-sm font-semibold text-player-foreground">Background Settings</h3>
                <button
                    onClick={onClose}
                    className="text-player-muted hover:text-player-foreground"
                    aria-label="Close settings"
                >
                    <X size={18} />
                </button>
            </div>
            <div className="space-y-4">
                <div className="space-y-2">
                    <label className="flex justify-between text-xs text-player-muted">
                        <span>FPS</span>
                        <span>{settings.fps}</span>
                    </label>
                    <input
                        type="range"
                        min="15"
                        max="60"
                        step="5"
                        value={settings.fps}
                        onChange={(e) => onChange({...settings, fps: Number(e.target.value)})}
                        className="w-full h-1 bg-player-border rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div className="space-y-2">
                    <label className="flex justify-between text-xs text-player-muted">
                        <span>Render Scale</span>
                        <span>{settings.renderScale}</span>
                    </label>
                    <input
                        type="range"
                        min="0.3"
                        max="1"
                        step="0.1"
                        value={settings.renderScale}
                        onChange={(e) => onChange({...settings, renderScale: Number(e.target.value)})}
                        className="w-full h-1 bg-player-border rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div className="space-y-2">
                    <label className="flex justify-between text-xs text-player-muted">
                        <span>Flow Speed</span>
                        <span>{settings.flowSpeed}</span>
                    </label>
                    <input
                        type="range"
                        min="0.1"
                        max="1"
                        step="0.1"
                        value={settings.flowSpeed}
                        onChange={(e) => onChange({...settings, flowSpeed: Number(e.target.value)})}
                        className="w-full h-1 bg-player-border rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div className="space-y-2">
                    <label className="flex justify-between text-xs text-player-muted">
                        <span>Low Freq Volume</span>
                        <span>{settings.lowFreqVolume}</span>
                    </label>
                    <input
                        type="range"
                        min="0.5"
                        max="2"
                        step="0.1"
                        value={settings.lowFreqVolume}
                        onChange={(e) => onChange({...settings, lowFreqVolume: Number(e.target.value)})}
                        className="w-full h-1 bg-player-border rounded-lg appearance-none cursor-pointer"
                    />
                </div>
                <div className="flex items-center justify-between">
                    <label className="text-xs text-player-muted">Static Mode</label>
                    <button
                        onClick={() => onChange({...settings, staticMode: !settings.staticMode})}
                        className={cn(
                            'relative h-5 w-9 rounded-full transition-colors',
                            settings.staticMode ? 'bg-player-accent' : 'bg-player-border'
                        )}
                    >
                        <span
                            className={cn(
                                'absolute top-0.5 h-4 w-4 rounded-full bg-white transition-transform',
                                settings.staticMode ? 'translate-x-4' : 'translate-x-0.5'
                            )}
                        />
                    </button>
                </div>
            </div>
        </div>
    )
}

export default function NowPlayingView({track, isPlaying, audioElementRef, onClose}: NowPlayingViewProps) {
    const [showSettings, setShowSettings] = useState(false)
    const [bgSettings, setBgSettings] = useState<BackgroundSettings>({
        fps: 30,
        renderScale: 0.5,
        flowSpeed: 0.2,
        staticMode: false,
        lowFreqVolume: 1
    })

    // Lock body scroll when NowPlayingView is open
    useEffect(() => {
        document.body.style.overflow = 'hidden'
        return () => {
            document.body.style.overflow = ''
        }
    }, [])
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
            className="absolute inset-x-0 bottom-(--player-height) top-0 z-30 flex min-h-0 flex-col bg-player text-player-foreground"
            aria-label="Now Playing"
        >
            <div className="absolute inset-0 -z-10" aria-hidden="true">
                <BackgroundRender
                    album={track?.cover ?? undefined}
                    playing={isPlaying}
                    fps={bgSettings.fps}
                    renderScale={bgSettings.renderScale}
                    flowSpeed={bgSettings.flowSpeed}
                    staticMode={bgSettings.staticMode}
                    lowFreqVolume={bgSettings.lowFreqVolume}
                />
            </div>
            {showSettings && (
                <BackgroundSettingsPanel
                    settings={bgSettings}
                    onChange={setBgSettings}
                    onClose={() => setShowSettings(false)}
                />
            )}
            <div className="relative mx-auto flex h-full w-full max-w-6xl flex-1 flex-col px-5 pb-8 pt-5 overflow-hidden">
                <div className="absolute right-4 top-4 flex gap-2">
                    <button
                        className="text-player-foreground/50 hover:text-player-foreground"
                        onClick={() => setShowSettings(!showSettings)}
                        aria-label="Background settings"
                    >
                        <Settings size={24} />
                    </button>
                    <button
                        className="text-player-foreground/50 hover:text-player-foreground lg:hidden"
                        onClick={onClose}
                        aria-label="Close Now Playing"
                    >
                        <X size={24} />
                    </button>
                </div>
                <div className="flex min-h-0 flex-1 flex-col gap-8 lg:flex-row lg:items-center lg:gap-16">
                    {/* Left column: cover and track info */}
                    <div className="flex min-w-0 flex-1 flex-col items-center gap-6 lg:items-start lg:max-w-md">
                        <ArtworkDisplay track={track} className="w-full max-w-95"/>
                        <div className="w-full max-w-95">
                            <TrackInfo track={track} onNavigate={onClose}/>
                        </div>
                    </div>

                    {/* Right column: visualizer, lyrics and metadata sections */}
                    <aside className="float-right flex min-w-0 w-full shrink-0 flex-col gap-6 lg:max-w-md min-h-0">
                        <VisualizerPanel track={track} isPlaying={isPlaying} audioElementRef={audioElementRef}/>
                        <LyricsPanel track={track} audioElementRef={audioElementRef}/>
                        <div className="space-y-6 shrink-0">
                            <MetadataSection track={track}/>
                            <PersonnelSection track={track}/>
                            <CreditsSection track={track}/>
                        </div>
                    </aside>
                </div>
            </div>
        </motion.section>
    )
}
