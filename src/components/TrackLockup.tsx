import type { Track } from '@/types/music'
import { Play, MoreHorizontal } from 'lucide-react'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu'
import { useState } from 'react'
import AudioQualityBadge from './AudioQualityBadge'
import { getAudioQualityBadge } from '@/utils/getAudioQualityBadge'

interface TrackLockupProps {
  track: Track
  isActive: boolean
  onClick: () => void
  onPlayNext?: (track: Track) => void
  onAddToPlaylist?: (trackId: string) => void
  onGoToAlbum?: (album: { name: string; albumArtist: string }) => void
  onGoToArtist?: (artistName: string) => void
  onRemoveFromLibrary?: (trackId: string) => void
  showQualityBadge?: boolean
}

export default function TrackLockup({ 
  track, 
  isActive, 
  onClick,
  onPlayNext,
  onAddToPlaylist,
  onGoToAlbum,
  onGoToArtist,
  onRemoveFromLibrary,
  showQualityBadge = true,
}: TrackLockupProps) {
  const [contextMenuOpen, setContextMenuOpen] = useState(false)
  const qualityBadge = getAudioQualityBadge(track)

  return (
    <ContextMenu open={contextMenuOpen} onOpenChange={setContextMenuOpen}>
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

            {/* Play button overlay - shows on hover */}
            <div className="play-button-overlay absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity bg-black/40 rounded">
              <Play size={20} className="text-white fill-white" />
            </div>

            {/* Currently playing indicator - subtle icon */}
            {isActive && (
              <div className="absolute top-1 left-1 p-1 rounded-full bg-background/90 shadow-sm">
                <Play size={12} className="fill-current text-foreground" />
              </div>
            )}
          </div>

          {/* Content */}
          <div className="content min-w-0 flex-1 flex items-center gap-1.5">
            {showQualityBadge && <AudioQualityBadge badge={qualityBadge} />}
            <div className="min-w-0 flex-1">
              <p className={cn(
                'text-sm truncate',
                isActive ? 'font-medium' : 'font-normal'
              )}>
                {track.title}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-0.5">
                {track.album}
              </p>
            </div>
          </div>

          {/* Context menu button */}
          <button
            className="context-menu-button opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded hover:bg-accent"
            onClick={(e) => {
              e.stopPropagation()
              setContextMenuOpen(true)
            }}
          >
            <MoreHorizontal size={14} className="text-foreground" />
          </button>
        </div>
      </ContextMenuTrigger>
      <ContextMenuContent className="w-64">
        <ContextMenuItem onClick={onClick}>
          <Play className="mr-2 h-4 w-4" />
          Play
        </ContextMenuItem>
        {onPlayNext && (
          <ContextMenuItem onClick={() => onPlayNext(track)}>
            Play Next
          </ContextMenuItem>
        )}
        {onAddToPlaylist && (
          <ContextMenuItem onClick={() => onAddToPlaylist(track.id)}>
            Add to Playlist
          </ContextMenuItem>
        )}
        {onGoToAlbum && track.album && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem onClick={() => onGoToAlbum({ name: track.album, albumArtist: track.albumArtist || track.artist })}>
              Go to Album
            </ContextMenuItem>
          </>
        )}
        {onGoToArtist && (
          <ContextMenuItem onClick={() => onGoToArtist(track.artist)}>
            Go to Artist
          </ContextMenuItem>
        )}
        {onRemoveFromLibrary && (
          <>
            <ContextMenuSeparator />
            <ContextMenuItem className="text-destructive focus:text-destructive" onClick={() => onRemoveFromLibrary(track.id)}>
              Remove from Library
            </ContextMenuItem>
          </>
        )}
      </ContextMenuContent>
    </ContextMenu>
  )
}
