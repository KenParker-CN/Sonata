import { groupAlbums } from '@/utils/groupAlbums'
import { hasComposer } from '@/utils/groupComposers'
import { byDiscAndTrack, compareNames } from '@/utils/collate'
import { formatTime, formatDurationLong } from '@/utils/formatTime'
import { albumPath } from '@/utils/routes'
import { PenLine } from 'lucide-react'
import { Link, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import AlbumContextMenu from '@/components/context-menus/AlbumContextMenu'
import ArtPicker from '@/components/media/ArtPicker'
import ArtistLinks from '@/components/data/ArtistLinks'
import BackLink from '@/components/navigation/BackLink'
import GeneratedArt from '@/components/media/GeneratedArt'
import NotFoundState from '@/components/feedback/NotFoundState'
import PlayButton from '@/components/media/PlayButton'
import SearchInput from '@/components/navigation/SearchInput'
import SearchEmptyState from '@/components/feedback/SearchEmptyState'
import TrackList from '@/components/data/TrackList'
import { composerArtId } from '@/services/customArt'
import { matchesSearch } from '@/utils/search'
import { useSearch } from '@/hooks/useSearch'
import { useApp } from '@/contexts/app'
import WikiShortIntro from '@/components/data/WikiShortIntro'

export default function ComposerDetailPage() {
  const {
    tracks,
    playlists,
    currentTrackId,
    playFromContext,
    playComposer,
    playTrackNext,
    addTrackToQueue,
    addTrackToPlaylist,
    removeFromLibrary,
    playAlbum,
    playAlbumNext,
    addAlbumToPlaylist,
    removeAlbumFromLibrary,
  } = useApp()
  const { composerName } = useParams<{ composerName: string }>()
  // One query, two lists: the works table and the track table filter together.
  const search = useSearch()

  // Decode URL params
  const decodedComposerName = composerName ? decodeURIComponent(composerName) : ''

  // Every track naming this composer, including the shared "Beethoven; Mozart" tags
  const composerTracks = useMemo(() => {
    return tracks.filter(track => hasComposer(track, decodedComposerName))
  }, [tracks, decodedComposerName])

  // Albums (works) by this composer
  const albums = useMemo(() => groupAlbums(composerTracks), [composerTracks])

  // Per-work counts and lengths, plus the header total. `trackIndices` are
  // positions in composerTracks, which groupAlbums was called with.
  const { works, totalDuration } = useMemo(() => ({
    totalDuration: composerTracks.reduce((sum, t) => sum + t.duration, 0),
    works: albums.map(album => ({
      album,
      trackCount: album.trackIndices.length,
      duration: album.trackIndices.reduce((sum, i) => sum + composerTracks[i].duration, 0),
    })),
  }), [albums, composerTracks])

  // Tracks sorted by album order (album  — disc  — track number)
  const orderedTracks = useMemo(() => {
    return [...composerTracks].sort((a, b) => {
      const albumCmp =
        compareNames(a.albumArtist, b.albumArtist) || compareNames(a.album, b.album)
      if (albumCmp !== 0) return albumCmp
      return byDiscAndTrack(a, b)
    })
  }, [composerTracks])

  // One query narrows both tables, each against its own names.
  const { visibleWorks, visibleTracks } = useMemo(() => ({
    visibleWorks: search.terms.length === 0
      ? works
      : works.filter(({ album }) => matchesSearch(search.terms, album.name, album.albumArtist)),
    visibleTracks: search.terms.length === 0
      ? orderedTracks
      : orderedTracks.filter(track =>
          matchesSearch(search.terms, track.title, track.album, track.artist),
        ),
  }), [works, orderedTracks, search.terms])
  const visibleTrackIds = useMemo(() => visibleTracks.map(t => t.id), [visibleTracks])
  const recordingsPerPage = 20
  const recordingsPageCount = Math.max(1, Math.ceil(visibleTracks.length / recordingsPerPage))
  const [recordingsPage, setRecordingsPage] = useState(1)
  const currentRecordingsPage = Math.min(recordingsPage, recordingsPageCount)
  const recordingsPageStart = (currentRecordingsPage - 1) * recordingsPerPage
  const pagedRecordings = visibleTracks.slice(recordingsPageStart, recordingsPageStart + recordingsPerPage)

  if (composerTracks.length === 0) {
    return (
      <NotFoundState
        title="Composer not found"
        icon={PenLine}
        to="/composers"
        backLabel="Back to composers"
      />
    )
  }

  return (
    <div className="page-gutter pt-6 pb-8">
      <BackLink to="/composers" label="Back to composers" />

      {/* Compact header  — the name is the identity; the avatar is a portrait once uploaded */}
      <div className="mb-10">
        <div className="flex flex-wrap items-end justify-between gap-4 mt-1">
          <div className="flex min-w-0 items-start gap-4">
            <ArtPicker
              name={decodedComposerName}
              upload={{ artId: composerArtId(decodedComposerName), noun: 'composer portrait' }}
              className="w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-full mx-0"
            />
            <div className="min-w-0 flex-1">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight truncate">
                {decodedComposerName}
              </h1>
              <p className="text-sm text-muted-foreground mt-2">
                {albums.length} {albums.length === 1 ? 'work' : 'works'} ·{' '}
                {composerTracks.length} {composerTracks.length === 1 ? 'recording' : 'recordings'} ·{' '}
                {formatDurationLong(totalDuration)}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 flex-wrap items-center gap-3">
            <SearchInput label="Search works and recordings" value={search.query} onChange={search.setQuery} />
            <PlayButton
              onClick={() => playComposer(decodedComposerName)}
              label={`Play recordings by ${decodedComposerName}`}
              className="shrink-0"
            />
          </div>
        </div>
      </div>

      {search.active && visibleWorks.length === 0 && visibleTracks.length === 0 && (
        <SearchEmptyState query={search.query} onClear={() => search.setQuery('')} />
      )}

      {/* Recordings grouped by album */}
      {visibleWorks.length > 0 && (
        <section className="mb-10">
          <h2 className="text-sm font-semibold tracking-tight mb-3">Recordings in albums</h2>
          <div className="flex flex-col -mx-2">
            {visibleWorks.map(({ album, trackCount, duration }) => (
              <AlbumContextMenu
                key={`${album.name}::${album.albumArtist}`}
                album={album}
                playlists={playlists}
                onPlayAlbum={playAlbum}
                onPlayNext={playAlbumNext}
                onAddToPlaylist={addAlbumToPlaylist}
                onRemoveFromLibrary={removeAlbumFromLibrary}
              >
                <div className="group relative flex items-center gap-3 px-2 py-2 rounded-md transition-colors hover:bg-accent/50">
                  <GeneratedArt
                    name={`${album.name} ${album.albumArtist}`}
                    src={album.cover}
                    className="h-12 w-12 shrink-0 rounded"
                  />

                  {/* Album info */}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium truncate">{album.name}</p>
                    <ArtistLinks artists={album.albumArtists} className="relative z-10" />
                  </div>

                  {/* Meta */}
                  <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
                    {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                  </span>
                  <span className="hidden sm:block shrink-0 w-16 text-right text-xs text-muted-foreground tabular-nums">
                    {formatTime(duration)}
                  </span>

                  {/* Stretched link  — the row's own click target, layered behind
                      the z-raised artist links so both stay clickable without
                      nested <a>. */}
                  <Link
                    to={albumPath(album.name, album.albumArtist)}
                    aria-label={album.name}
                    className="absolute inset-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
                  />
                </div>
              </AlbumContextMenu>
            ))}
          </div>
        </section>
      )}

      {/* Individual recordings with pagination */}
      {visibleTracks.length > 0 && (
        <section>
          <div className="mb-3 flex items-center justify-between gap-4">
            <h2 className="text-sm font-semibold tracking-tight">Recordings</h2>
            <span className="text-xs text-muted-foreground tabular-nums">
              {visibleTracks.length} {visibleTracks.length === 1 ? 'recording' : 'recordings'}
            </span>
          </div>
          <TrackList
            tracks={pagedRecordings}
            currentTrackId={currentTrackId}
            playlists={playlists}
            onTrackSelect={index => playFromContext(visibleTrackIds, recordingsPageStart + index)}
            onPlayNext={playTrackNext}
            onAddToQueue={addTrackToQueue}
            onAddToPlaylist={addTrackToPlaylist}
            links={{ album: true, artist: true }}
            onRemoveFromLibrary={removeFromLibrary}
          />
          {recordingsPageCount > 1 && (
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                disabled={currentRecordingsPage === 1}
                onClick={() => setRecordingsPage(page => Math.max(1, page - 1))}
              >
                Previous
              </button>
              <span className="text-xs tabular-nums text-muted-foreground">
                Page {currentRecordingsPage} of {recordingsPageCount}
              </span>
              <button
                type="button"
                className="rounded-md border border-border px-3 py-1.5 text-xs font-medium transition-colors hover:bg-accent disabled:pointer-events-none disabled:opacity-40"
                disabled={currentRecordingsPage === recordingsPageCount}
                onClick={() => setRecordingsPage(page => Math.min(recordingsPageCount, page + 1))}
              >
                Next
              </button>
            </div>
          )}
        </section>
      )}

      <div className="mt-10">
        <WikiShortIntro name={decodedComposerName} subject="composer" />
      </div>
    </div>
  )
}
