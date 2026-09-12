import type { Track } from '@/types/music'
import type { PlaylistDetails } from '@/utils/playlist'
import { useMemo, useState } from 'react'
import { Check, Search } from 'lucide-react'
import { parseArtists } from '@/utils/parseArtists'
import { cn } from '@/lib/utils'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/Dialog'

const CANCEL = 'px-4 py-2 rounded-md text-sm text-muted-foreground hover:bg-accent hover:text-foreground transition-colors'
const PRIMARY = 'px-4 py-2 rounded-md text-sm bg-primary text-primary-foreground font-medium hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-opacity'
const DESTRUCTIVE = 'px-4 py-2 rounded-md text-sm bg-destructive text-destructive-foreground font-medium hover:opacity-90 transition-opacity'

const inputClass = 'w-full px-3 py-2 rounded-md border border-border bg-background text-sm focus:outline-none focus:ring-2 focus:ring-ring'

interface PlaylistDetailsDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  mode: 'create' | 'edit'
  initialName?: string
  initialDescription?: string
  onSubmit: (details: PlaylistDetails) => void
}

export function PlaylistDetailsDialog({
  open,
  onOpenChange,
  mode,
  initialName = '',
  initialDescription = '',
  onSubmit,
}: PlaylistDetailsDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create Playlist' : 'Edit Details'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Name your new playlist, and describe it if you like.'
              : 'Change this playlist’s name and description.'}
          </DialogDescription>
        </DialogHeader>
        <PlaylistDetailsForm
          mode={mode}
          initialName={initialName}
          initialDescription={initialDescription}
          onSubmit={onSubmit}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

// Radix unmounts the dialog content once the close animation ends, so this form's
// state is recreated on every open instead of being reset by an effect.
function PlaylistDetailsForm({
  mode,
  initialName,
  initialDescription,
  onSubmit,
  onCancel,
}: {
  mode: 'create' | 'edit'
  initialName: string
  initialDescription: string
  onSubmit: (details: PlaylistDetails) => void
  onCancel: () => void
}) {
  const [name, setName] = useState(initialName)
  const [description, setDescription] = useState(initialDescription)
  const trimmed = name.trim()

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (!trimmed) return
    onSubmit({ name: trimmed, description })
    onCancel()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="playlist-name">
          Name
        </label>
        <input
          id="playlist-name"
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Playlist name"
          className={inputClass}
        />
      </div>
      <div>
        <label className="block text-sm font-medium mb-1.5" htmlFor="playlist-description">
          Description <span className="font-normal text-muted-foreground">(optional)</span>
        </label>
        <textarea
          id="playlist-description"
          value={description}
          onChange={e => setDescription(e.target.value)}
          placeholder="What is this playlist for?"
          rows={3}
          className={cn(inputClass, 'resize-y')}
        />
      </div>
      <DialogFooter>
        <button type="button" onClick={onCancel} className={CANCEL}>
          Cancel
        </button>
        <button type="submit" disabled={!trimmed} className={PRIMARY}>
          {mode === 'create' ? 'Create' : 'Save'}
        </button>
      </DialogFooter>
    </form>
  )
}

interface DeletePlaylistDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  playlistName: string
  onConfirm: () => void
}

export function DeletePlaylistDialog({
  open,
  onOpenChange,
  playlistName,
  onConfirm,
}: DeletePlaylistDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Delete Playlist</DialogTitle>
          <DialogDescription>
            Are you sure you want to delete “{playlistName}”? This action cannot be undone.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <button type="button" onClick={() => onOpenChange(false)} className={CANCEL}>
            Cancel
          </button>
          <button
            type="button"
            onClick={() => {
              onConfirm()
              onOpenChange(false)
            }}
            className={DESTRUCTIVE}
          >
            Delete
          </button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

// Ceiling on rendered rows so a large library can't mount thousands of
// checkboxes at once; the search box narrows what falls inside the window.
const MAX_RESULTS = 200

interface AddTracksDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  tracks: Track[]
  existingIds: Set<string>
  onAdd: (trackIds: string[]) => void
}

export function AddTracksDialog({
  open,
  onOpenChange,
  tracks,
  existingIds,
  onAdd,
}: AddTracksDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Add Music</DialogTitle>
          <DialogDescription>
            Pick tracks from your library to add to this playlist.
          </DialogDescription>
        </DialogHeader>
        <AddTracksForm
          tracks={tracks}
          existingIds={existingIds}
          onAdd={onAdd}
          onCancel={() => onOpenChange(false)}
        />
      </DialogContent>
    </Dialog>
  )
}

// Radix unmounts the dialog content once the close animation ends, so the search
// query and the current selection are recreated on every open.
function AddTracksForm({
  tracks,
  existingIds,
  onAdd,
  onCancel,
}: {
  tracks: Track[]
  existingIds: Set<string>
  onAdd: (trackIds: string[]) => void
  onCancel: () => void
}) {
  const [query, setQuery] = useState('')
  const [picked, setPicked] = useState<string[]>([])

  const candidates = useMemo(() => {
    const needle = query.trim().toLowerCase()
    const matched = tracks.filter(t => {
      if (existingIds.has(t.id)) return false
      if (!needle) return true
      return (
        t.title.toLowerCase().includes(needle) ||
        t.album.toLowerCase().includes(needle) ||
        parseArtists(t.artist).some(a => a.toLowerCase().includes(needle))
      )
    })
    return matched.slice(0, MAX_RESULTS)
  }, [tracks, existingIds, query])

  const toggle = (trackId: string) => {
    setPicked(prev =>
      prev.includes(trackId) ? prev.filter(id => id !== trackId) : [...prev, trackId],
    )
  }

  return (
    <>
      <div className="relative">
        <Search
          size={14}
          aria-hidden="true"
          className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground"
        />
        <input
          type="search"
          value={query}
          onChange={e => setQuery(e.target.value)}
          placeholder="Search title, artist or album"
          aria-label="Search library"
          className={cn(inputClass, 'pl-9')}
        />
      </div>

      <div className="max-h-[50vh] min-h-[120px] overflow-y-auto rounded-md border border-border divide-y divide-border">
        {candidates.length === 0 ? (
          <p className="px-3 py-8 text-center text-sm text-muted-foreground">
            {tracks.length === existingIds.size
              ? 'Every track in your library is already here.'
              : 'No tracks match your search.'}
          </p>
        ) : (
          candidates.map(track => {
            const isChecked = picked.includes(track.id)
            return (
              <label
                key={track.id}
                className={cn(
                  'flex items-center gap-3 px-3 py-2 cursor-pointer transition-colors hover:bg-accent/50',
                  isChecked && 'bg-accent/40',
                )}
              >
                <input
                  type="checkbox"
                  checked={isChecked}
                  onChange={() => toggle(track.id)}
                  className="sr-only"
                />
                <span
                  aria-hidden="true"
                  className={cn(
                    'flex h-4 w-4 shrink-0 items-center justify-center rounded border border-border',
                    isChecked ? 'bg-primary text-primary-foreground' : 'bg-background',
                  )}
                >
                  {isChecked && <Check size={12} strokeWidth={3} />}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm truncate">{track.title}</span>
                  <span className="block text-xs truncate text-muted-foreground">
                    {parseArtists(track.artist).join(', ')}
                  </span>
                </span>
              </label>
            )
          })
        )}
      </div>

      <DialogFooter>
        <button type="button" onClick={onCancel} className={CANCEL}>
          Cancel
        </button>
        <button
          type="button"
          disabled={picked.length === 0}
          onClick={() => {
            onAdd(picked)
            onCancel()
          }}
          className={PRIMARY}
        >
          {picked.length > 0 ? `Add ${picked.length} ${picked.length === 1 ? 'track' : 'tracks'}` : 'Add tracks'}
        </button>
      </DialogFooter>
    </>
  )
}
