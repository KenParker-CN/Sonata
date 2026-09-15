import type { Album } from '@/utils/groupAlbums'
import type { AudioQualityBadge as AudioQualityBadgeType } from '@/utils/getAudioQualityBadge'
import { Play } from 'lucide-react'
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
      <div className={cn('group min-w-0', className)}>
        {/* Cover  — 1:1 aspect ratio with Apple-style rounding */}
        <div className="artwork-surface relative mb-3 aspect-square rounded-xl bg-muted transition-transform duration-300 group-hover:-translate-y-1">
          <Link
            to={albumPath(album.name, album.albumArtist)}
            aria-label={album.name}
            className="block h-full w-full"
          >
            <GeneratedArt
              name={`${album.name} ${album.albumArtist}`}
              src={album.cover}
              className="h-full w-full"
            />
          </Link>
          <AudioQualityBadge badge={badge} className="absolute bottom-2 right-2 shadow-md" />
          <button
            type="button"
            onClick={() => playAlbum(album.name, album.albumArtist)}
            aria-label={`Play ${album.name}`}
            className="absolute bottom-3 left-3 z-10 flex h-10 w-10 translate-y-2 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition-all duration-200 group-hover:translate-y-0 group-hover:opacity-100 focus-visible:translate-y-0 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring touch:translate-y-0 touch:opacity-100"
          >
            <Play size={17} fill="currentColor" />
          </button>
        </div>

        {/* Album info */}
        <p className="text-[15px] font-semibold truncate leading-snug mb-1">
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
