import TrackList from '@/components/data/TrackList'
import { Clock3, Disc3, LibraryBig, ListMusic, MicVocal, PenLine, Plus, type LucideIcon } from 'lucide-react'
import { Card, CardContent, Button, Stack, Typography } from '@mui/material'
import type { SortOption } from '@/hooks/useSort'
import type { Track } from '@/types/music'
import { applySort, useSort } from '@/hooks/useSort'
import { byDiscAndTrack, compareNames } from '@/utils/collate'
import { formatDurationLong } from '@/utils/formatTime'
import { albumKey } from '@/utils/groupAlbums'
import { trackArtists } from '@/utils/groupArtists'
import { trackComposers } from '@/utils/groupComposers'
import { useMemo } from 'react'
import PageHeader from '@/components/layout/PageHeader'
import SearchInput from '@/components/navigation/SearchInput'
import SearchEmptyState from '@/components/feedback/SearchEmptyState'
import SortSelect from '@/components/navigation/SortSelect'
import { matchesSearch } from '@/utils/search'
import { useSearch } from '@/hooks/useSearch'
import { useApp } from '@/contexts/app'

type TrackKey = 'title' | 'artist' | 'album' | 'duration'

const TRACK_SORT_OPTIONS: SortOption<TrackKey>[] = [
  { value: 'title', label: 'Title', natural: 'asc' },
  { value: 'artist', label: 'Artist', natural: 'asc' },
  { value: 'album', label: 'Album', natural: 'asc' },
  { value: 'duration', label: 'Duration', natural: 'desc' },
]

// Tracks that tie on the chosen field stay in listening order, so sorting by
// album or artist still reads as an album rather than a shuffled list.
const TRACK_COMPARATORS: Record<TrackKey, (a: Track, b: Track) => number> = {
  title: (a, b) => compareNames(a.title, b.title),
  artist: (a, b) =>
    compareNames(a.artist, b.artist) ||
    compareNames(a.album, b.album) ||
    byDiscAndTrack(a, b),
  album: (a, b) => compareNames(a.album, b.album) || byDiscAndTrack(a, b),
  duration: (a, b) => a.duration - b.duration,
}

const NAME_OF = (track: Track) => track.title

type MetricCardProps = {
  label: string
  value: string
  icon: LucideIcon
}

function MetricCard({label, value, icon: Icon}: MetricCardProps) {
  return (
    <Card variant="outlined" className="min-w-0">
      <CardContent className="flex items-center gap-3 !p-4 last:!pb-4">
        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
          <Icon size={18} aria-hidden="true" />
        </div>
        <div className="min-w-0">
          <Typography variant="caption" color="text.secondary" noWrap>
            {label}
          </Typography>
          <Typography variant="h6" component="p" noWrap sx={{fontWeight: 700}}>
            {value}
          </Typography>
        </div>
      </CardContent>
    </Card>
  )
}

export default function LibraryPage() {
  const {
    tracks,
    playlists,
    currentTrackId,
    playFromContext,
    playTrackNext,
    addTrackToQueue,
    addTrackToPlaylist,
    removeFromLibrary,
    importMusic,
  } = useApp()
  const sort = useSort('library', TRACK_SORT_OPTIONS, 'title')
  const sortedTracks = useMemo(
    () => applySort(tracks, sort, TRACK_COMPARATORS, NAME_OF),
    [tracks, sort],
  )
  // Filtering happens after the sort, so a query keeps the order on screen.
  const search = useSearch()
  const visibleTracks = useMemo(
    () =>
      search.terms.length === 0
        ? sortedTracks
        : sortedTracks.filter(track =>
            matchesSearch(
              search.terms,
              track.title,
              track.artist,
              track.album,
              track.albumArtist,
              track.composer,
            ),
          ),
    [sortedTracks, search.terms],
  )
  // The playback context for this page: the visible tracks, in the visible order.
  const visibleTrackIds = useMemo(() => visibleTracks.map(t => t.id), [visibleTracks])
  const metrics = useMemo(() => {
    const albums = new Set<string>()
    const artists = new Set<string>()
    const composers = new Set<string>()
    let duration = 0

    for (const track of tracks) {
      albums.add(albumKey(track))
      trackArtists(track).forEach(name => artists.add(name))
      trackComposers(track).forEach(name => composers.add(name))
      duration += track.duration
    }

    return {
      tracks: tracks.length.toLocaleString(),
      albums: albums.size.toLocaleString(),
      artists: artists.size.toLocaleString(),
      composers: composers.size.toLocaleString(),
      duration: formatDurationLong(duration),
    }
  }, [tracks])

  return (
    <>
      <PageHeader title="Library" />

      {/* Content */}
      <div className="page-gutter pb-8">
        {tracks.length === 0 ? (
          <Card variant="outlined" className="mx-auto my-10 max-w-2xl">
            <CardContent className="flex flex-col items-center px-6 py-14 text-center sm:px-12">
              <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                <LibraryBig size={28} strokeWidth={1.5} />
              </div>
              <Typography variant="overline" color="primary" sx={{fontWeight: 700, letterSpacing: '0.16em'}}>
                Your personal music library
              </Typography>
              <Typography component="h2" variant="h4" sx={{mt: 1, fontWeight: 700, letterSpacing: '-0.03em'}}>
                Start with your collection
              </Typography>
              <Typography color="text.secondary" sx={{mt: 1, maxWidth: 440}}>
                Import a music folder to organize albums, artists, composers and focused listening in one place.
              </Typography>
              <Button
                type="button"
                onClick={importMusic}
                variant="contained"
                size="large"
                startIcon={<Plus size={18} />}
                sx={{mt: 4, borderRadius: 999, px: 3}}
              >
                Add Music
              </Button>
              <Typography variant="caption" color="text.secondary" sx={{mt: 2}}>
                Your files stay on your device after import.
              </Typography>
            </CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-3 pb-6 sm:grid-cols-3 lg:grid-cols-5">
              <MetricCard label="Tracks" value={metrics.tracks} icon={ListMusic} />
              <MetricCard label="Albums" value={metrics.albums} icon={Disc3} />
              <MetricCard label="Artists" value={metrics.artists} icon={MicVocal} />
              <MetricCard label="Composers" value={metrics.composers} icon={PenLine} />
              <MetricCard label="Listening time" value={metrics.duration} icon={Clock3} />
            </div>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <Stack spacing={0.25}>
                <Typography variant="h6" component="h2" sx={{fontWeight: 700}}>
                  All Tracks
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Browse and manage your collection
                </Typography>
              </Stack>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
                <p className="text-xs text-muted-foreground">{visibleTracks.length} {visibleTracks.length === 1 ? 'track' : 'tracks'}</p>
                <SortSelect label="Sort tracks by" sort={sort} />
                <SearchInput label="Search tracks" value={search.query} onChange={search.setQuery} />
              </div>
            </div>
            {visibleTracks.length === 0 ? (
              <SearchEmptyState query={search.query} onClear={() => search.setQuery('')} />
            ) : (
              <TrackList
                tracks={visibleTracks}
                currentTrackId={currentTrackId}
                playlists={playlists}
                onTrackSelect={index => playFromContext(visibleTrackIds, index)}
                onPlayNext={playTrackNext}
                onAddToQueue={addTrackToQueue}
                onAddToPlaylist={addTrackToPlaylist}
                onRemoveFromLibrary={removeFromLibrary}
              />
            )}
          </>
        )}
      </div>
    </>
  )
}
