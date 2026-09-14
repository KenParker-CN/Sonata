import type { ReactNode } from 'react'
import type { Playlist, Track } from '@/types/music'
import { parseArtists } from '@/utils/parseArtists'
import { trackComposers } from '@/utils/groupComposers'
import { Link, useNavigate } from 'react-router-dom'
import { Dropdown, Separator } from '@heroui/react'
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
  ChevronRight,
  Disc3,
  ListEnd,
  ListPlus,
  ListStart,
  PenLine,
  Trash2,
  UserRound,
  X,
} from 'lucide-react'
import { cn } from '@/lib/utils'

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

/* Dropdown (click-anchored) rendering of the same track menu, for buttons that
 * open it on tap — e.g. a row's "More options" control. Radix ContextMenu
 * positions from the pointer event, so opening it programmatically lands the
 * menu at the page corner; HeroUI's Dropdown anchors to the trigger instead.
 * Keep this tree in step with TrackMenuContent above. */

// HeroUI's Popover renders unstyled — this is the menu surface the app uses.
const DROPDOWN_SURFACE =
  'rounded-lg border bg-popover p-1 text-popover-foreground shadow-md [data-entering]:animate-menu-in'

function DropdownNavAction({
  to,
  onNavigate,
  children,
}: {
  to: string
  onNavigate?: () => void
  children: ReactNode
}) {
  const navigate = useNavigate()
  return (
    <Dropdown.Item
      onAction={() => {
        onNavigate?.()
        navigate(to)
      }}
    >
      {children}
    </Dropdown.Item>
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

  // HeroUI's menu item lays out children with an internal gap; the trailing
  // chevron is pushed to the far edge the same way Radix's SubTrigger does it.
  const chevron = <ChevronRight size={14} className="ml-auto shrink-0" />
  const divider = <Separator className="my-1 h-px bg-border" />

  return (
    <Dropdown.Popover placement="bottom end" className={cn('min-w-56', DROPDOWN_SURFACE)}>
      <Dropdown.Menu aria-label="Track actions">
        {onAddToPlaylist && (
          <Dropdown.SubmenuTrigger>
            <Dropdown.Item>
              <ListPlus className="h-4 w-4 shrink-0" />
              Add to Playlist
              {chevron}
            </Dropdown.Item>
            <Dropdown.Popover placement="right top" className={cn('min-w-40', DROPDOWN_SURFACE)}>
              <Dropdown.Menu aria-label="Playlists">
                {playlists.length === 0 ? (
                  <Dropdown.Item isDisabled>No playlists yet</Dropdown.Item>
                ) : (
                  playlists.map(playlist => (
                    <Dropdown.Item
                      key={playlist.id}
                      id={playlist.id}
                      onAction={() => onAddToPlaylist(track.id, playlist.id)}
                    >
                      {playlist.name}
                    </Dropdown.Item>
                  ))
                )}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.SubmenuTrigger>
        )}
        {onPlayNext && (
          <Dropdown.Item onAction={() => onPlayNext(track.id)}>
            <ListStart className="h-4 w-4 shrink-0" />
            Play Next
          </Dropdown.Item>
        )}
        {onAddToQueue && (
          <Dropdown.Item onAction={() => onAddToQueue(track.id)}>
            <ListEnd className="h-4 w-4 shrink-0" />
            Add to Queue
          </Dropdown.Item>
        )}

        {hasQueueGroup && hasNavGroup && divider}

        {links.album && (
          <DropdownNavAction
            to={albumPath(track.album, track.albumArtist)}
            onNavigate={onNavigate}
          >
            <Disc3 className="h-4 w-4 shrink-0" />
            Go to Album
          </DropdownNavAction>
        )}
        {links.artist && artists.length > 0 && (
          <Dropdown.SubmenuTrigger>
            <Dropdown.Item>
              <UserRound className="h-4 w-4 shrink-0" />
              Go to Artist
              {chevron}
            </Dropdown.Item>
            <Dropdown.Popover placement="right top" className={cn('min-w-40', DROPDOWN_SURFACE)}>
              <Dropdown.Menu aria-label="Artists">
                {artists.map(artist => (
                  <DropdownNavAction key={artist} to={artistPath(artist)} onNavigate={onNavigate}>
                    {artist}
                  </DropdownNavAction>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.SubmenuTrigger>
        )}
        {links.composer && composers.length === 1 && (
          <DropdownNavAction to={composerPath(composers[0])} onNavigate={onNavigate}>
            <PenLine className="h-4 w-4 shrink-0" />
            Go to Composer
          </DropdownNavAction>
        )}
        {links.composer && composers.length > 1 && (
          <Dropdown.SubmenuTrigger>
            <Dropdown.Item>
              <PenLine className="h-4 w-4 shrink-0" />
              Go to Composer
              {chevron}
            </Dropdown.Item>
            <Dropdown.Popover placement="right top" className={cn('min-w-40', DROPDOWN_SURFACE)}>
              <Dropdown.Menu aria-label="Composers">
                {composers.map(composer => (
                  <DropdownNavAction key={composer} to={composerPath(composer)} onNavigate={onNavigate}>
                    {composer}
                  </DropdownNavAction>
                ))}
              </Dropdown.Menu>
            </Dropdown.Popover>
          </Dropdown.SubmenuTrigger>
        )}

        {(hasQueueGroup || hasNavGroup) && hasDangerGroup && divider}

        {onRemoveFromQueue && (
          <Dropdown.Item variant="danger" onAction={onRemoveFromQueue}>
            <X className="h-4 w-4 shrink-0" />
            Remove from Queue
          </Dropdown.Item>
        )}
        {onRemoveFromPlaylist && (
          <Dropdown.Item variant="danger" onAction={() => onRemoveFromPlaylist(track.id)}>
            <CircleMinus className="h-4 w-4 shrink-0" />
            Remove from Playlist
          </Dropdown.Item>
        )}
        {onRemoveFromLibrary && (
          <Dropdown.Item variant="danger" onAction={() => onRemoveFromLibrary(track.id)}>
            <Trash2 className="h-4 w-4 shrink-0" />
            Remove from Library
          </Dropdown.Item>
        )}
      </Dropdown.Menu>
    </Dropdown.Popover>
  )
}
