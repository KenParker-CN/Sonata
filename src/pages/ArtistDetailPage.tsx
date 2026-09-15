import { parseArtists } from '@/utils/parseArtists'
import { hasArtist } from '@/utils/groupArtists'
import { groupAlbums } from '@/utils/groupAlbums'
import { compareNames } from '@/utils/collate'
import { Users } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useMemo } from 'react'
import AlbumCard from '@/components/data/AlbumCard'
import ArtPicker from '@/components/media/ArtPicker'
import BackLink from '@/components/navigation/BackLink'
import NotFoundState from '@/components/feedback/NotFoundState'
import Shelf from '@/components/data/Shelf'
import TrackLockup from '@/components/data/TrackLockup'
import { artistArtId } from '@/services/customArt'
import { useApp } from '@/contexts/app'

export default function ArtistDetailPage() {
  const {
    tracks,
    playlists,
    currentTrackId,
    playFromContext,
    playTrackNext,
    addTrackToQueue,
    addTrackToPlaylist,
    removeFromLibrary,
  } = useApp()
  const { artistName } = useParams<{ artistName: string }>()

  // Decode URL params
  const decodedArtistName = artistName ? decodeURIComponent(artistName) : ''

  // Every track crediting this artist, by the same rule the Artists list counts with
  const artistTracks = useMemo(() => {
    return tracks.filter(track => hasArtist(track, decodedArtistName))
  }, [tracks, decodedArtistName])

  // The playback context for this page: the artist's tracks in library order.
  const artistTrackIds = useMemo(() => artistTracks.map(t => t.id), [artistTracks])

  // Popular Tracks: stable selection sorted alphabetically, take first 12
  const popularTracks = useMemo(() => {
    const sorted = [...artistTracks].sort((a, b) => compareNames(a.title, b.title))
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
      <NotFoundState
        title="Artist not found"
        icon={Users}
        to="/artists"
        backLabel="Back to artists"
      />
    )
  }

  return (
    <div className="page-gutter pt-6 pb-8">
      <BackLink to="/artists" label="Back to artists" />

      {/* Profile Section */}
      <div className="flex flex-col sm:flex-row gap-6 mb-8">
        {/* Artist artwork  — painted from the name until a custom image exists */}
        <ArtPicker
          name={decodedArtistName}
          upload={{ artId: artistArtId(decodedArtistName), noun: 'artist image' }}
          className="w-32 h-32 sm:w-48 sm:h-48 shrink-0 rounded-lg mx-auto sm:mx-0"
        />

        {/* Artist info */}
        <div className="flex flex-col justify-between h-auto sm:h-48 text-center sm:text-left">
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
                className="text-lg font-semibold tracking-tight whitespace-nowrap hover:animate-marquee cursor-default inline-block"
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
                    {popularTracks.slice(colIndex * 3, colIndex * 3 + 3).map(track => (
                      <TrackLockup
                        key={track.id}
                        track={track}
                        isActive={track.id === currentTrackId}
                        playlists={playlists}
                        onClick={() => playFromContext(
                          artistTrackIds,
                          artistTracks.findIndex(t => t.id === track.id),
                        )}
                        onPlayNext={playTrackNext}
                        onAddToQueue={addTrackToQueue}
                        onAddToPlaylist={addTrackToPlaylist}
                        links={{ album: true, composer: true }}
                        onRemoveFromLibrary={removeFromLibrary}
                        showQualityBadge={false}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </Shelf>
          </section>
        )}

        {/* Albums Section */}
        {albums.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold tracking-tight mb-4">Albums</h2>
            <Shelf>
              <div className="flex gap-6 pb-2 px-1">
                {albums.map(album => (
                  <AlbumCard
                    key={`${album.name}::${album.albumArtist}`}
                    album={album}
                    className="shrink-0 snap-start w-[220px]"
                  />
                ))}
              </div>
            </Shelf>
          </section>
        )}

        {/* Appears On Section */}
        {appearsOn.length > 0 && (
          <section>
            <h2 className="text-lg font-semibold tracking-tight mb-4">Appears On</h2>
            <Shelf>
              <div className="flex gap-6 pb-2 px-1">
                {appearsOn.map(album => (
                  <AlbumCard
                    key={`${album.name}::${album.albumArtist}`}
                    album={album}
                    className="shrink-0 snap-start w-[220px]"
                  />
                ))}
              </div>
            </Shelf>
          </section>
        )}
      </div>
    </div>
  )
}

