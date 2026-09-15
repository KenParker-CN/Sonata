import type { Album } from '@/utils/groupAlbums'
import { albumPath } from '@/utils/routes'
import { Link } from 'react-router-dom'
import AlbumContextMenu from '@/components/context-menus/AlbumContextMenu'
import ArtistLinks from '@/components/data/ArtistLinks'
import GeneratedArt from '@/components/media/GeneratedArt'
import { useApp } from '@/contexts/app'

interface AlbumListRowProps {
  album: Album
  /** Right-aligned summary, e.g. "1975 · 12 tracks". */
  meta: string
}

/**
 * List-view twin of AlbumCard: same cover, same right-click menu, one line
 * instead of a tile. The album link is a stretched overlay behind the row
 * content, so the artist links on top stay clickable without nested anchors.
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
      <div className="group relative flex items-center gap-3 px-2 py-2 rounded-md transition-colors hover:bg-accent/50">
        <GeneratedArt
          name={`${album.name} ${album.albumArtist}`}
          src={album.cover}
          className="h-12 w-12 shrink-0 rounded"
        />

        <div className="min-w-0 flex-1">
          <p className="text-sm truncate group-hover:text-foreground">{album.name}</p>
          <ArtistLinks artists={album.albumArtists} className="relative z-10 mt-0.5" />
        </div>

        <span className="shrink-0 text-xs text-muted-foreground tabular-nums">{meta}</span>

        {/* Stretched link  — the row's own click target, layered behind the
            z-raised artist links so both stay clickable without nested <a>. */}
        <Link
          to={albumPath(album.name, album.albumArtist)}
          aria-label={album.name}
          className="absolute inset-0 rounded-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-inset"
        />
      </div>
    </AlbumContextMenu>
  )
}

