import { ListMusic, Plus } from 'lucide-react'
import type { Playlist } from '@/types/music'
import type { SortOption } from '@/hooks/useSort'
import { applySort, useSort } from '@/hooks/useSort'
import { compareNames } from '@/utils/collate'
import { formatDate } from '@/utils/formatDate'
import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { playlistPath } from '@/utils/routes'
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'
import CardGrid from '@/components/CardGrid'
import CoverArt from '@/components/CoverArt'
import EmptyState from '@/components/EmptyState'
import EntityMenuContent from '@/components/EntityContextMenu'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import SearchEmptyState from '@/components/SearchEmptyState'
import { DeletePlaylistDialog } from '@/components/PlaylistDialogs'
import SortSelect from '@/components/SortSelect'
import { matchesSearch } from '@/utils/search'
import { useSearch } from '@/hooks/useSearch'
import { playlistArtId } from '@/services/customArt'
import { useApp } from '@/contexts/app'

type PlaylistKey = 'name' | 'tracks' | 'duration' | 'created'

const PLAYLIST_SORT_OPTIONS: SortOption<PlaylistKey>[] = [
  { value: 'name', label: 'Name', natural: 'asc' },
  { value: 'tracks', label: 'Tracks', natural: 'desc' },
  { value: 'duration', label: 'Duration', natural: 'desc' },
  { value: 'created', label: 'Recently created', natural: 'desc' },
]

const PLAYLIST_COMPARATORS: Record<
  PlaylistKey,
  (a: PlaylistRow, b: PlaylistRow) => number
> = {
  name: (a, b) => compareNames(a.playlist.name, b.playlist.name),
  tracks: (a, b) => a.trackCount - b.trackCount,
  duration: (a, b) => a.duration - b.duration,
  // Playlists stored before timestamps were recorded read as the oldest
  created: (a, b) => (a.playlist.createdAt ?? 0) - (b.playlist.createdAt ?? 0),
}

interface PlaylistRow {
  playlist: Playlist
  covers: string[]
  trackCount: number
  duration: number
}

const NAME_OF = (row: PlaylistRow) => row.playlist.name

export default function PlaylistsPage() {
  const {
    playlists,
    trackById,
    artUrls,
    requestCreatePlaylist,
    deletePlaylist,
    playPlaylist,
  } = useApp()
  const sort = useSort('playlists', PLAYLIST_SORT_OPTIONS, 'name')
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)

  // Cover list feeds the tile's mosaic: every entry that carries artwork, in
  // playlist order. Count keeps duplicates the playlist holds but drops entries
  // that left the library.
  const cards = useMemo(() => {
    const rows: PlaylistRow[] = playlists.map(playlist => {
      const covers: string[] = []
      let trackCount = 0
      let duration = 0
      for (const trackId of playlist.trackIds) {
        const track = trackById.get(trackId)
        if (!track) continue
        trackCount++
        duration += track.duration
        if (track.cover) covers.push(track.cover)
      }
      return { playlist, covers, trackCount, duration }
    })
    return applySort(rows, sort, PLAYLIST_COMPARATORS, NAME_OF)
  }, [playlists, trackById, sort])

  // Filtering happens after the sort, so a query keeps the order on screen.
  const search = useSearch()
  const visible = useMemo(
    () =>
      search.terms.length === 0
        ? cards
        : cards.filter(({ playlist }) =>
            matchesSearch(search.terms, playlist.name, playlist.description),
          ),
    [cards, search.terms],
  )

  return (
    <>
      <PageHeader title="Playlists" />

      {/* Content */}
      <div className="page-gutter pb-8">
        {playlists.length === 0 ? (
          <EmptyState
            title="No playlists yet."
            hint="Create a playlist to organize your music."
            icon={ListMusic}
            action={
              <button
                type="button"
                onClick={requestCreatePlaylist}
                className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Plus size={16} aria-hidden="true" />
                New Playlist
              </button>
            }
          />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                All Playlists
              </h2>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
                <p className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? 'playlist' : 'playlists'}</p>
                <button
                  type="button"
                  onClick={requestCreatePlaylist}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <Plus size={16} aria-hidden="true" />
                  New Playlist
                </button>
                <SortSelect label="Sort playlists by" sort={sort} />
                <SearchInput label="Search playlists" value={search.query} onChange={search.setQuery} />
              </div>
            </div>

            {visible.length === 0 ? (
              <SearchEmptyState query={search.query} onClear={() => search.setQuery('')} />
            ) : (
              <CardGrid>
                {visible.map(({ playlist, covers, trackCount }) => (
                  <ContextMenu key={playlist.id}>
                    <ContextMenuTrigger asChild>
                      <Link
                        to={playlistPath(playlist.id)}
                        className="group block relative"
                      >
                        <CoverArt
                          name={playlist.name}
                          covers={covers}
                          custom={artUrls[playlistArtId(playlist.id)]}
                          className="aspect-square rounded-lg mb-3 transition-transform group-hover:scale-[1.02]"
                        />

                        {/* Playlist info */}
                        <p className="text-sm font-semibold truncate leading-snug mb-1">
                          {playlist.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                          {playlist.createdAt != null && <> · {formatDate(playlist.createdAt)}</>}
                        </p>
                      </Link>
                    </ContextMenuTrigger>
                    <EntityMenuContent
                      kind="playlist"
                      openTo={playlistPath(playlist.id)}
                      onPlay={() => playPlaylist(playlist.id)}
                      onDelete={() => setShowDeleteDialog(playlist.id)}
                    />
                  </ContextMenu>
                ))}
              </CardGrid>
            )}
          </>
        )}
      </div>

      <DeletePlaylistDialog
        open={showDeleteDialog !== null}
        onOpenChange={next => { if (!next) setShowDeleteDialog(null) }}
        playlistName={playlists.find(p => p.id === showDeleteDialog)?.name ?? ''}
        onConfirm={() => {
          if (showDeleteDialog) deletePlaylist(showDeleteDialog)
        }}
      />
    </>
  )
}