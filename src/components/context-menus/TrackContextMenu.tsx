import type { ReactNode } from 'react'
import type { Playlist, Track } from '@/types/music'
import { parseArtists } from '@/utils/parseArtists'
import { trackComposers } from '@/utils/groupComposers'
import { Link } from 'react-router-dom'
import {
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuSub,
  ContextMenuSubContent,
  ContextMenuSubTrigger,
} from '@/components/ui/ContextMenu'
import { albumPath, artistPath, composerPath } from '@/utils/routes'
import {
  CircleMinus,
  Disc3,
  ListEnd,
  ListPlus,
  ListStart,
  PenLine,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'

/** Which detail links the navigation group offers. Destinations come from the track. */
export interface TrackMenuLinks {
  album?: boolean
  artist?: boolean
  composer?: boolean
}

export interface TrackMenuActions {
  onPlayNext?: (trackId: string) => void
  onAddToQueue?: (trackId: string) => void
  onAddToPlaylist?: (trackId: string, playlistId: string) => void
  /** Defaults to every link; a page passes a subset when one is redundant. */
  links?: TrackMenuLinks
  /** Runs when a detail link activates, so a panel covering the page can dismiss. */
  onNavigate?: () => void
  onRemoveFromQueue?: () => void
  onRemoveFromLibrary?: (trackId: string) => void
  onRemoveFromPlaylist?: (trackId: string) => void
}

interface TrackMenuContentProps extends TrackMenuActions {
  track: Track
  playlists: Playlist[]
}

const ICON = 'mr-2 h-4 w-4 shrink-0'

const ALL_LINKS: TrackMenuLinks = { album: true, artist: true, composer: true }

// Layout follows Spotify's track menu: collection/queue actions first,
// navigation second, destructive last, groups split by separators.
export default function TrackMenuContent({
  track,
  playlists,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  links = ALL_LINKS,
  onNavigate,
  onRemoveFromQueue,
  onRemoveFromLibrary,
  onRemoveFromPlaylist,
}: TrackMenuContentProps) {
  const artists = parseArtists(track.artist)
  const composers = trackComposers(track)

  const hasQueueGroup = Boolean(onAddToPlaylist || onPlayNext || onAddToQueue)
  const hasNavGroup = Boolean(
    links.album || (links.artist && artists.length > 0) || (links.composer && composers.length > 0),
  )
  const hasDangerGroup = Boolean(onRemoveFromQueue || onRemoveFromPlaylist || onRemoveFromLibrary)

  return (
    <ContextMenuContent className="w-56">
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
                  onClick={() => onAddToPlaylist(track.id, playlist.id)}
                >
                  {playlist.name}
                </ContextMenuItem>
              ))
            )}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      {onPlayNext && (
        <ContextMenuItem onClick={() => onPlayNext(track.id)}>
          <ListStart className={ICON} />
          Play Next
        </ContextMenuItem>
      )}
      {onAddToQueue && (
        <ContextMenuItem onClick={() => onAddToQueue(track.id)}>
          <ListEnd className={ICON} />
          Add to Queue
        </ContextMenuItem>
      )}

      {hasQueueGroup && hasNavGroup && <ContextMenuSeparator />}

      {links.album && (
        <ContextMenuItem asChild>
          <Link to={albumPath(track.album, track.albumArtist)} onClick={onNavigate} className="underline">
            <Disc3 className={ICON} />
            Go to Album
          </Link>
        </ContextMenuItem>
      )}
      {links.artist && artists.length > 0 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <UserRound className={ICON} />
            Go to Artist
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {artists.map(artist => (
              <ContextMenuItem key={artist} asChild>
                <Link to={artistPath(artist)} onClick={onNavigate} className="underline">{artist}</Link>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}
      {links.composer && composers.length === 1 && (
        <ContextMenuItem asChild>
          <Link to={composerPath(composers[0])} onClick={onNavigate} className="underline">
            <PenLine className={ICON} />
            Go to Composer
          </Link>
        </ContextMenuItem>
      )}
      {links.composer && composers.length > 1 && (
        <ContextMenuSub>
          <ContextMenuSubTrigger>
            <PenLine className={ICON} />
            Go to Composer
          </ContextMenuSubTrigger>
          <ContextMenuSubContent className="w-48">
            {composers.map(composer => (
              <ContextMenuItem key={composer} asChild>
                <Link to={composerPath(composer)} onClick={onNavigate} className="underline">{composer}</Link>
              </ContextMenuItem>
            ))}
          </ContextMenuSubContent>
        </ContextMenuSub>
      )}

      {(hasQueueGroup || hasNavGroup) && hasDangerGroup && <ContextMenuSeparator />}

      {onRemoveFromQueue && (
        <ContextMenuItem onClick={onRemoveFromQueue}>
          <X className={ICON} />
          Remove from Queue
        </ContextMenuItem>
      )}
      {onRemoveFromPlaylist && (
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onRemoveFromPlaylist(track.id)}
        >
          <CircleMinus className={ICON} />
          Remove from Playlist
        </ContextMenuItem>
      )}
      {onRemoveFromLibrary && (
        <ContextMenuItem
          className="text-destructive focus:text-destructive"
          onClick={() => onRemoveFromLibrary(track.id)}
        >
          <Trash2 className={ICON} />
          Remove from Library
        </ContextMenuItem>
      )}
    </ContextMenuContent>
  )
}

function DropdownNavAction({
  to,
  onNavigate,
  children,
}: {
  to: string
  onNavigate?: () => void
  children: ReactNode
}) {
  return (
    <Link to={to} onClick={onNavigate}>
      {children}
    </Link>
  )
}

export function TrackDropdownContent({
  track,
  playlists,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  links = ALL_LINKS,
  onNavigate,
  onRemoveFromQueue,
  onRemoveFromLibrary,
  onRemoveFromPlaylist,
}: TrackMenuContentProps) {
  const artists = parseArtists(track.artist)
  const composers = trackComposers(track)
  const hasQueueGroup = Boolean(onAddToPlaylist || onPlayNext || onAddToQueue)
  const hasNavGroup = Boolean(
    links.album || (links.artist && artists.length > 0) || (links.composer && composers.length > 0),
  )
  const hasDangerGroup = Boolean(onRemoveFromQueue || onRemoveFromPlaylist || onRemoveFromLibrary)
  const divider = <li className="my-1 border-t border-border" aria-hidden="true" />

  return (
    <ul className="menu menu-sm dropdown-content z-50 w-56 rounded-box border border-border bg-popover p-1 text-popover-foreground shadow-md">
      {onAddToPlaylist && (
        <li>
          <details>
            <summary><ListPlus className="h-4 w-4 shrink-0" />Add to Playlist</summary>
            <ul className="z-10 w-48 rounded-box border border-border bg-popover p-1 shadow-md">
              {playlists.length === 0 ? <li className="px-3 py-2 text-muted-foreground">No playlists yet</li> : playlists.map(playlist => (
                <li key={playlist.id}><button type="button" onClick={() => onAddToPlaylist(track.id, playlist.id)}>{playlist.name}</button></li>
              ))}
            </ul>
          </details>
        </li>
      )}
      {onPlayNext && <li><button type="button" onClick={() => onPlayNext(track.id)}><ListStart className="h-4 w-4 shrink-0" />Play Next</button></li>}
      {onAddToQueue && <li><button type="button" onClick={() => onAddToQueue(track.id)}><ListEnd className="h-4 w-4 shrink-0" />Add to Queue</button></li>}
      {hasQueueGroup && hasNavGroup && divider}
      {links.album && <li><DropdownNavAction to={albumPath(track.album, track.albumArtist)} onNavigate={onNavigate}><Disc3 className="h-4 w-4 shrink-0" />Go to Album</DropdownNavAction></li>}
      {links.artist && artists.length > 0 && (
        <li><details><summary><UserRound className="h-4 w-4 shrink-0" />Go to Artist</summary><ul className="z-10 w-48 rounded-box border border-border bg-popover p-1 shadow-md">{artists.map(artist => (
          <li key={artist}><DropdownNavAction to={artistPath(artist)} onNavigate={onNavigate}>{artist}</DropdownNavAction></li>
        ))}</ul></details></li>
      )}
      {links.composer && composers.length === 1 && <li><DropdownNavAction to={composerPath(composers[0])} onNavigate={onNavigate}><PenLine className="h-4 w-4 shrink-0" />Go to Composer</DropdownNavAction></li>}
      {links.composer && composers.length > 1 && (
        <li><details><summary><PenLine className="h-4 w-4 shrink-0" />Go to Composer</summary><ul className="z-10 w-48 rounded-box border border-border bg-popover p-1 shadow-md">{composers.map(composer => (
          <li key={composer}><DropdownNavAction to={composerPath(composer)} onNavigate={onNavigate}>{composer}</DropdownNavAction></li>
        ))}</ul></details></li>
      )}
      {(hasQueueGroup || hasNavGroup) && hasDangerGroup && divider}
      {onRemoveFromQueue && <li><button type="button" onClick={onRemoveFromQueue}><X className="h-4 w-4 shrink-0" />Remove from Queue</button></li>}
      {onRemoveFromPlaylist && <li><button type="button" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onRemoveFromPlaylist(track.id)}><CircleMinus className="h-4 w-4 shrink-0" />Remove from Playlist</button></li>}
      {onRemoveFromLibrary && <li><button type="button" className="text-destructive hover:bg-destructive/10 hover:text-destructive" onClick={() => onRemoveFromLibrary(track.id)}><Trash2 className="h-4 w-4 shrink-0" />Remove from Library</button></li>}
    </ul>
  )
}
