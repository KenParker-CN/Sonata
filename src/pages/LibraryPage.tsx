import type { Track } from '@/types/music'
import TrackList from '@/components/TrackList'
import { Menu } from 'lucide-react'
import { useNavigate } from 'react-router-dom'

interface LibraryPageProps {
  tracks: Track[]
  currentIndex: number
  onTrackSelect: (index: number) => void
  onPlayNext?: (track: Track) => void
  onAddToPlaylist?: (trackId: string) => void
  onGoToAlbum?: (album: { name: string; albumArtist: string }) => void
  onGoToArtist?: (artistName: string) => void
  onRemoveFromLibrary?: (trackId: string) => void
  onOpenSidebar?: () => void
}

export default function LibraryPage({ 
  tracks, 
  currentIndex, 
  onTrackSelect, 
  onPlayNext,
  onAddToPlaylist,
  onGoToAlbum,
  onGoToArtist,
  onRemoveFromLibrary,
  onOpenSidebar 
}: LibraryPageProps) {
  const navigate = useNavigate()
  
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
        <h1 className="text-2xl font-bold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Your music</p>
      </div>

      {/* Content */}
      <div className="px-4 pb-4">
        {tracks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <p className="text-lg font-medium">No music yet</p>
            <p className="text-sm mt-1">Click "Add Music" to import your library</p>
          </div>
        ) : (
          <TrackList
            tracks={tracks}
            currentIndex={currentIndex}
            onTrackSelect={onTrackSelect}
            onArtistClick={(artistName) => navigate(`/artists/${encodeURIComponent(artistName)}`)}
            onAlbumClick={(album) => navigate(`/albums/${encodeURIComponent(album.albumArtist)}/${encodeURIComponent(album.name)}`)}
            onPlayNext={onPlayNext}
            onAddToPlaylist={onAddToPlaylist}
            onGoToAlbum={onGoToAlbum}
            onGoToArtist={onGoToArtist}
            onRemoveFromLibrary={onRemoveFromLibrary}
          />
        )}
      </div>
    </>
  )
}
