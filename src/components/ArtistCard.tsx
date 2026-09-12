import type { Artist } from '@/utils/groupArtists'
import { Link } from 'react-router-dom'
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'
import EntityMenuContent from '@/components/EntityContextMenu'
import GeneratedArt from '@/components/GeneratedArt'
import { cn } from '@/lib/utils'
import { artistPath } from '@/utils/routes'
import { artistArtId } from '@/services/customArt'
import { useApp } from '@/contexts/app'

interface ArtistCardProps {
  artist: Artist
  className?: string
}

/**
 * Artist tile with the shared right-click menu — used by the Artists page grid
 * and its "Top Artists" shelf. The actions come from the app context, so a page
 * never re-wires them per shelf.
 */
export default function ArtistCard({ artist, className }: ArtistCardProps) {
  const {
    playlists,
    artUrls,
    playArtist,
    playArtistNext,
    addArtistToPlaylist,
  } = useApp()
  const to = artistPath(artist.name)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link to={to} className={cn('group block', className)}>
          {/* Artists ship no artwork, so the tile is an upload or a painted name */}
          <GeneratedArt
            name={artist.name}
            src={artUrls[artistArtId(artist.name)]}
            className="aspect-square rounded-full mb-3 transition-transform group-hover:scale-[1.02]"
          />

          <p className="text-sm font-semibold truncate leading-snug mb-1">{artist.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
          </p>
        </Link>
      </ContextMenuTrigger>
      <EntityMenuContent
        kind="artist"
        playlists={playlists}
        openTo={to}
        onPlay={() => playArtist(artist.name)}
        onPlayNext={() => playArtistNext(artist.name)}
        onAddToPlaylist={playlistId => addArtistToPlaylist(artist.name, playlistId)}
      />
    </ContextMenu>
  )
}
