import type { Playlist, Track } from '@/types/music'
import type { TrackMenuLinks } from '@/components/context-menus/TrackContextMenu'
import { Play, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import { Link } from 'react-router-dom'
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'
import TrackMenuContent, { TrackDropdownContent } from '@/components/context-menus/TrackContextMenu'
import AudioQualityBadge from '@/components/media/AudioQualityBadge'
import { getAudioQualityBadge } from '@/utils/getAudioQualityBadge'
import { trackPath } from '@/utils/routes'

interface TrackLockupProps {
  track: Track
  isActive: boolean
  playlists: Playlist[]
  onClick: () => void
  onPlayNext?: (trackId: string) => void
  onAddToQueue?: (trackId: string) => void
  onAddToPlaylist?: (trackId: string, playlistId: string) => void
  links?: TrackMenuLinks
  onRemoveFromLibrary?: (trackId: string) => void
  showQualityBadge?: boolean
}

export default function TrackLockup({ 
  track, 
  isActive, 
  playlists,
  onClick,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  links,
  onRemoveFromLibrary,
  showQualityBadge = true,
}: TrackLockupProps) {
  const qualityBadge = showQualityBadge ? getAudioQualityBadge(track) : null

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div className="track-lockup group cursor-pointer flex items-center gap-2 p-1.5 rounded-md hover:bg-accent/50 transition-colors w-[300px]" onClick={onClick}>
          {/* Artwork wrapper */}
          <div className="artwork-wrapper relative w-10 h-10 shrink-0">
            {track.cover ? (
              <img
                src={track.cover}
                alt=""
                className="w-full h-full rounded object-cover"
              />
            ) : (
              <div className="w-full h-full rounded bg-muted flex items-center justify-center">
                <Play size={16} className="text-muted-foreground/30" />
              </div>
            )}

            {/* Play button overlay â€?a hover cue only; a tap already plays the row */}
            <div className="play-button-overlay absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded touch:hidden">
              <Play size={20} className="text-white fill-white" />
            </div>
          </div>

          {/* Content */}
          <div className="content min-w-0 flex-1 flex items-center gap-1.5">
            {showQualityBadge && <AudioQualityBadge badge={qualityBadge} />}
            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-sm truncate',
                isActive ? 'font-medium' : 'font-normal'
              )}>
                <Link
                  to={trackPath(track.id)}
                  className="hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  {track.title}
                </Link>
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {track.album}
              </p>
            </div>
          </div>

          <span onClick={e => e.stopPropagation()} className="dropdown dropdown-end shrink-0">
            <button
              type="button"
              tabIndex={0}
              aria-label={`More actions for ${track.title}`}
              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent touch:opacity-100 touch-target"
            >
              <MoreHorizontal size={14} className="text-foreground" />
            </button>
            <TrackDropdownContent
              track={track}
              playlists={playlists}
              onPlayNext={onPlayNext}
              onAddToQueue={onAddToQueue}
              onAddToPlaylist={onAddToPlaylist}
              links={links}
              onRemoveFromLibrary={onRemoveFromLibrary}
            />
          </span>
        </div>
      </ContextMenuTrigger>
      <TrackMenuContent
        track={track}
        playlists={playlists}
        onPlayNext={onPlayNext}
        onAddToQueue={onAddToQueue}
        onAddToPlaylist={onAddToPlaylist}
        links={links}
        onRemoveFromLibrary={onRemoveFromLibrary}
      />
    </ContextMenu>
  )
}

