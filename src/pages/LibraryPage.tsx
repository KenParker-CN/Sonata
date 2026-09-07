import type { Track } from '@/types/music'
import TrackList from '@/components/TrackList'
import { LibraryBig, Menu, Plus } from 'lucide-react'
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
  onImportMusic?: () => void
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
  onImportMusic,
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
          aria-label="Open navigation"
          className="lg:hidden absolute top-4 right-4 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Library</h1>
        <p className="text-sm text-muted-foreground mt-1">Your music</p>
      </div>

      {/* Content */}
      <div className="px-4 pb-8 sm:px-6">
        {tracks.length === 0 ? (
          <div className="relative isolate flex min-h-[min(560px,calc(100svh-220px))] items-center justify-center overflow-hidden rounded-2xl border border-border/70 bg-card/45 px-6 py-16 text-center shadow-[inset_0_1px_0_hsl(36_24%_94%_/_0.03)]">
            <div className="pointer-events-none absolute -right-24 -top-28 -z-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
            <div className="pointer-events-none absolute -bottom-40 -left-24 -z-10 h-80 w-80 rounded-full bg-primary/5 blur-3xl" />
            <div className="flex max-w-md flex-col items-center">
              <div className="mb-7 flex h-20 w-20 items-center justify-center rounded-2xl border border-primary/25 bg-primary/10 text-primary shadow-[0_0_60px_hsl(38_88%_62%_/_0.12)]">
                <LibraryBig size={36} strokeWidth={1.4} />
              </div>
              <p className="text-xs font-semibold uppercase tracking-[0.24em] text-primary/80">Your listening room</p>
              <h2 className="mt-3 text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">Build your music library</h2>
              <p className="mt-3 max-w-sm text-sm leading-6 text-muted-foreground">Bring your local collection into one calm space for albums, artists, and focused listening.</p>
              <button
                type="button"
                onClick={onImportMusic}
                className="mt-7 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-3 text-sm font-semibold text-primary-foreground shadow-[0_10px_28px_hsl(38_88%_62%_/_0.16)] transition hover:brightness-105 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Plus size={17} />
                Import music
              </button>
              <p className="mt-4 text-xs text-muted-foreground/75">Choose audio files or a folder from your device</p>
            </div>
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
