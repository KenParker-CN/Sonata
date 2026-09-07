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
    <div className="h-[88px] shrink-0 bg-player border-t border-player-border flex items-center px-2 sm:px-4 gap-2 sm:gap-4">
      {/* Left: Cover + track info */}
      <div 
        className="flex items-center gap-2 sm:gap-3 w-[160px] sm:w-[240px] shrink-0 cursor-pointer group"
        onClick={() => onCoverClick?.()}
      >
        {track?.cover ? (
          <img
            src={track.cover}
            alt=""
            className="w-[40px] h-[40px] sm:w-[52px] sm:h-[52px] rounded-md object-cover group-hover:opacity-75 transition-opacity"
          />
        ) : (
          <div className="w-[40px] h-[40px] sm:w-[52px] sm:h-[52px] rounded-md bg-muted flex items-center justify-center group-hover:opacity-75 transition-opacity">
            <Play size={16} className="sm:hidden text-muted-foreground" />
            <Play size={20} className="hidden sm:block text-muted-foreground" />
          </div>
        )}
        <div className="min-w-0">
          <p className="text-xs sm:text-sm font-medium truncate group-hover:text-foreground transition-colors">
            {track?.title ?? '未播放'}
          </p>
          <div className="text-[10px] sm:text-xs text-muted-foreground truncate">
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
            className="p-1.5 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-70 transition-opacity"
          >
            <SkipBack size={18} fill="currentColor" />
          </button>
          <button
            onClick={onTogglePlay}
            disabled={!track}
            className="p-2.5 rounded-full bg-primary text-primary-foreground hover:opacity-90 transition-opacity disabled:opacity-50"
          >
            {isPlaying ? <Pause size={18} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
          </button>
          <button
            onClick={onNext}
            disabled={!canNext}
            className="p-1.5 text-foreground disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-70 transition-opacity"
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
          className="p-1 text-muted-foreground hover:text-foreground transition-colors"
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
          className="w-24 h-4 progress-bar"
          style={{ '--range-fill': `${volume * 100}%` } as React.CSSProperties}
        />
      </div>
    </div>
  )
}
