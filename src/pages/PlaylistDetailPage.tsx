import type { Track } from '@/types/music'
import { formatDurationLong } from '@/utils/formatTime'
import { formatDate } from '@/utils/formatDate'
import { ListMusic, Plus, Trash2, Pencil } from 'lucide-react'
import { useNavigate, useParams } from 'react-router-dom'
import { useMemo, useState } from 'react'
import { playlistArtId } from '@/services/customArt'
import BackLink from '@/components/navigation/BackLink'
import ArtPicker from '@/components/media/ArtPicker'
import NotFoundState from '@/components/feedback/NotFoundState'
import PlayButton from '@/components/media/PlayButton'
import SearchInput from '@/components/navigation/SearchInput'
import SearchEmptyState from '@/components/feedback/SearchEmptyState'
import TrackList from '@/components/data/TrackList'
import {
  AddTracksDialog,
  DeletePlaylistDialog,
  PlaylistDetailsDialog,
} from '@/components/dialogs/PlaylistDialogs'
import { matchesSearch } from '@/utils/search'
import { useSearch } from '@/hooks/useSearch'
import { useApp } from '@/contexts/app'

export default function PlaylistDetailPage() {
  const {
    tracks,
    trackById,
    playlists,
    currentTrackId,
    playFromContext,
    playTrackNext,
    addTrackToQueue,
    addTrackToPlaylist,
    addTracksToPlaylist,
    updatePlaylist,
    deletePlaylist,
    removeFromLibrary,
    removeTrackFromPlaylist,
    moveTrackInPlaylist,
  } = useApp()
  const navigate = useNavigate()
  const { playlistId } = useParams<{ playlistId: string }>()
  const [dialog, setDialog] = useState<'add' | 'edit' | 'delete' | null>(null)

  const playlist = useMemo(
    () => playlists.find(p => p.id === playlistId),
    [playlists, playlistId],
  )

  const playlistTrackIdSet = useMemo(
    () => new Set(playlist?.trackIds ?? []),
    [playlist],
  )

  // Resolve the playlist's track ids into actual track objects (in playlist
  // order). Tracks that no longer exist in the library are skipped so the
  // playback context stays valid, but the ids themselves remain in the
  // playlist until the user removes them.
  const playlistTracks = useMemo(() => {
    const seen = new Set<string>()
    const result: Track[] = []
    for (const id of playlist?.trackIds ?? []) {
      if (seen.has(id)) continue
      seen.add(id)
      const track = trackById.get(id)
      if (track) result.push(track)
    }
    return result
  }, [playlist, trackById])

  // The playback context for this page: the available tracks, in playlist order.
  const playlistTrackIds = useMemo(
    () => playlistTracks.map(t => t.id),
    [playlistTracks],
  )

  const search = useSearch()
  // Filtering keeps the playlist's own order, so a query narrows rather than reorders.
  const visibleTracks = useMemo(
    () =>
      search.terms.length === 0
        ? playlistTracks
        : playlistTracks.filter(track =>
            matchesSearch(search.terms, track.title, track.artist, track.album),
          ),
    [playlistTracks, search.terms],
  )
  // Playback follows the rows on screen, not the whole playlist behind them.
  const visibleTrackIds = useMemo(() => visibleTracks.map(t => t.id), [visibleTracks])

  const { covers, totalDuration } = useMemo(() => ({
    // Up to four distinct covers paint the header; CoverArt turns them into a
    // mosaic and falls back to a painted monogram when the list is empty.
    covers: playlistTracks.flatMap(t => (t.cover ? [t.cover] : [])),
    totalDuration: playlistTracks.reduce((sum, t) => sum + t.duration, 0),
  }), [playlistTracks])

  if (!playlist) {
    return (
      <NotFoundState
        title="Playlist not found"
        icon={ListMusic}
        to="/playlists"
        backLabel="Back to playlists"
      />
    )
  }

  return (
    <div className="page-gutter pt-6 pb-8">
      <BackLink to="/playlists" label="Back to playlists" />

      {/* Playlist header */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-8">
        <ArtPicker
          covers={covers}
          name={playlist.name}
          upload={{ artId: playlistArtId(playlist.id), noun: 'playlist cover' }}
        />

        <div className="flex flex-col justify-center gap-3 min-w-0 h-auto sm:h-64 text-center sm:text-left">
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">{playlist.name}</h1>
            {playlist.description && (
              <p className="text-sm text-muted-foreground line-clamp-2">{playlist.description}</p>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span>
              {playlistTracks.length} {playlistTracks.length === 1 ? 'track' : 'tracks'}
              {totalDuration > 0 && <> · {formatDurationLong(totalDuration)}</>}
            </span>
            {playlist.createdAt != null && (
              <>
                <span aria-hidden="true">·</span>
                <span>Created {formatDate(playlist.createdAt)}</span>
              </>
            )}
            {playlist.updatedAt != null && playlist.updatedAt !== playlist.createdAt && (
              <>
                <span aria-hidden="true">·</span>
                <span>Updated {formatDate(playlist.updatedAt)}</span>
              </>
            )}
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 pt-1">
            {playlistTracks.length > 0 && (
              <PlayButton
                onClick={() => playFromContext(playlistTrackIds, 0)}
                label={`Play ${playlist.name}`}
              />
            )}
            <button
              type="button"
              onClick={() => setDialog('add')}
              className="btn btn-outline btn-sm rounded-full"
            >
              <Plus size={15} />
              Add Music
            </button>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setDialog('edit')}
                aria-label="Edit playlist details"
                className="btn btn-ghost btn-circle"
              >
                <Pencil size={16} />
              </button>
              <button
                type="button"
                onClick={() => setDialog('delete')}
                aria-label="Delete playlist"
                className="btn btn-ghost btn-circle text-muted-foreground hover:bg-accent hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <Trash2 size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Track list */}
      {playlistTracks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-muted-foreground">
          <ListMusic size={36} className="mb-3 opacity-30" />
          <p className="text-sm font-medium">This playlist is empty.</p>
          <p className="text-xs mt-1">Use “Add Music — above, or “Add to Playlist — from any track menu.</p>
        </div>
      ) : (
        <>
          <div className="mb-3 flex justify-end">
            <SearchInput label="Search playlist" value={search.query} onChange={search.setQuery} />
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
              onRemoveFromPlaylist={trackId => removeTrackFromPlaylist(playlist.id, trackId)}
              // Reordering is off while filtered: the neighbour a row would swap
              // with may be one the query is hiding.
              onMoveTrack={
                search.active
                  ? undefined
                  : (trackId, direction) => moveTrackInPlaylist(playlist.id, trackId, direction)
              }
            />
          )}
        </>
      )}

      {/* Footer */}
      {playlistTracks.length > 0 && (
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border text-xs text-muted-foreground">
          <p>
            {playlist.trackIds.length} total {playlist.trackIds.length === 1 ? 'entry' : 'entries'}
            {playlist.trackIds.length !== playlistTracks.length && ` · ${playlistTracks.length} available`}
          </p>
          <p className="ml-auto">
            {formatDurationLong(totalDuration)}
          </p>
        </div>
      )}

      <AddTracksDialog
        open={dialog === 'add'}
        onOpenChange={next => { if (!next) setDialog(null) }}
        tracks={tracks}
        existingIds={playlistTrackIdSet}
        onAdd={trackIds => addTracksToPlaylist(playlist.id, trackIds)}
      />

      <PlaylistDetailsDialog
        open={dialog === 'edit'}
        onOpenChange={next => { if (!next) setDialog(null) }}
        mode="edit"
        initialName={playlist.name}
        initialDescription={playlist.description ?? ''}
        onSubmit={details => updatePlaylist(playlist.id, details)}
      />

      <DeletePlaylistDialog
        open={dialog === 'delete'}
        onOpenChange={next => { if (!next) setDialog(null) }}
        playlistName={playlist.name}
        onConfirm={() => {
          deletePlaylist(playlist.id)
          navigate('/playlists')
        }}
      />
    </div>
  )
}
