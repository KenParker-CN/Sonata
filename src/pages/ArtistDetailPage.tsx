import type { Track } from '@/types/music'
import { parseArtists } from '@/utils/parseArtists'
import { groupAlbums } from '@/utils/groupAlbums'
import { ArrowLeft, Users, Menu, Disc3 } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMemo } from 'react'
import TrackLockup from '@/components/TrackLockup'
import Shelf from '@/components/Shelf'

interface ArtistDetailPageProps {
  tracks: Track[]
  currentIndex: number
  onTrackSelect: (index: number) => void
  onOpenSidebar?: () => void
  onPlayNext?: (track: Track) => void
  onAddToPlaylist?: (trackId: string) => void
  onGoToAlbum?: (album: { name: string; albumArtist: string }) => void
  onGoToArtist?: (artistName: string) => void
  onRemoveFromLibrary?: (trackId: string) => void
}

export default function ArtistDetailPage({
  tracks,
  currentIndex,
  onTrackSelect,
  onOpenSidebar,
  onPlayNext,
  onAddToPlaylist,
  onGoToAlbum,
  onGoToArtist,
  onRemoveFromLibrary,
}: ArtistDetailPageProps) {
  const navigate = useNavigate()
  const { artistName } = useParams<{ artistName: string }>()

  // Decode URL params
  const decodedArtistName = artistName ? decodeURIComponent(artistName) : ''

  // Find all tracks where this artist appears
  const artistTracks = useMemo(() => {
    return tracks.filter(track => {
      const artists = parseArtists(track.artist)
      return artists.some(artist => artist === decodedArtistName)
    })
  }, [tracks, decodedArtistName])

  // Popular Tracks: stable selection sorted alphabetically, take first 12
  const popularTracks = useMemo(() => {
    const sorted = [...artistTracks].sort((a, b) => a.title.localeCompare(b.title))
    return sorted.slice(0, 12)
  }, [artistTracks])

  // Albums: where artist is in the albumArtist (parsed with parseArtists)
  const albums = useMemo(() => {
    const artistAsAlbumArtist = tracks.filter(t =>
      parseArtists(t.albumArtist).includes(decodedArtistName)
    )
    return groupAlbums(artistAsAlbumArtist)
  }, [tracks, decodedArtistName])

  // Appears On: where artist appears in track.artist but NOT in albumArtist
  const appearsOn = useMemo(() => {
    const appearsInTracks = tracks.filter(t => {
      const inTrackArtist = parseArtists(t.artist).includes(decodedArtistName)
      const inAlbumArtist = parseArtists(t.albumArtist).includes(decodedArtistName)
      return inTrackArtist && !inAlbumArtist
    })
    return groupAlbums(appearsInTracks)
  }, [tracks, decodedArtistName])

  if (artistTracks.length === 0) {
    return (
      <div className="px-6 pt-6">
        <button
          onClick={() => navigate('/artists')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Artists
        </button>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Users size={40} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">Artist not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-6 pb-8 relative">
      {/* Mobile menu button */}
      <button
        onClick={onOpenSidebar}
        className="lg:hidden absolute top-4 right-4 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Back button */}
      <button
        onClick={() => navigate('/artists')}
        aria-label="Back to artists"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Profile Section */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {/* Artist artwork placeholder */}
        <div className="w-32 h-32 sm:w-48 sm:h-48 shrink-0 rounded-md overflow-hidden bg-muted ring-1 ring-border/50 shadow-md mx-auto sm:mx-0">
          <div className="w-full h-full flex items-center justify-center bg-muted">
            <Users size={32} className="sm:w-[48px] sm:h-[48px] text-muted-foreground/30" />
          </div>
        </div>

        {/* Artist info */}
        <div className="flex flex-col justify-between h-auto sm:h-48 text-center sm:text-left">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Artist
          </p>
          <div className="space-y-2">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">{decodedArtistName}</h1>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-12">
        {/* Popular Tracks Section */}
        {popularTracks.length > 0 && (
          <section>
            <div className="overflow-hidden mb-4">
              <h2 
                className="text-xl font-semibold whitespace-nowrap hover:animate-marquee cursor-default inline-block"
                style={{ maxWidth: '100%' }}
              >
                Popular Tracks
              </h2>
            </div>
            <Shelf>
              <div className="flex gap-3 pb-2 px-1">
                {/* Group tracks into columns of 3 rows each */}
                {Array.from({ length: Math.ceil(popularTracks.length / 3) }).map((_, colIndex) => (
                  <div key={colIndex} className="flex flex-col gap-1 shrink-0 snap-start">
                    {popularTracks.slice(colIndex * 3, colIndex * 3 + 3).map(track => {
                      const trackIndex = tracks.indexOf(track)
                      const isActive = trackIndex === currentIndex

                      return (
                        <TrackLockup
                          key={track.id}
                          track={track}
                          isActive={isActive}
                          onClick={() => onTrackSelect(trackIndex)}
                          onPlayNext={onPlayNext}
                          onAddToPlaylist={onAddToPlaylist}
                          onGoToAlbum={onGoToAlbum}
                          onGoToArtist={onGoToArtist}
                          onRemoveFromLibrary={onRemoveFromLibrary}
                          showQualityBadge={false}
                        />
                      )
                    })}
                  </div>
                ))}
              </div>
            </Shelf>
          </section>
        )}

        {/* Albums Section */}
        {albums.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Albums</h2>
            <Shelf>
              <div className="flex gap-5 pb-2 px-1">
                {albums.map(album => (
                  <div
                    key={`${album.name}::${album.albumArtist}`}
                    className="group cursor-pointer shrink-0 w-[170px]"
                    onClick={() => navigate(`/albums/${encodeURIComponent(album.albumArtist)}/${encodeURIComponent(album.name)}`)}
                  >
                    {/* Cover — 1:1 aspect ratio */}
                    <div className="aspect-square rounded-md overflow-hidden bg-muted mb-2 ring-1 ring-border/50 shadow-sm transition-shadow group-hover:shadow-md">
                      {album.cover ? (
                        <img
                          src={album.cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Disc3 size={36} className="text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Album info */}
                    <p className="text-sm font-medium truncate leading-tight">
                      {album.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
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
                ))}
              </div>
            </Shelf>
          </section>
        )}

        {/* Appears On Section */}
        {appearsOn.length > 0 && (
          <section>
            <h2 className="text-xl font-semibold mb-4">Appears On</h2>
            <Shelf>
              <div className="flex gap-5 pb-2 px-1">
                {appearsOn.map(album => (
                  <div
                    key={`${album.name}::${album.albumArtist}`}
                    className="group cursor-pointer shrink-0 w-[170px]"
                    onClick={() => navigate(`/albums/${encodeURIComponent(album.albumArtist)}/${encodeURIComponent(album.name)}`)}
                  >
                    {/* Cover — 1:1 aspect ratio */}
                    <div className="aspect-square rounded-md overflow-hidden bg-muted mb-2 ring-1 ring-border/50 shadow-sm transition-shadow group-hover:shadow-md">
                      {album.cover ? (
                        <img
                          src={album.cover}
                          alt=""
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-muted">
                          <Disc3 size={36} className="text-muted-foreground/30" />
                        </div>
                      )}
                    </div>

                    {/* Album info */}
                    <p className="text-sm font-medium truncate leading-tight">
                      {album.name}
                    </p>
                    <p className="text-xs text-muted-foreground truncate mt-0.5">
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
                ))}
              </div>
            </Shelf>
          </section>
        )}
      </div>
    </div>
  )
}
