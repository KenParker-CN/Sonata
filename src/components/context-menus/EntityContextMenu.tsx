import type { Playlist } from '@/types/music'
import { Link } from 'react-router-dom'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/ContextMenu'
import { artistPath } from '@/utils/routes'
import {
  Disc3,
  ListMusic,
  ListPlus,
  ListStart,
  PenLine,
  Play,
  Trash2,
  UserRound,
} from 'lucide-react'

const ICON = 'mr-2 h-4 w-4 shrink-0'

const ENTITY = {
  album: { label: 'Album', icon: Disc3 },
  artist: { label: 'Artist', icon: UserRound },
  composer: { label: 'Composer', icon: PenLine },
  playlist: { label: 'Playlist', icon: ListMusic },
} as const

export type EntityKind = keyof typeof ENTITY

interface EntityMenuContentProps {
  kind: EntityKind
  playlists?: Playlist[]
  /** Detail route of this entity — the "Open" item links straight to it. */
  openTo: string
  onPlay?: () => void
  onPlayNext?: () => void
  onAddToPlaylist?: (playlistId: string) => void
  // Album menus link out to their artists, same as the track menu does.
  artists?: string[]
  onRemoveFromLibrary?: () => void
  onDelete?: () => void
}

// The context menu every non-track entity shares, so an album, artist, composer
// or playlist offers the same actions wherever it appears. Item order follows
// TrackContextMenu's grouping: open, then collection actions, then navigation,
// then destructive. Navigation items are anchors, so they behave like the rest
// of the app's links — middle click, keyboard activation and prefetch included.
export default function EntityMenuContent({
  kind,
  playlists = [],
  openTo,
  onPlay,
  onPlayNext,
  onAddToPlaylist,
  artists,
  onRemoveFromLibrary,
  onDelete,
}: EntityMenuContentProps) {
  const { label, icon: Icon } = ENTITY[kind]
  const hasDangerGroup = Boolean(onRemoveFromLibrary || onDelete)

  return (
    <ContextMenuContent className="w-56">
      <ContextMenuItem asChild>
        <Link to={openTo} className="underline">
          <Icon className={ICON} />
          Open {label}
        </Link>
      </ContextMenuItem>
      {onPlay && (
        <ContextMenuItem onClick={onPlay}>
          <Play className={ICON} />
          Play
        </ContextMenuItem>
      )}
      {onPlayNext && (
        <ContextMenuItem onClick={onPlayNext}>
          <ListStart className={ICON} />
          Play Next
        </ContextMenuItem>
      )}
      {onAddToPlaylist && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <ListPlus className={ICON} />
            Add to Playlist
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {playlists.length === 0 ? (
              <ContextMenuItem disabled>No playlists yet</ContextMenuItem>
            ) : (
              playlists.map(playlist => (
                <ContextMenuItem
                  key={playlist.id}
                  onClick={() => onAddToPlaylist(playlist.id)}
                >
                  {playlist.name}
                </ContextMenuItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {artists && artists.length > 0 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <UserRound className={ICON} />
            Go to Artist
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {artists.map(artist => (
              <ContextMenuItem key={artist} asChild>
                <Link to={artistPath(artist)} className="underline">{artist}</Link>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {hasDangerGroup && <ContextMenuSeparator />}

      {onRemoveFromLibrary && (
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onRemoveFromLibrary}
        >
          <Trash2 className={ICON} />
          Remove from Library
        </ContextMenuItem>
      )}
      {onDelete && (
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className={ICON} />
          Delete {label}
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  )
}
