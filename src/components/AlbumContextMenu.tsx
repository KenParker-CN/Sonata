import type { ReactElement } from 'react'
import type { Playlist } from '@/types/music'
import type { Album } from '@/utils/groupAlbums'
import { albumPath } from '@/utils/routes'
import { ContextMenu, ContextMenuTrigger } from '@/components/ui/ContextMenu'
import EntityMenuContent from '@/components/EntityContextMenu'

interface AlbumContextMenuProps {
  album: Album
  playlists: Playlist[]
  // The card the menu is anchored to; it becomes the right-click trigger.
  children: ReactElement
  onPlayAlbum?: (albumName: string, albumArtist: string) => void
  onPlayNext?: (albumName: string, albumArtist: string) => void
  onAddToPlaylist?: (albumName: string, albumArtist: string, playlistId: string) => void
  onRemoveFromLibrary?: (albumName: string, albumArtist: string) => void
}

// Album name + album artist fully determine the route and the artist links, so
// every album surface can share one menu instead of re-wiring it per page.
export default function AlbumContextMenu({
  album,
  playlists,
  children,
  onPlayAlbum,
  onPlayNext,
  onAddToPlaylist,
  onRemoveFromLibrary,
}: AlbumContextMenuProps) {
  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{children}</ContextMenuTrigger>
      <EntityMenuContent
        kind="album"
        playlists={playlists}
        openTo={albumPath(album.name, album.albumArtist)}
        artists={album.albumArtists}
        onPlay={onPlayAlbum && (() => onPlayAlbum(album.name, album.albumArtist))}
        onPlayNext={onPlayNext && (() => onPlayNext(album.name, album.albumArtist))}
        onAddToPlaylist={onAddToPlaylist && (playlistId => onAddToPlaylist(album.name, album.albumArtist, playlistId))}
        onRemoveFromLibrary={onRemoveFromLibrary && (() => onRemoveFromLibrary(album.name, album.albumArtist))}
      />
    </ContextMenu>
  )
}
