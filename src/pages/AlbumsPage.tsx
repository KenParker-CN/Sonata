import type { Album } from '@/utils/groupAlbums'
import type { SortOption } from '@/hooks/useSort'
import type { Track } from '@/types/music'
import { applySort, useSort } from '@/hooks/useSort'
import { useViewMode } from '@/hooks/useViewMode'
import { compareNames } from '@/utils/collate'
import { groupAlbums } from '@/utils/groupAlbums'
import { useMemo } from 'react'
import AlbumCard from '@/components/data/AlbumCard'
import CardGrid from '@/components/data/CardGrid'
import AlbumListRow from '@/components/data/AlbumListRow'
import PageHeader from '@/components/layout/PageHeader'
import EmptyState from '@/components/feedback/EmptyState'
import SearchInput from '@/components/navigation/SearchInput'
import SearchEmptyState from '@/components/feedback/SearchEmptyState'
import Shelf from '@/components/data/Shelf'
import SortSelect from '@/components/navigation/SortSelect'
import ViewModeToggle from '@/components/navigation/ViewModeToggle'
import { matchesSearch } from '@/utils/search'
import { useSearch } from '@/hooks/useSearch'
import { useApp } from '@/contexts/app'

type AlbumKey = 'name' | 'artist' | 'year' | 'tracks' | 'duration' | 'added'

const ALBUM_SORT_OPTIONS: SortOption<AlbumKey>[] = [
  { value: 'name', label: 'Name', natural: 'asc' },
  { value: 'artist', label: 'Artist', natural: 'asc' },
  { value: 'year', label: 'Release year', natural: 'desc' },
  { value: 'tracks', label: 'Tracks', natural: 'desc' },
  { value: 'duration', label: 'Duration', natural: 'desc' },
  { value: 'added', label: 'Recently added', natural: 'desc' },
]

// Everything the sort control can order albums by, resolved once per library
// change rather than once per render per card.
interface AlbumRow {
  album: Album
  year: number | null
  trackCount: number
  duration: number
  /** Highest library index the album occupies — imports append, so this is its arrival. */
  addedAt: number
}

const ALBUM_COMPARATORS: Record<AlbumKey, (a: AlbumRow, b: AlbumRow) => number> = {
  name: (a, b) => compareNames(a.album.name, b.album.name),
  artist: (a, b) => compareNames(a.album.albumArtist, b.album.albumArtist),
  // Untagged albums sit at year 0, below every dated release
  year: (a, b) => (a.year ?? 0) - (b.year ?? 0),
  tracks: (a, b) => a.trackCount - b.trackCount,
  duration: (a, b) => a.duration - b.duration,
  added: (a, b) => a.addedAt - b.addedAt,
}

const NAME_OF = (row: AlbumRow) => row.album.name

// The list view's right-aligned summary; an untagged year simply drops out
function albumMeta(row: AlbumRow): string {
  return [row.year, `${row.trackCount} ${row.trackCount === 1 ? 'track' : 'tracks'}`]
    .filter(Boolean)
    .join(' · ')
}

// Oldest tagged year wins, so a reissue stays where the original put it
function earliestYear(tracks: Track[], indices: number[]): number | null {
  let year: number | null = null
  for (const index of indices) {
    const tagged = Number(tracks[index].releaseDate?.slice(0, 4))
    if (!tagged) continue
    if (year === null || tagged < year) year = tagged
  }
  return year
}

export default function AlbumsPage() {
  const { tracks } = useApp()
  const sort = useSort('albums', ALBUM_SORT_OPTIONS, 'name')
  const [view, setView] = useViewMode('albums')

  const { albums, recentlyAdded } = useMemo(() => {
    const rows: AlbumRow[] = groupAlbums(tracks).map(album => {
      const albumTracks = album.trackIndices.map(i => tracks[i])
      return {
        album,
        year: earliestYear(tracks, album.trackIndices),
        trackCount: albumTracks.length,
        duration: albumTracks.reduce((total, track) => total + track.duration, 0),
        addedAt: Math.max(...album.trackIndices),
      }
    })
    return {
      albums: applySort(rows, sort, ALBUM_COMPARATORS, NAME_OF),
      // Newest first whatever the grid below is sorted by
      recentlyAdded: applySort(
        rows,
        { key: 'added', direction: 'desc' },
        ALBUM_COMPARATORS,
        NAME_OF,
      ).slice(0, 12),
    }
  }, [tracks, sort])

  // Filtering happens after the sort, so a query keeps the order on screen.
  const search = useSearch()
  const visible = useMemo(
    () =>
      search.terms.length === 0
        ? albums
        : albums.filter(row =>
            matchesSearch(search.terms, row.album.name, row.album.albumArtist),
          ),
    [albums, search.terms],
  )

  return (
    <>
      <PageHeader title="Albums" />

      <div className="page-gutter pb-8">
        {albums.length === 0 ? (
          <EmptyState
            title="No albums in your library yet."
            hint="Click “Add Music to import your library"
          />
        ) : (
          <>
            {albums.length > recentlyAdded.length && !search.active && (
              <section className="mb-10">
                <h2 className="text-lg font-semibold tracking-tight mb-4">
                  Recently Added
                </h2>
                <Shelf>
                  <div className="flex gap-6">
                    {recentlyAdded.map(({ album }) => (
                      <AlbumCard
                        key={`recent-${album.name}::${album.albumArtist}`}
                        album={album}
                        className="shrink-0 snap-start w-55"
                      />
                    ))}
                  </div>
                </Shelf>
              </section>
            )}

            <section>
              <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
                <h2 className="text-sm font-semibold tracking-tight text-foreground">
                  All Albums
                </h2>
                <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
                  <p className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? 'album' : 'albums'}</p>
                  <SortSelect label="Sort albums by" sort={sort} />
                  <ViewModeToggle label="Albums view" value={view} onChange={setView} />
                  <SearchInput label="Search albums" value={search.query} onChange={search.setQuery} />
                </div>
              </div>
              {visible.length === 0 ? (
                <SearchEmptyState query={search.query} onClear={() => search.setQuery('')} />
              ) : view === 'grid' ? (
                <CardGrid>
                  {visible.map(({ album }) => (
                    <AlbumCard
                      key={`${album.name}::${album.albumArtist}`}
                      album={album}
                    />
                  ))}
                </CardGrid>
              ) : (
                <div className="flex flex-col">
                  {visible.map(row => (
                    <AlbumListRow
                      key={`${row.album.name}::${row.album.albumArtist}`}
                      album={row.album}
                      meta={albumMeta(row)}
                    />
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
