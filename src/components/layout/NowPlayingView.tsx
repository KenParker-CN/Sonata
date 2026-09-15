import type { CSSProperties } from 'react'
import type { RepeatMode, Track } from '@/types/music'
import { motion } from 'motion/react'
import {
  ChevronDown,
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

const controlButton =
  'flex h-11 w-11 items-center justify-center rounded-full text-player-foreground transition hover:bg-player-border focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-30'

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
  const artists = track?.artist ? parseArtists(track.artist) : []
  const progress = duration > 0 ? (currentTime / duration) * 100 : 0
  const artworkStyle = track?.cover
    ? ({ backgroundImage: `url(${track.cover})` } as CSSProperties)
    : undefined

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="fixed inset-0 z-40 flex min-h-0 flex-col overflow-y-auto bg-player text-player-foreground"
      aria-label="Now Playing"
    >
      <div
        className="pointer-events-none absolute inset-0 opacity-30 blur-3xl"
        style={artworkStyle}
        aria-hidden="true"
      />
      <div className="relative mx-auto flex min-h-full w-full max-w-6xl flex-1 flex-col px-5 pb-8 pt-5 sm:px-10 lg:px-16">
        <header className="flex items-center justify-between">
          <button
            type="button"
            onClick={onCollapse}
            aria-label="Collapse Now Playing"
            className="flex h-10 items-center gap-2 rounded-full px-3 text-sm text-player-muted transition hover:bg-player-border hover:text-player-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ChevronDown size={19} />
            <span className="hidden sm:inline">Now Playing</span>
          </button>
          <button
            type="button"
            onClick={onOpenQueue}
            aria-label="Open queue"
            className="relative flex h-10 items-center gap-2 rounded-full px-3 text-sm text-player-muted transition hover:bg-player-border hover:text-player-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <ListMusic size={18} />
            <span className="hidden sm:inline">Queue</span>
            {queueCount > 0 && (
              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-player-accent px-1 text-[10px] font-bold text-player">
                {queueCount}
              </span>
            )}
          </button>
        </header>

        <div className="relative flex flex-1 flex-col items-center justify-center gap-8 py-8 lg:flex-row lg:gap-20 lg:py-12">
          <motion.div
            layoutId={`now-playing-art-${track?.id ?? 'empty'}`}
            className="artwork-surface relative aspect-square w-[min(72vw,380px)] shrink-0 rounded-[1.5rem] bg-player-border shadow-2xl sm:w-[min(58vw,440px)] lg:w-[min(42vw,500px)]"
          >
            <GeneratedArt
              name={track?.title ?? 'Now Playing'}
              src={track?.cover ?? null}
              className="h-full w-full"
            />
          </motion.div>

          <div className="w-full max-w-xl text-center lg:text-left">
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

            <div className="mt-8">
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
        </div>
      </div>
    </motion.section>
  )
}
