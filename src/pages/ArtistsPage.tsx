import type { Track } from '@/types/music'
import type { Artist } from '@/utils/groupArtists'
import { groupArtists } from '@/utils/groupArtists'
import { Users, Menu, ArrowUpDown } from 'lucide-react'
import { useMemo, useState } from 'react'
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
import Shelf from '@/components/Shelf'

interface ArtistsPageProps {
  tracks: Track[]
  onPlayArtist?: (artistName: string) => void
  onPlayNext?: (artistName: string) => void
  onAddToPlaylist?: (artistName: string) => void
  onOpenSidebar?: () => void
}

interface ArtistCardProps {
  artist: Artist
  onPlayArtist?: (artistName: string) => void
  onPlayNext?: (artistName: string) => void
  onAddToPlaylist?: (artistName: string) => void
  className?: string
}

// Shared by the "Top Artists" shelf and the full grid so both carry the same context menu.
function ArtistCard({ artist, onPlayArtist, onPlayNext, onAddToPlaylist, className }: ArtistCardProps) {
  const navigate = useNavigate()

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <div
          className={className}
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
  )
}

export default function ArtistsPage({
  tracks,
  onPlayArtist,
  onPlayNext,
  onAddToPlaylist,
  onOpenSidebar
}: ArtistsPageProps) {
  const [sortBy, setSortBy] = useState<'name' | 'mostTracks' | 'fewestTracks'>('name')
  const artists = useMemo(() => {
    const groupedArtists = groupArtists(tracks)
    return groupedArtists.sort((a, b) => {
      if (sortBy === 'mostTracks') return b.trackCount - a.trackCount || a.name.localeCompare(b.name)
      if (sortBy === 'fewestTracks') return a.trackCount - b.trackCount || a.name.localeCompare(b.name)
      return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' })
    })
  }, [tracks, sortBy])

  // Artists have no artwork, so "recently added" carries no visual signal — the
  // shelf surfaces the busiest artists instead.
  const topArtists = useMemo(
    () => groupArtists(tracks).sort((a, b) => b.trackCount - a.trackCount || a.name.localeCompare(b.name)).slice(0, 12),
    [tracks]
  )

  const cardHandlers = { onPlayArtist, onPlayNext, onAddToPlaylist }

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
          <>
            {artists.length > topArtists.length && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold tracking-tight mb-4">
                  Top Artists
                </h2>
                <Shelf>
                  <div className="flex gap-6">
                    {topArtists.map(artist => (
                      <ArtistCard
                        key={`top-${artist.name}`}
                        artist={artist}
                        {...cardHandlers}
                        className="group cursor-pointer shrink-0 snap-start w-[220px]"
                      />
                    ))}
                  </div>
                </Shelf>
              </section>
            )}

            <section>
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-border/70 pb-3">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  All Artists
                </h2>
                <div className="flex items-center gap-3">
                  <p className="text-xs text-muted-foreground">{artists.length} {artists.length === 1 ? 'artist' : 'artists'}</p>
                  <label className="flex items-center gap-2 text-xs text-muted-foreground">
                    <ArrowUpDown size={14} aria-hidden="true" />
                    <span className="sr-only">Sort artists by</span>
                    <select
                      value={sortBy}
                      onChange={event => setSortBy(event.target.value as typeof sortBy)}
                      aria-label="Sort artists by"
                      className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs text-foreground outline-none transition focus:ring-2 focus:ring-ring"
                    >
                      <option value="name">Name</option>
                      <option value="mostTracks">Most tracks</option>
                      <option value="fewestTracks">Fewest tracks</option>
                    </select>
                  </label>
                </div>
              </div>
              <div
                className="grid gap-6"
                style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
              >
                {artists.map(artist => (
                  <ArtistCard
                    key={artist.name}
                    artist={artist}
                    {...cardHandlers}
                    className="group cursor-pointer"
                  />
                ))}
              </div>
            </section>
          </>
        )}
      </div>
    </>
  )
}
