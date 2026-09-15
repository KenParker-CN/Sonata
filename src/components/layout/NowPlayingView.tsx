import type { CSSProperties, ReactNode } from 'react'
import { useState } from 'react'
import type { RepeatMode, Track } from '@/types/music'
import { AnimatePresence, motion } from 'motion/react'
import {
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ListMusic,
  Pause,
  Play,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { formatTime } from '@/utils/formatTime'
import { parseArtists } from '@/utils/parseArtists'
import { artistPath, trackPath } from '@/utils/routes'
import GeneratedArt from '@/components/media/GeneratedArt'
import AudioQualityBadge from '@/components/media/AudioQualityBadge'
import { getAudioQualityBadge } from '@/utils/getAudioQualityBadge'

interface NowPlayingViewProps {
  track: Track | null
  hasTrack: boolean
  isPlaying: boolean
  repeatMode: RepeatMode
  shuffle: boolean
  currentTime: number
  duration: number
  volume: number
  canPrev: boolean
  canNext: boolean
  queueCount: number
  playbackError?: string | null
  onCollapse: () => void
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onCycleRepeatMode: () => void
  onToggleShuffle: () => void
  onOpenQueue: () => void
}

type MobilePanel = 'details' | 'now-playing' | 'lyrics'

const controlButton =
  'flex h-11 w-11 items-center justify-center rounded-full text-player-foreground transition hover:bg-player-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30'

function ArtworkDisplay({ track, className }: { track: Track | null; className?: string }) {
  return (
    <motion.div
      layoutId={`now-playing-art-${track?.id ?? 'empty'}`}
      className={cn('artwork-surface relative aspect-square rounded-[1.5rem] bg-player-border shadow-2xl', className)}
    >
      <GeneratedArt
        name={track?.title ?? 'Now Playing'}
        src={track?.cover ?? null}
        className="h-full w-full"
      />
    </motion.div>
  )
}

function TrackInfo({ track }: { track: Track | null }) {
  const artists = track?.artist ? parseArtists(track.artist) : []

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-2 lg:justify-start">
        <span className="section-kicker text-player-accent">Listening now</span>
        {track && <AudioQualityBadge badge={getAudioQualityBadge(track)} onDark />}
      </div>
      <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
        {track ? (
          <Link to={trackPath(track.id)} className="transition hover:text-player-accent">
            {track.title}
          </Link>
        ) : 'No track selected'}
      </h1>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base text-player-muted lg:justify-start">
        {artists.length > 0 ? artists.map((artist, index) => (
          <span key={artist}>
            <Link to={artistPath(artist)} className="hover:text-player-foreground hover:underline">
              {artist}
            </Link>
            {index < artists.length - 1 && ', '}
          </span>
        )) : <span>Add music to start listening</span>}
        {track?.album && <><span aria-hidden="true">·</span><span>{track.album}</span></>}
      </div>
    </div>
  )
}

function MetadataPanel({ track }: { track: Track | null }) {
  const fields = track ? [
    ['Composer', track.composer],
    ['Album artist', track.albumArtist],
    ['Format', track.codec?.toUpperCase()],
    ['Quality', track.lossless ? 'Lossless' : track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : undefined],
    ['Sample rate', track.sampleRate ? `${track.sampleRate} Hz` : undefined],
    ['Release', track.releaseDate],
    ['Copyright', track.copyright],
  ].filter(([, value]) => value) : []

  return (
    <section className="music-surface-soft rounded-2xl p-5 text-left">
      <p className="section-kicker mb-4 text-player-accent">Library metadata</p>
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
        <div className="rounded-xl border border-dashed border-player-border px-4 py-6 text-sm leading-6 text-player-muted">
          Rich recording details will appear here when they are available in your local tags.
        </div>
      )}
    </section>
  )
}

function LyricsPanel() {
  return (
    <section className="flex min-h-[280px] flex-1 flex-col justify-center rounded-2xl border border-dashed border-player-border px-6 py-10 text-center">
      <p className="text-lg font-medium text-player-foreground">Lyrics and text</p>
      <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-player-muted">
        Lyrics, libretti, and program notes can live here when they are available for this recording.
      </p>
    </section>
  )
}

interface PlaybackControlsProps {
  hasTrack: boolean
  isPlaying: boolean
  repeatMode: RepeatMode
  shuffle: boolean
  currentTime: number
  duration: number
  volume: number
  canPrev: boolean
  canNext: boolean
  playbackError?: string | null
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onCycleRepeatMode: () => void
  onToggleShuffle: () => void
}

function PlaybackControls({
  hasTrack,
  isPlaying,
  repeatMode,
  shuffle,
  currentTime,
  duration,
  volume,
  canPrev,
  canNext,
  playbackError,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onCycleRepeatMode,
  onToggleShuffle,
}: PlaybackControlsProps) {
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0

  return (
    <div>
      <input
        type="range"
        min={0}
        max={duration || 0}
        value={currentTime}
        onChange={event => onSeek(Number(event.target.value))}
        aria-label="Track progress"
        className="progress-bar progress-bar-player h-6 w-full"
        style={{ '--range-fill': `${progress}%` } as CSSProperties}
      />
      <div className="mt-1 flex justify-between text-xs tabular-nums text-player-muted">
        <span>{formatTime(currentTime)}</span>
        <span>{formatTime(duration)}</span>
      </div>
      <div className="mt-6 flex items-center justify-center gap-1 sm:gap-3 lg:justify-start">
        <button type="button" onClick={onToggleShuffle} aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'} className={cn(controlButton, shuffle && 'text-player-accent')}>
          <Shuffle size={19} />
        </button>
        <button type="button" onClick={onPrev} disabled={!canPrev} aria-label="Previous track" className={controlButton}>
          <SkipBack size={22} fill="currentColor" />
        </button>
        <button type="button" onClick={onTogglePlay} disabled={!hasTrack} aria-label={isPlaying ? 'Pause' : 'Play'} className="player-play flex h-16 w-16 items-center justify-center rounded-full transition hover:scale-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-40">
          {isPlaying ? <Pause size={28} fill="currentColor" /> : <Play size={28} fill="currentColor" />}
        </button>
        <button type="button" onClick={onNext} disabled={!canNext} aria-label="Next track" className={controlButton}>
          <SkipForward size={22} fill="currentColor" />
        </button>
        <button type="button" onClick={onCycleRepeatMode} aria-label={repeatMode === 'off' ? 'Enable repeat all' : repeatMode === 'all' ? 'Enable repeat one' : 'Disable repeat'} className={cn(controlButton, repeatMode !== 'off' && 'text-player-accent')}>
          {repeatMode === 'one' ? <Repeat1 size={19} /> : <Repeat size={19} />}
        </button>
      </div>
      <div className="mx-auto mt-7 flex max-w-xs items-center gap-2 text-player-muted lg:mx-0">
        {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={event => onVolumeChange(Number(event.target.value))}
          aria-label="Volume"
          className="progress-bar progress-bar-player h-5 flex-1"
          style={{ '--range-fill': `${volume * 100}%` } as CSSProperties}
        />
      </div>
      {playbackError && <p className="mt-4 text-sm text-destructive" role="alert">{playbackError}</p>}
    </div>
  )
}

function MobilePager({ panel, setPanel, children }: { panel: MobilePanel; setPanel: (panel: MobilePanel) => void; children: Record<MobilePanel, ReactNode> }) {
  const panels: MobilePanel[] = ['details', 'now-playing', 'lyrics']
  const index = panels.indexOf(panel)

  const move = (direction: 1 | -1) => {
    const nextIndex = Math.min(panels.length - 1, Math.max(0, index + direction))
    setPanel(panels[nextIndex])
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:hidden">
      <div className="mb-5 flex items-center justify-center gap-5 text-xs font-medium">
        {panels.map(item => (
          <button key={item} type="button" onClick={() => setPanel(item)} className={cn('capitalize transition', item === panel ? 'text-player-foreground' : 'text-player-muted')}>
            {item === 'now-playing' ? 'Now Playing' : item}
          </button>
        ))}
      </div>
      <motion.div
        key={panel}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) move(1)
          if (info.offset.x > 50) move(-1)
        }}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex min-h-0 flex-1 flex-col justify-center"
      >
        {children[panel]}
      </motion.div>
      <div className="mt-6 flex items-center justify-center gap-2">
        {panels.map(item => (
          <button key={item} type="button" onClick={() => setPanel(item)} aria-label={`Show ${item}`} className={cn('h-1.5 rounded-full transition-all', item === panel ? 'w-6 bg-player-foreground' : 'w-1.5 bg-player-border')} />
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button type="button" onClick={() => move(-1)} disabled={index === 0} className="flex items-center gap-1 text-xs text-player-muted disabled:opacity-30"><ChevronLeft size={15} /> Previous</button>
        <button type="button" onClick={() => move(1)} disabled={index === panels.length - 1} className="flex items-center gap-1 text-xs text-player-muted disabled:opacity-30">Next <ChevronRight size={15} /></button>
      </div>
    </div>
  )
}

export default function NowPlayingView({
  track,
  hasTrack,
  isPlaying,
  repeatMode,
  shuffle,
  currentTime,
  duration,
  volume,
  canPrev,
  canNext,
  queueCount,
  playbackError,
  onCollapse,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onCycleRepeatMode,
  onToggleShuffle,
  onOpenQueue,
}: NowPlayingViewProps) {
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('now-playing')
  const [textOpen, setTextOpen] = useState(false)
  const artworkStyle = track?.cover ? ({ backgroundImage: `url(${track.cover})` } as CSSProperties) : undefined
  const details = <MetadataPanel track={track} />
  const lyrics = <LyricsPanel />
  const playback = (
    <PlaybackControls
      hasTrack={hasTrack}
      isPlaying={isPlaying}
      repeatMode={repeatMode}
      shuffle={shuffle}
      currentTime={currentTime}
      duration={duration}
      volume={volume}
      canPrev={canPrev}
      canNext={canNext}
      playbackError={playbackError}
      onTogglePlay={onTogglePlay}
      onPrev={onPrev}
      onNext={onNext}
      onSeek={onSeek}
      onVolumeChange={onVolumeChange}
      onCycleRepeatMode={onCycleRepeatMode}
      onToggleShuffle={onToggleShuffle}
    />
  )
  const nowPlaying = (
    <div className="flex flex-col items-center gap-7 lg:items-start">
      <ArtworkDisplay track={track} className="w-[min(72vw,380px)] sm:w-[min(58vw,440px)]" />
      <div className="w-full text-center lg:text-left">
        <TrackInfo track={track} />
        <div className="mt-8">{playback}</div>
      </div>
    </div>
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-40 flex min-h-0 flex-col overflow-y-auto bg-player text-player-foreground"
      aria-label="Now Playing"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30 blur-3xl" style={artworkStyle} aria-hidden="true" />
      <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-1 flex-col px-5 pb-8 pt-5 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <button type="button" onClick={onCollapse} aria-label="Collapse Now Playing" className="flex h-10 items-center gap-2 rounded-full px-3 text-sm text-player-muted transition hover:bg-player-border hover:text-player-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
            <ChevronDown size={19} />
            <span className="hidden sm:inline">Now Playing</span>
          </button>
          <div className="flex items-center gap-2">
            <button type="button" onClick={() => setTextOpen(value => !value)} className="hidden rounded-full px-3 py-2 text-sm text-player-muted transition hover:bg-player-border hover:text-player-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring xl:inline-flex">
              {textOpen ? 'Hide text' : 'Show text'}
            </button>
            <button type="button" onClick={onOpenQueue} aria-label="Open queue" className="relative flex h-10 items-center gap-2 rounded-full px-3 text-sm text-player-muted transition hover:bg-player-border hover:text-player-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
              <ListMusic size={18} />
              <span className="hidden sm:inline">Queue</span>
              {queueCount > 0 && <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-player-accent px-1 text-[10px] font-bold text-player">{queueCount}</span>}
            </button>
          </div>
        </header>

        <MobilePager
          panel={mobilePanel}
          setPanel={setMobilePanel}
          children={{ details, 'now-playing': nowPlaying, lyrics }}
        />

        <div className="relative hidden min-h-0 flex-1 items-center justify-center gap-10 py-8 lg:flex xl:gap-16">
          <div className="min-w-0 max-w-2xl flex-1">{nowPlaying}</div>
          <AnimatePresence initial={false}>
            {textOpen && (
              <motion.aside initial={{ opacity: 0, x: 24, width: 0 }} animate={{ opacity: 1, x: 0, width: 340 }} exit={{ opacity: 0, x: 24, width: 0 }} className="hidden max-h-[min(680px,75vh)] min-h-0 shrink-0 flex-col gap-4 overflow-hidden xl:flex">
                <LyricsPanel />
                <MetadataPanel track={track} />
              </motion.aside>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.section>
  )
}
