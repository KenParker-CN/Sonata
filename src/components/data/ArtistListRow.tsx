import type { Artist } from '@/utils/groupArtists'
import { artistPath } from '@/utils/routes'
import { Link } from 'react-router-dom'
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'
import EntityMenuContent from '@/components/context-menus/EntityContextMenu'
import GeneratedArt from '@/components/media/GeneratedArt'
import { artistArtId } from '@/services/customArt'
import { useApp } from '@/contexts/app'

interface ArtistListRowProps {
  artist: Artist
}

/** List-view twin of ArtistCard, matching the composer directory's row shape. */
export default function ArtistListRow({ artist }: ArtistListRowProps) {
  const { playlists, artUrls, playArtist, playArtistNext, addArtistToPlaylist } = useApp()
  const to = artistPath(artist.name)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link
          to={to}
          className="group flex items-center gap-3 px-2 py-2 rounded-md transition-colors hover:bg-accent/50"
        >
          <GeneratedArt
            name={artist.name}
            src={artUrls[artistArtId(artist.name)]}
            className="h-12 w-12 shrink-0 rounded-full"
          />

          <p className="min-w-0 flex-1 text-sm truncate group-hover:text-foreground">
            {artist.name}
          </p>

          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {artist.trackCount} {artist.trackCount === 1 ? 'track' : 'tracks'}
            {' · '}
            {artist.albumCount} {artist.albumCount === 1 ? 'album' : 'albums'}
          </span>
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

