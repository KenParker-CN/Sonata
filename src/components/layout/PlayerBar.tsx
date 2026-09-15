import type { RepeatMode, Track } from '@/types/music'
import { formatTime } from '@/utils/formatTime'
import { parseArtists } from '@/utils/parseArtists'
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Shuffle,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
  ListMusic,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import { useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import AudioQualityBadge from '@/components/media/AudioQualityBadge'
import { getAudioQualityBadge } from '@/utils/getAudioQualityBadge'
import { artistPath, trackPath } from '@/utils/routes'
import NowPlayingView from '@/components/layout/NowPlayingView'
import * as React from "react";

interface PlayerBarProps {
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
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onCycleRepeatMode: () => void
  onToggleShuffle: () => void
  onOpenQueue: () => void
}

const transportBtn =
  'rounded-md p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-30 disabled:cursor-not-allowed'

export default function PlayerBar({
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
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onCycleRepeatMode,
  onToggleShuffle,
  onOpenQueue,
}: PlayerBarProps) {
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false)

  return (
    <>
      <AnimatePresence>
        {nowPlayingOpen && (
          <NowPlayingView
            track={track}
            hasTrack={hasTrack}
            isPlaying={isPlaying}
            repeatMode={repeatMode}
            shuffle={shuffle}
            currentTime={currentTime}
            duration={duration}
            volume={volume}
            canPrev={canPrev}
            canNext={canNext}
            queueCount={queueCount}
            playbackError={playbackError}
            onCollapse={() => setNowPlayingOpen(false)}
            onTogglePlay={onTogglePlay}
            onPrev={onPrev}
            onNext={onNext}
            onSeek={onSeek}
            onVolumeChange={onVolumeChange}
            onCycleRepeatMode={onCycleRepeatMode}
            onToggleShuffle={onToggleShuffle}
            onOpenQueue={onOpenQueue}
          />
        )}
      </AnimatePresence>
      <div className={cn(
        'player-dock h-(--player-height) shrink-0 bg-player text-player-foreground border-t border-player-border flex items-center px-2 sm:px-5 gap-1 sm:gap-4',
        nowPlayingOpen && 'pointer-events-none opacity-0',
      )}>
      {/* Left: track info  — fixed width block; the cover is anchored to its left edge regardless of title length */}
      <div className="hidden sm:flex w-65 lg:w-[320px] shrink-0 min-w-0 justify-start">
        <AnimatePresence initial={false} mode="wait">
          <motion.div
            key={track?.id ?? 'no-track'}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.18, ease: 'easeOut' }}
            className="flex w-full items-center gap-3.5"
          >
            <button
              type="button"
              onClick={() => setNowPlayingOpen(true)}
              aria-label="Open Now Playing"
              className="shrink-0 rounded-lg focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              {track?.cover ? (
                <motion.img layoutId={`now-playing-art-${track.id}`} src={track.cover} alt="" className="h-12 w-12 rounded-lg object-cover shadow-lg" />
              ) : (
                <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-player-border text-player-muted shadow-lg">
                  <Play size={14} />
                </div>
              )}
            </button>
            <div className="min-w-0 flex-1 text-left">
              <div className="flex min-w-0 items-center gap-1.5">
                <p className="truncate text-sm font-medium text-player-foreground">
                  <Link
                    to={track ? trackPath(track.id) : '#'}
                    className="hover:underline"
                  >
                    {track?.title ?? 'No track selected'}
                  </Link>
                </p>
                {track && (
                  <AudioQualityBadge
                    badge={getAudioQualityBadge(track)}
                    onDark
                    className="px-1 py-px text-[10px]"
                  />
                )}
              </div>
              <p className="truncate text-xs text-player-muted">
                {track?.artist ? parseArtists(track.artist).map((artist, idx, arr) => (
                  <span key={artist}>
                    <Link
                      to={artistPath(artist)}
                      className="hover:underline"
                    >
                      {artist}
                    </Link>
                    {idx < arr.length - 1 && ', '}
                  </span>
                )) : 'Add music to start listening'}
              </p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Center: time + progress (mobile also shows the track title) */}
      <div className="flex-1 min-w-0 flex flex-col justify-center gap-1">
        <p className="sm:hidden truncate text-xs font-medium text-player-foreground">
          {track?.title ?? 'No track selected'}
        </p>
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 text-xs text-player-muted tabular-nums">
          <span className="w-9 sm:w-11 text-right shrink-0">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={e => onSeek(Number(e.target.value))}
            aria-label="Track progress"
            className="progress-bar progress-bar-player flex-1 h-5 min-w-0"
            style={{ '--range-fill': `${duration > 0 ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
          />
          <span className="w-9 sm:w-11 shrink-0">{formatTime(duration)}</span>
        </div>
        {playbackError && (
          <p className="truncate text-[11px] text-destructive" role="alert">
            {playbackError}
          </p>
        )}
      </div>

      {/* Right of progress: transport controls */}
      <div className="flex items-center gap-0.5 sm:gap-2 shrink-0">
        <button
          onClick={onOpenQueue}
          aria-label="Open queue"
          className={cn(transportBtn, 'text-player-foreground relative')}
        >
          <ListMusic size={18} />
          {queueCount > 0 && (
            <span className="absolute -right-0.5 -top-0.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-player-accent px-1 text-[9px] font-bold text-player">
              {queueCount}
            </span>
          )}
        </button>
        <button
          onClick={onToggleShuffle}
          aria-label={shuffle ? 'Disable shuffle' : 'Enable shuffle'}
          title={shuffle ? 'Shuffle on' : 'Shuffle off'}
          className={cn(transportBtn, shuffle ? 'text-player-foreground' : 'text-player-muted hover:text-player-foreground')}
        >
          <Shuffle size={17} />
        </button>
        <button
          onClick={onPrev}
          disabled={!canPrev}
          aria-label="Previous track"
          className={cn(transportBtn, 'text-player-foreground')}
        >
          <SkipBack size={18} fill="currentColor" />
        </button>
        <button
          onClick={onTogglePlay}
          disabled={!hasTrack}
          aria-label={isPlaying ? 'Pause' : 'Play'}
          className={cn(transportBtn, 'player-play rounded-full p-2.5 disabled:opacity-40')}
        >
          {isPlaying ? <Pause size={22} fill="currentColor" /> : <Play size={22} fill="currentColor" />}
        </button>
        <button
          onClick={onNext}
          disabled={!canNext}
          aria-label="Next track"
          className={cn(transportBtn, 'text-player-foreground')}
        >
          <SkipForward size={18} fill="currentColor" />
        </button>
        <button
          onClick={onCycleRepeatMode}
          aria-label={repeatMode === 'off' ? 'Enable repeat all' : repeatMode === 'all' ? 'Enable repeat one' : 'Disable repeat'}
          title={repeatMode === 'off' ? 'Repeat all' : repeatMode === 'all' ? 'Repeat one' : 'Repeat off'}
          className={cn(transportBtn, repeatMode === 'off' ? 'text-player-muted hover:text-player-foreground' : 'text-player-foreground')}
        >
          {repeatMode === 'one' ? <Repeat1 size={17} /> : <Repeat size={17} />}
        </button>
      </div>

      {/* Far right: volume */}
      <div className="hidden lg:flex items-center gap-2 w-32.5 shrink-0 justify-end text-player-muted">
        <button
          onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          className="p-1 rounded-md transition-colors hover:text-player-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          {volume === 0 ? <VolumeX size={16} /> : <Volume2 size={16} />}
        </button>
        <input
          type="range"
          min={0}
          max={1}
          step={0.01}
          value={volume}
          onChange={e => onVolumeChange(Number(e.target.value))}
          aria-label="Volume"
          className="w-24 h-4 progress-bar progress-bar-player"
          style={{ '--range-fill': `${volume * 100}%` } as React.CSSProperties}
        />
      </div>
      </div>
    </>
  )
}
