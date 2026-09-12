import type { Artist } from '@/utils/groupArtists'
import type { SortOption } from '@/hooks/useSort'
import { applySort, useSort } from '@/hooks/useSort'
import { compareNames } from '@/utils/collate'
import { groupArtists } from '@/utils/groupArtists'
import { useMemo } from 'react'
import { useViewMode } from '@/hooks/useViewMode'
import ArtistCard from '@/components/ArtistCard'
import ArtistListRow from '@/components/ArtistListRow'
import CardGrid from '@/components/CardGrid'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import SearchEmptyState from '@/components/SearchEmptyState'
import Shelf from '@/components/Shelf'
import SortSelect from '@/components/SortSelect'
import ViewModeToggle from '@/components/ViewModeToggle'
import { matchesSearch } from '@/utils/search'
import { useSearch } from '@/hooks/useSearch'
import { useApp } from '@/contexts/app'

type ArtistKey = 'name' | 'tracks' | 'albums' | 'duration'

const ARTIST_SORT_OPTIONS: SortOption<ArtistKey>[] = [
  { value: 'name', label: 'Name', natural: 'asc' },
  { value: 'tracks', label: 'Tracks', natural: 'desc' },
  { value: 'albums', label: 'Albums', natural: 'desc' },
  { value: 'duration', label: 'Duration', natural: 'desc' },
]

// Each comparator is the ascending side only — the direction lives in useSort
const ARTIST_COMPARATORS: Record<ArtistKey, (a: Artist, b: Artist) => number> = {
  name: (a, b) => compareNames(a.name, b.name),
  tracks: (a, b) => a.trackCount - b.trackCount,
  albums: (a, b) => a.albumCount - b.albumCount,
  duration: (a, b) => a.duration - b.duration,
}

const NAME_OF = (artist: Artist) => artist.name

export default function ArtistsPage() {
  const { tracks } = useApp()
  const sort = useSort('artists', ARTIST_SORT_OPTIONS, 'name')
  const [view, setView] = useViewMode('artists')
  const grouped = useMemo(() => groupArtists(tracks), [tracks])

  const artists = useMemo(
    () => applySort(grouped, sort, ARTIST_COMPARATORS, NAME_OF),
    [grouped, sort],
  )

  // Filtering happens after the sort, so a query keeps the order on screen.
  const search = useSearch()
  const visible = useMemo(
    () =>
      search.terms.length === 0
        ? artists
        : artists.filter(artist => matchesSearch(search.terms, artist.name)),
    [artists, search.terms],
  )

  // Artists have no artwork, so "recently added" carries no visual signal — the
  // shelf surfaces the busiest artists instead, whatever the grid is sorted by.
  const topArtists = useMemo(
    () =>
      applySort(grouped, { key: 'tracks', direction: 'desc' }, ARTIST_COMPARATORS, NAME_OF).slice(
        0,
        12,
      ),
    [grouped],
  )

  return (
    <>
      <PageHeader title="Artists" />

      <div className="page-gutter pb-8">
        {artists.length === 0 ? (
          <EmptyState
            title="No artists in your library yet."
            hint="Click “Add Music” to import your library"
          />
        ) : (
          <>
            {artists.length > topArtists.length && !search.active && (
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
                        className="shrink-0 snap-start w-[220px]"
                      />
                    ))}
                  </div>
                </Shelf>
              </section>
            )}

            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  All Artists
                </h2>
                <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
                  <p className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? 'artist' : 'artists'}</p>
                  <SortSelect label="Sort artists by" sort={sort} />
                  <ViewModeToggle label="Artists view" value={view} onChange={setView} />
                  <SearchInput label="Search artists" value={search.query} onChange={search.setQuery} />
                </div>
              </div>
              {visible.length === 0 ? (
                <SearchEmptyState query={search.query} onClear={() => search.setQuery('')} />
              ) : view === 'grid' ? (
                <CardGrid>
                  {visible.map(artist => (
                    <ArtistCard key={artist.name} artist={artist} />
                  ))}
                </CardGrid>
              ) : (
                <div className="flex flex-col">
                  {visible.map(artist => (
                    <ArtistListRow key={artist.name} artist={artist} />
                  ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </>
  )
}
