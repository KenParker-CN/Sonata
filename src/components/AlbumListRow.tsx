import type { Album } from '@/utils/groupAlbums'
import { albumPath } from '@/utils/routes'
import { Link } from 'react-router-dom'
import AlbumContextMenu from '@/components/AlbumContextMenu'
import GeneratedArt from '@/components/GeneratedArt'
import { useApp } from '@/contexts/app'

interface AlbumListRowProps {
  album: Album
  /** Right-aligned summary, e.g. "1975 · 12 tracks". */
  meta: string
}

/**
 * List-view twin of AlbumCard: same cover, same right-click menu, one line
 * instead of a tile. The artist is plain text here because the whole row is
 * already a link, and anchors cannot nest.
 */
export default function AlbumListRow({ album, meta }: AlbumListRowProps) {
  const { playlists, playAlbum, playAlbumNext, addAlbumToPlaylist, removeAlbumFromLibrary } = useApp()

  return (
    <AlbumContextMenu
      album={album}
      playlists={playlists}
      onPlayAlbum={playAlbum}
      onPlayNext={playAlbumNext}
      onAddToPlaylist={addAlbumToPlaylist}
      onRemoveFromLibrary={removeAlbumFromLibrary}
    >
      <Link
        to={albumPath(album.name, album.albumArtist)}
        className="group flex items-center gap-3 px-2 py-2 rounded-md transition-colors hover:bg-accent/50"
      >
        <GeneratedArt
          name={`${album.name} ${album.albumArtist}`}
          src={album.cover}
          className="h-12 w-12 shrink-0 rounded"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm truncate group-hover:text-foreground">{album.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground truncate">{album.albumArtist}</p>
        </div>

        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{meta}</span>
      </Link>
    </AlbumContextMenu>
  )
}
