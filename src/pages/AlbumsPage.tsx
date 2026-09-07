import type { Track } from '@/types/music'
import { groupAlbums } from '@/utils/groupAlbums'
import { parseArtists } from '@/utils/parseArtists'
import { Disc3, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
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
import { getAlbumQualityBadge } from '@/utils/getAudioQualityBadge'
import AudioQualityBadge from '@/components/AudioQualityBadge'

interface AlbumsPageProps {
  tracks: Track[]
  onPlayAlbum?: (albumName: string, albumArtist: string) => void
  onPlayNext?: (albumName: string, albumArtist: string) => void
  onAddToPlaylist?: (albumName: string, albumArtist: string) => void
  onRemoveFromLibrary?: (albumName: string, albumArtist: string) => void
  onOpenSidebar?: () => void
}

export default function AlbumsPage({ 
  tracks, 
  onPlayAlbum,
  onPlayNext,
  onAddToPlaylist,
  onRemoveFromLibrary,
  onOpenSidebar 
}: AlbumsPageProps) {
  const navigate = useNavigate()
  const albums = groupAlbums(tracks)

  return (
    <>
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 relative">
        {/* Mobile menu button */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Albums</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse your albums</p>
      </div>

      {/* Content */}
      <div className="px-6 pb-8">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <p className="text-lg font-medium">No albums in your library yet.</p>
            <p className="text-sm mt-1">Click "Add Music" to import your library</p>
          </div>
        ) : (
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {albums.map(album => {
              const qualityBadge = getAlbumQualityBadge(album.trackIndices.map(i => tracks[i]))
              
              return (
                <ContextMenu key={`${album.name}::${album.albumArtist}`}>
                  <ContextMenuTrigger asChild>
                    <div
                      className="group cursor-pointer"
                      onClick={() => navigate(`/albums/${encodeURIComponent(album.albumArtist)}/${encodeURIComponent(album.name)}`)}
                    >
                      {/* Cover — 1:1 aspect ratio with Apple-style rounding */}
                      <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3 transition-transform group-hover:scale-[1.02] relative">
                        {album.cover ? (
                          <img
                            src={album.cover}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-muted">
                            <Disc3 size={40} className="text-muted-foreground/20" />
                          </div>
                        )}
                        {/* Quality badge */}
                        <AudioQualityBadge
                          badge={qualityBadge}
                          className="absolute bottom-2 right-2 shadow-md"
                        />
                      </div>

                      {/* Album info */}
                      <p className="text-sm font-semibold truncate leading-snug mb-1">
                        {album.name}
                      </p>
                      <p className="text-xs text-muted-foreground truncate">
                        {parseArtists(album.albumArtist).map((artist, idx) => (
                          <span key={idx}>
                            <button
                              onClick={(e) => {
                                e.stopPropagation()
                                navigate(`/artists/${encodeURIComponent(artist)}`)
                              }}
                              className="hover:text-foreground transition-colors"
                            >
                              {artist}
                            </button>
                            {idx < parseArtists(album.albumArtist).length - 1 && ', '}
                          </span>
                        ))}
                      </p>
                    </div>
                  </ContextMenuTrigger>
                  <ContextMenuContent className="w-48">
                    {onPlayAlbum && (
                      <ContextMenuItem onClick={() => onPlayAlbum(album.name, album.albumArtist)}>
                        Play
                      </ContextMenuItem>
                    )}
                    {onPlayNext && (
                      <ContextMenuItem onClick={() => onPlayNext(album.name, album.albumArtist)}>
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
                    <ContextMenuItem onClick={() => navigate(`/artists/${encodeURIComponent(album.albumArtist)}`)}>
                      Go to Artist
                    </ContextMenuItem>
                    {(onRemoveFromLibrary || onPlayAlbum || onPlayNext || onAddToPlaylist) && (
                      <ContextMenuSeparator />
                    )}
                    {onRemoveFromLibrary && (
                      <ContextMenuItem 
                        className="text-destructive focus:text-destructive"
                        onClick={() => onRemoveFromLibrary(album.name, album.albumArtist)}
                      >
                        Remove from Library
                      </ContextMenuItem>
                    )}
                  </ContextMenuContent>
                </ContextMenu>
              )
            })}
          </div>
        )}
      </div>
    </>
  )
}
