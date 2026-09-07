import type { Track } from '@/types/music'
import { groupArtists } from '@/utils/groupArtists'
import { Users, Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'

interface ArtistsPageProps {
  tracks: Track[]
  onPlayArtist?: (artistName: string) => void
  onPlayNext?: (artistName: string) => void
  onAddToPlaylist?: (artistName: string) => void
  onOpenSidebar?: () => void
}

export default function ArtistsPage({ 
  tracks, 
  onPlayArtist,
  onPlayNext,
  onAddToPlaylist,
  onOpenSidebar 
}: ArtistsPageProps) {
  const navigate = useNavigate()
  const artists = groupArtists(tracks)

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
        <h1 className="text-2xl font-bold tracking-tight">Artists</h1>
        <p className="text-sm text-muted-foreground mt-1">Browse your artists</p>
      </div>

      {/* Content */}
      <div className="px-6 pb-8">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <p className="text-lg font-medium">No artists in your library yet.</p>
            <p className="text-sm mt-1">Click "Add Music" to import your library</p>
          </div>
        ) : (
          <div
            className="grid gap-6"
            style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
          >
            {artists.map(artist => (
              <ContextMenu key={artist.name}>
                <ContextMenuTrigger asChild>
                  <div
                    className="group cursor-pointer"
                    onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}
                  >
                    {/* Profile skeleton — 1:1 aspect ratio */}
                    <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3 transition-transform group-hover:scale-[1.02]">
                      <div className="w-full h-full flex items-center justify-center bg-muted">
                        <Users size={40} className="text-muted-foreground/20" />
                      </div>
                    </div>

                    {/* Artist info */}
                    <p className="text-sm font-semibold truncate leading-snug mb-1">
                      {artist.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
                    </p>
                  </div>
                </ContextMenuTrigger>
                <ContextMenuContent className="w-48">
                  <ContextMenuItem onClick={() => navigate(`/artists/${encodeURIComponent(artist.name)}`)}>
                    Open Artist
                  </ContextMenuItem>
                  {onPlayArtist && (
                    <ContextMenuItem onClick={() => onPlayArtist(artist.name)}>
                      Play
                    </ContextMenuItem>
                  )}
                  {onPlayNext && (
                    <ContextMenuItem onClick={() => onPlayNext(artist.name)}>
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
                </ContextMenuContent>
              </ContextMenu>
            ))}
          </div>
        )}
      </div>
    </>
  )
}
