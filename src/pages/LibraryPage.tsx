import TrackList from '@/components/data/TrackList'
import { LibraryBig, Plus } from 'lucide-react'
import type { SortOption } from '@/hooks/useSort'
import type { Track } from '@/types/music'
import { applySort, useSort } from '@/hooks/useSort'
import { byDiscAndTrack, compareNames } from '@/utils/collate'
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

  return (
    <>
      <PageHeader title="Library" />

      {/* Content */}
      <div className="page-gutter pb-8">
        {tracks.length === 0 ? (
          <div className="flex min-h-[min(560px,calc(100svh-220px))] flex-col items-center justify-center px-6 py-16 text-center">
            <p className="section-kicker mb-4">A private listening space</p>
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-[1.5rem] border border-primary/20 bg-primary/10 text-primary shadow-[0_12px_30px_hsl(262_84%_58%_/_0.16)]">
              <LibraryBig size={28} strokeWidth={1.5} />
            </div>
            <h2 className="text-2xl font-semibold tracking-[-0.02em] text-foreground">Build your music library</h2>
            <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
              Bring your local collection into one place for albums, artists, and focused listening.
            </p>
            <button
              type="button"
              onClick={importMusic}
              className="mt-6 inline-flex items-center gap-2 rounded-full bg-primary px-6 py-3 text-sm font-semibold text-primary-foreground shadow-[0_8px_22px_hsl(262_84%_58%_/_0.28)] transition hover:-translate-y-0.5 hover:bg-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
            >
              <Plus size={16} />
              Add Music
            </button>
            <p className="mt-3 text-xs text-muted-foreground">Pick a folder of music from your device — it stays in your library after a reload</p>
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                All Tracks
              </h2>
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
