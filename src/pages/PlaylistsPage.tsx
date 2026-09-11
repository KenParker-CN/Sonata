import type { Playlist, Track } from '@/types/music'
import { ListMusic, Plus, Trash2, Menu, Play } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu'

interface PlaylistsPageProps {
  playlists: Playlist[]
  tracks: Track[]
  onCreatePlaylist: (name: string) => void
  onDeletePlaylist: (id: string) => void
  onOpenSidebar?: () => void
  onOpenPlaylist?: (playlistId: string) => void
  onPlayPlaylist?: (playlistId: string) => void
}

export default function PlaylistsPage({
  playlists,
  tracks,
  onCreatePlaylist,
  onDeletePlaylist,
  onOpenSidebar,
  onOpenPlaylist,
  onPlayPlaylist,
}: PlaylistsPageProps) {
  const [showCreateDialog, setShowCreateDialog] = useState(false)
  const [showDeleteDialog, setShowDeleteDialog] = useState<string | null>(null)

  // Get representative cover for a playlist (first available track cover)
  function getPlaylistCover(playlist: Playlist): string | null {
    for (const trackId of playlist.trackIds) {
      const track = tracks.find(t => t.id === trackId)
      if (track?.cover) return track.cover
    }
    return null
  }

  // Count valid tracks in playlist
  function getTrackCount(playlist: Playlist): number {
    return playlist.trackIds.filter(id => tracks.some(t => t.id === id)).length
  }

  return (
    <>
      {/* Page header */}
      <div className="px-6 pt-6 pb-4 relative">
        {/* Mobile menu button */}
        <button
          onClick={onOpenSidebar}
          className="lg:hidden absolute top-4 right-4 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
        >
          <Menu size={20} />
        </button>
        <h1 className="text-2xl font-bold tracking-tight">Playlists</h1>
        <p className="text-sm text-muted-foreground mt-1">Your playlists</p>
        {playlists.length > 0 && (
          <p className="text-xs text-muted-foreground mt-1">
            {playlists.length} {playlists.length === 1 ? 'playlist' : 'playlists'}
          </p>
        )}
      </div>

      {/* Content */}
      <div className="px-6 pb-8">
        {playlists.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
            <ListMusic size={40} className="mb-4 opacity-30" />
            <p className="text-lg font-medium">No playlists yet.</p>
            <p className="text-sm mt-1 mb-4">Create a playlist to organize your music.</p>
            <button
              onClick={() => setShowCreateDialog(true)}
              className="flex items-center gap-2 px-4 py-2 rounded-md bg-primary text-primary-foreground text-sm font-medium hover:opacity-90 transition-opacity"
            >
              <Plus size={16} />
              New Playlist
            </button>
          </div>
        ) : (
          <>
            {/* New Playlist button above grid */}
            <div className="mb-4">
              <button
                onClick={() => setShowCreateDialog(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors"
              >
                <Plus size={16} />
                New Playlist
              </button>
            </div>

            {/* Playlist Grid */}
            <div
              className="grid gap-6"
              style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
            >
              {playlists.map(playlist => {
                const cover = getPlaylistCover(playlist)
                const trackCount = getTrackCount(playlist)

                return (
                  <ContextMenu key={playlist.id}>
                    <ContextMenuTrigger asChild>
                      <div className="group relative cursor-pointer">
                        {/* Cover — 1:1 aspect ratio */}
                        <div className="aspect-square rounded-lg overflow-hidden bg-muted mb-3 transition-transform group-hover:scale-[1.02]">
                          {cover ? (
                            <img
                              src={cover}
                              alt=""
                              className="w-full h-full object-cover"
                            />
                          ) : (
                            <div className="w-full h-full flex items-center justify-center bg-muted">
                              <ListMusic size={36} className="text-muted-foreground/30" />
                            </div>
                          )}
                        </div>

                        {/* Playlist info */}
                        <p className="text-sm font-semibold truncate leading-snug mb-1">
                          {playlist.name}
                        </p>
                        <p className="text-xs text-muted-foreground truncate">
                          {trackCount} {trackCount === 1 ? 'track' : 'tracks'}
                        </p>
                      </div>
                    </ContextMenuTrigger>
                    <ContextMenuContent className="w-64">
                      {onOpenPlaylist && (
                        <ContextMenuItem onClick={() => onOpenPlaylist(playlist.id)}>
                          Open Playlist
                        </ContextMenuItem>
                      )}
                      {onPlayPlaylist && (
                        <ContextMenuItem onClick={() => onPlayPlaylist(playlist.id)}>
                          <Play className="mr-2 h-4 w-4" />
                          Play
                        </ContextMenuItem>
                      )}
                      <ContextMenuSeparator />
                      <ContextMenuItem
                        className="text-destructive focus:text-destructive"
                        onClick={() => setShowDeleteDialog(playlist.id)}
                      >
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Playlist
                      </ContextMenuItem>
                    </ContextMenuContent>
                  </ContextMenu>
                )
              })}
            </div>
          </>
        )}
      </div>

      {/* Create Playlist Dialog */}
      {showCreateDialog && (
        <CreatePlaylistDialog
          onClose={() => setShowCreateDialog(false)}
          onCreate={(name) => {
            onCreatePlaylist(name)
            setShowCreateDialog(false)
          }}
        />
      )}

      {/* Delete Confirmation Dialog */}
      {showDeleteDialog && (
        <DeletePlaylistDialog
          playlistName={playlists.find(p => p.id === showDeleteDialog)?.name ?? ''}
          onClose={() => setShowDeleteDialog(null)}
          onConfirm={() => {
            onDeletePlaylist(showDeleteDialog)
            setShowDeleteDialog(null)
          }}
        />
      )}
    </>
  )
}

// Create Playlist Dialog
function CreatePlaylistDialog({
  onClose,
  onCreate,
}: {
  onClose: () => void
  onCreate: (name: string) => void
}) {
  const [name, setName] = useState('')
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    inputRef.current?.focus()
  }, [])

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    const trimmed = name.trim()
    if (trimmed) {
      onCreate(trimmed)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold mb-4">Create Playlist</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium mb-1.5">Name</label>
            <input
              ref={inputRef}
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Playlist name"
              className="w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!name.trim()}
              className="px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity"
            >
              Create
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// Delete Playlist Dialog
function DeletePlaylistDialog({
  playlistName,
  onClose,
  onConfirm,
}: {
  playlistName: string
  onClose: () => void
  onConfirm: () => void
}) {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div
        className="w-full max-w-md rounded-lg border border-border bg-background p-6 shadow-lg"
      >
        <h2 className="text-lg font-semibold mb-2">Delete Playlist</h2>
        <p className="text-sm text-muted-foreground mb-4">
          Are you sure you want to delete "{playlistName}"? This action cannot be undone.
        </p>
        <div className="flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            className="px-4 py-2 rounded-md text-sm bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity"
          >
            Delete
          </button>
        </div>
      </div>
    </div>
  )
}
