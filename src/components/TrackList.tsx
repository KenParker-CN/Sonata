import type { Track } from '@/types/music'
import { formatTime } from '@/utils/formatTime'
import { parseArtists } from '@/utils/parseArtists'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'

interface TrackListProps {
  tracks: Track[]
  currentIndex: number
  onTrackSelect: (index: number) => void
  onArtistClick?: (artistName: string) => void
  onAlbumClick?: (album: { name: string; albumArtist: string }) => void
  onPlayNext?: (track: Track) => void
  onAddToPlaylist?: (trackId: string) => void
  onGoToAlbum?: (album: { name: string; albumArtist: string }) => void
  onGoToArtist?: (artistName: string) => void
  onRemoveFromLibrary?: (trackId: string) => void
}

export default function TrackList({ 
  tracks, 
  currentIndex, 
  onTrackSelect, 
  onArtistClick, 
  onAlbumClick,
  onPlayNext,
  onAddToPlaylist,
  onGoToAlbum,
  onGoToArtist,
  onRemoveFromLibrary,
}: TrackListProps) {
  return (
    <div className="flex flex-col">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground border-b border-border">
        <span className="w-10" />
        <span className="flex-1 min-w-0">Title</span>
        <span className="w-[180px] hidden lg:block">Artist</span>
        <span className="w-[180px] hidden xl:block">Album</span>
        <span className="w-14 text-right">Duration</span>
      </div>

      {/* Track rows */}
      {tracks.map((track, index) => {
        const isActive = index === currentIndex
        return (
          <ContextMenu key={track.id}>
            <ContextMenuTrigger asChild>
              <div
                onClick={() => onTrackSelect(index)}
                className={cn(
                  'flex items-center gap-3 px-4 py-2 rounded-md cursor-pointer transition-colors group',
                  isActive
                    ? 'bg-accent'
                    : 'hover:bg-accent/50',
                )}
              >
                {track.cover ? (
                  <img
                    src={track.cover}
                    alt=""
                    className="w-10 h-10 rounded object-cover shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded bg-muted shrink-0" />
                )}

                <span className={cn(
                  'flex-1 min-w-0 text-sm truncate',
                  isActive ? 'font-medium text-foreground' : 'text-foreground',
                )}>
                  {track.title}
                </span>

                <span className="w-[180px] text-sm text-muted-foreground truncate hidden lg:block">
                  {onArtistClick ? (
                    parseArtists(track.artist).map((artist, idx) => (
                      <span key={idx}>
                        <button
                          onClick={(e) => {
                            e.stopPropagation()
                            onArtistClick(artist)
                          }}
                          onContextMenu={(e) => {
                            e.stopPropagation()
                          }}
                          className="hover:text-foreground transition-colors"
                        >
                          {artist}
                        </button>
                        {idx < parseArtists(track.artist).length - 1 && ', '}
                      </span>
                    ))
                  ) : (
                    track.artist
                  )}
                </span>

                <span className="w-[180px] text-sm text-muted-foreground truncate hidden xl:block">
                  {onAlbumClick ? (
                    <button
                      onClick={(e) => {
                        e.stopPropagation()
                        onAlbumClick({ name: track.album, albumArtist: track.albumArtist })
                      }}
                      className="hover:text-foreground transition-colors"
                    >
                      {track.album}
                    </button>
                  ) : (
                    track.album
                  )}
                </span>

                <span className="w-14 text-right text-sm text-muted-foreground tabular-nums">
                  {formatTime(track.duration)}
                </span>
              </div>
            </ContextMenuTrigger>
            <ContextMenuContent className="w-48">
              <ContextMenuItem onClick={() => onTrackSelect(index)}>
                Play
              </ContextMenuItem>
              {onPlayNext && (
                <ContextMenuItem onClick={() => onPlayNext(track)}>
                  Play Next
                </ContextMenuItem>
              )}
              {onAddToPlaylist && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>Add to Playlist</ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    <ContextMenuItem disabled>
                      No playlists available
                    </ContextMenuItem>
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}
              {onGoToAlbum && (
                <ContextMenuItem onClick={() => onGoToAlbum({ name: track.album, albumArtist: track.albumArtist })}>
                  Go to Album
                </ContextMenuItem>
              )}
              {onGoToArtist && (
                <ContextMenuSub>
                  <ContextMenuSubTrigger>Go to Artist</ContextMenuSubTrigger>
                  <ContextMenuSubContent className="w-48">
                    {parseArtists(track.artist).map((artist, idx) => (
                      <ContextMenuItem key={idx} onClick={() => onGoToArtist(artist)}>
                        {artist}
                      </ContextMenuItem>
                    ))}
                  </ContextMenuSubContent>
                </ContextMenuSub>
              )}
              {(onRemoveFromLibrary || onGoToAlbum || onGoToArtist) && (
                <ContextMenuSeparator />
              )}
              {onRemoveFromLibrary && (
                <ContextMenuItem 
                  className="text-destructive focus:text-destructive"
                  onClick={() => onRemoveFromLibrary(track.id)}
                >
                  Remove from Library
                </ContextMenuItem>
              )}
            </ContextMenuContent>
          </ContextMenu>
        )
      })}
    </div>
  )
}
