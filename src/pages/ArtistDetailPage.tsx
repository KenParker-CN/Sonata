import { parseArtists } from '@/utils/parseArtists'
import { hasArtist } from '@/utils/groupArtists'
import { groupAlbums } from '@/utils/groupAlbums'
import { Users } from 'lucide-react'
import { useParams } from 'react-router-dom'
import { useMemo } from 'react'
import AlbumCard from '@/components/data/AlbumCard'
import ArtPicker from '@/components/media/ArtPicker'
import BackLink from '@/components/navigation/BackLink'
import NotFoundState from '@/components/feedback/NotFoundState'
import Shelf from '@/components/data/Shelf'
import { artistArtId } from '@/services/customArt'
import { useApp } from '@/contexts/app'
import WikiShortIntro from '@/components/data/WikiShortIntro'

export default function ArtistDetailPage() {
  const {
    tracks,
  } = useApp()
  const { artistName } = useParams<{ artistName: string }>()

  // Decode URL params
  const decodedArtistName = artistName ? decodeURIComponent(artistName) : ''

  // Every track crediting this artist, by the same rule the Artists list counts with
  const artistTracks = useMemo(() => {
    return tracks.filter(track => hasArtist(track, decodedArtistName))
  }, [tracks, decodedArtistName])

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
        <div className="flex min-w-0 flex-1 flex-col justify-between text-center sm:h-48 sm:text-left">
          <div className="space-y-2">
            <h1 className="text-xl sm:text-3xl font-bold tracking-tight">{decodedArtistName}</h1>
          </div>
        </div>
      </div>

      {/* Content Sections */}
      <div className="space-y-12">
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

      <div className="mt-10">
        <WikiShortIntro name={decodedArtistName} subject="artist" />
      </div>
    </div>
  )
}
