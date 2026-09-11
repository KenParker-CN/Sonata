import type { Track } from '@/types/music'
import TrackList from '@/components/TrackList'
import { LibraryBig, Menu, Plus, ArrowUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
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
  const [sortBy, setSortBy] = useState<'title' | 'artist' | 'album' | 'duration'>('title')
  const sortedTracks = useMemo(() => {
    return [...tracks].sort((a, b) => {
      if (sortBy === 'duration') return b.duration - a.duration
      const left = sortBy === 'title' ? a.title : sortBy === 'artist' ? a.artist : a.album
      const right = sortBy === 'title' ? b.title : sortBy === 'artist' ? b.artist : b.album
      return left.localeCompare(right, undefined, { sensitivity: 'base' })
    })
  }, [tracks, sortBy])
  const currentTrackId = tracks[currentIndex]?.id
  const sortedCurrentIndex = sortedTracks.findIndex(track => track.id === currentTrackId)

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
          <div className="flex min-h-[min(560px,calc(100svh-220px))] flex-col items-center justify-center px-6 py-16 text-center">
            <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-full border border-border bg-muted text-muted-foreground">
              <LibraryBig size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-xl font-semibold tracking-tight text-foreground">Build your music library</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Bring your local collection into one place for albums, artists, and focused listening.
            </p>
            <button
              type="button"
              onClick={onImportMusic}
              className="mt-6 inline-flex items-center gap-2 rounded-lg bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus size={16} />
              Import music
            </button>
            <p className="mt-3 text-xs text-muted-foreground">Choose audio files or a folder from your device</p>
          </div>
        ) : (
          <>
            <div className="mb-3 flex items-center justify-between gap-3 border-b border-border/70 pb-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                All Tracks
              </h2>
              <div className="flex items-center gap-3">
                <p className="text-xs text-muted-foreground">{tracks.length} {tracks.length === 1 ? 'track' : 'tracks'}</p>
                <label className="flex items-center gap-2 text-xs text-muted-foreground">
                  <ArrowUpDown size={14} aria-hidden="true" />
                  <span className="sr-only">Sort tracks by</span>
                  <select
                    value={sortBy}
                    onChange={event => setSortBy(event.target.value as typeof sortBy)}
                    aria-label="Sort tracks by"
                    className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                  >
                    <option value="title">Title</option>
                    <option value="artist">Artist</option>
                    <option value="album">Album</option>
                    <option value="duration">Longest first</option>
                  </select>
                </label>
              </div>
            </div>
            <TrackList
            tracks={sortedTracks}
            currentIndex={sortedCurrentIndex}
            onTrackSelect={index => {
              const originalIndex = tracks.findIndex(track => track.id === sortedTracks[index].id)
              if (originalIndex >= 0) onTrackSelect(originalIndex)
            }}
            onArtistClick={(artistName) => navigate(`/artists/${encodeURIComponent(artistName)}`)}
            onAlbumClick={(album) => navigate(`/albums/${encodeURIComponent(album.albumArtist)}/${encodeURIComponent(album.name)}`)}
            onPlayNext={onPlayNext}
            onAddToPlaylist={onAddToPlaylist}
            onGoToAlbum={onGoToAlbum}
            onGoToArtist={onGoToArtist}
            onRemoveFromLibrary={onRemoveFromLibrary}
            />
          </>
        )}
      </div>
    </>
  )
}
