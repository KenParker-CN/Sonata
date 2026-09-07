import type { Track } from '@/types/music'
import { formatTime } from '@/utils/formatTime'
import { parseArtists } from '@/utils/parseArtists'
import {
  SkipBack,
  Play,
  Pause,
  SkipForward,
  Volume2,
  VolumeX,
} from 'lucide-react'

interface PlayerBarProps {
  track: Track | null
  isPlaying: boolean
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
  onArtistClick?: (artistName: string) => void
  onCoverClick?: () => void
}

export default function PlayerBar({
  track,
  isPlaying,
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
  onArtistClick,
  onCoverClick,
}: PlayerBarProps) {
  return (
    <div className="h-[96px] sm:h-[88px] shrink-0 bg-player border-t border-player-border flex items-center px-2 sm:px-4 gap-2 sm:gap-4 shadow-[0_-12px_32px_hsl(28_30%_3%_/_0.14)]">
      {/* Left: Cover + track info */}
      <div 
        className="flex items-center gap-2 sm:gap-3 w-[124px] sm:w-[240px] shrink-0 cursor-pointer group"
        onClick={() => onCoverClick?.()}
      >
        {track?.cover ? (
          <img
            src={track.cover}
            alt=""
            className="w-[36px] h-[36px] sm:w-[52px] sm:h-[52px] rounded-lg object-cover group-hover:opacity-75 transition-opacity"
          />
        ) : (
          <div className="w-[36px] h-[36px] sm:w-[52px] sm:h-[52px] rounded-lg bg-muted flex items-center justify-center group-hover:opacity-75 transition-opacity">
            <Play size={16} className="sm:hidden text-muted-foreground" />
            <Play size={20} className="hidden sm:block text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium truncate group-hover:text-foreground transition-colors">
            {track?.title ?? '未播放'}
          </p>
          <div className="hidden sm:block text-[10px] sm:text-xs text-muted-foreground truncate">
            {onArtistClick && track?.artist ? (
              parseArtists(track.artist).map((artist, idx) => (
                <span key={idx}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      onArtistClick(artist)
                    }}
                    className="hover:text-foreground transition-colors"
                  >
                    {artist}
                  </button>
                  {idx < parseArtists(track.artist).length - 1 && ', '}
                </span>
              ))
            ) : (
              track?.artist || '未知艺术家'
            )}
          </div>
        </div>
      </div>

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
            disabled={!track}
            aria-label={isPlaying ? 'Pause' : 'Play'}
            className="p-2.5 rounded-full bg-primary text-primary-foreground shadow-[0_0_20px_hsl(38_88%_62%_/_0.18)] hover:brightness-105 transition disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-player"
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
