import type { RepeatMode } from '@/types/music'
import { formatTime } from '@/utils/formatTime'
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Repeat,
  Repeat1,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface PlayerBarProps {
  hasTrack: boolean
  isPlaying: boolean
  repeatMode: RepeatMode
  currentTime: number
  duration: number
  volume: number
  canPrev: boolean
  canNext: boolean
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (time: number) => void
  onVolumeChange: (volume: number) => void
  onCycleRepeatMode: () => void
}

export default function PlayerBar({
  hasTrack,
  isPlaying,
  repeatMode,
  currentTime,
  duration,
  volume,
  canPrev,
  canNext,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onVolumeChange,
  onCycleRepeatMode,
}: PlayerBarProps) {
  return (
    <div className="h-[104px] sm:h-[92px] shrink-0 bg-player border-t border-player-border flex items-center px-2 sm:px-5 gap-2 sm:gap-5 shadow-sm">
      {/* Center: Controls + progress */}
      <div className="flex-1 flex flex-col items-center gap-0.5 sm:gap-1 min-w-0">
        {/* Transport controls */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onPrev}
            disabled={!canPrev}
            aria-label="Previous track"
            className="p-1.5 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={!hasTrack}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="p-2.5 rounded-full bg-primary text-primary-foreground shadow-sm hover:brightness-105 transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-player"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button
            onClick={onNext}
            disabled={!canNext}
            aria-label="Next track"
            className="p-1.5 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
          >
            <SkipForward size={18} fill="currentColor" />
          </button>
          <button
            onClick={onCycleRepeatMode}
            aria-label={repeatMode === 'off' ? 'Enable repeat all' : repeatMode === 'all' ? 'Enable repeat one' : 'Disable repeat'}
            title={repeatMode === 'off' ? 'Repeat all' : repeatMode === 'all' ? 'Repeat one' : 'Repeat off'}
            className={`rounded-md p-1.5 transition focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${repeatMode === 'off' ? 'text-muted-foreground hover:text-primary' : 'text-primary bg-accent'}`}
          >
            {repeatMode === 'one' ? <Repeat1 size={18} /> : <Repeat size={18} />}
          </button>
        </div>

        {/* Progress bar + time */}
        <div className="w-full flex items-center gap-1 sm:gap-2 text-[10px] sm:text-xs text-muted-foreground">
          <span className="w-[32px] sm:w-[40px] text-right tabular-nums">{formatTime(currentTime)}</span>
          <input
            type="range"
            min={0}
            max={duration || 0}
            value={currentTime}
            onChange={e => onSeek(Number(e.target.value))}
            aria-label="Track progress"
            className="progress-bar flex-1 h-5"
            style={{ '--range-fill': `${duration > 0 ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
          />
          <span className="w-[32px] sm:w-[40px] tabular-nums">{formatTime(duration)}</span>
        </div>
      </div>

      {/* Right: Volume - hidden on mobile */}
      <div className="hidden sm:flex items-center gap-2 w-[160px] shrink-0 justify-end">
        <button
          onClick={() => onVolumeChange(volume === 0 ? 1 : 0)}
          aria-label={volume === 0 ? 'Unmute' : 'Mute'}
          className="p-1 text-muted-foreground hover:text-primary transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-md"
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
          className="w-24 h-4 progress-bar"
          style={{ '--range-fill': `${volume * 100}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
