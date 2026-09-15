import type { Album } from '@/utils/groupAlbums'
import type { AudioQualityBadge as AudioQualityBadgeType } from '@/utils/getAudioQualityBadge'
import { albumPath } from '@/utils/routes'
import { Link } from 'react-router-dom'
import AlbumContextMenu from '@/components/context-menus/AlbumContextMenu'
import AudioQualityBadge from '@/components/media/AudioQualityBadge'
import ArtistLinks from '@/components/data/ArtistLinks'
import GeneratedArt from '@/components/media/GeneratedArt'
import { cn } from '@/lib/utils'
import { useApp } from '@/contexts/app'

interface AlbumCardProps {
  album: Album
  /**
   * Computed by the caller: only the Albums page's `trackIndices` address the
   * global library, so the artist shelves simply pass no badge.
   */
  badge?: AudioQualityBadgeType | null
  className?: string
}

/**
 * Album cover, title, artists and right-click menu  — shared by the Albums page
 * grid, its "Recently Added" shelf and the artist detail shelves. The actions
 * come from the app context, so a page never re-wires them per shelf.
 */
export default function AlbumCard({ album, badge = null, className }: AlbumCardProps) {
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
      <div className={cn('group', className)}>
        {/* Cover  — 1:1 aspect ratio with Apple-style rounding */}
        <Link
          to={albumPath(album.name, album.albumArtist)}
          aria-label={album.name}
          className="block aspect-square rounded-lg overflow-hidden bg-muted mb-3 relative transition-transform group-hover:scale-[1.02]"
        >
          <GeneratedArt
            name={`${album.name} ${album.albumArtist}`}
            src={album.cover}
            className="w-full h-full"
          />
          <AudioQualityBadge badge={badge} className="absolute bottom-2 right-2 shadow-md" />
        </Link>

        {/* Album info */}
        <p className="text-sm font-semibold truncate leading-snug mb-1">
          <Link
            to={albumPath(album.name, album.albumArtist)}
            className="hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {album.name}
          </Link>
        </p>
        <ArtistLinks artists={album.albumArtists} />
      </div>
    </AlbumContextMenu>
  )
}

