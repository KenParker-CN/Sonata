import type { Composer } from '@/utils/groupComposers'
import { Link } from 'react-router-dom'
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'
import EntityMenuContent from '@/components/EntityContextMenu'
import GeneratedArt from '@/components/GeneratedArt'
import { cn } from '@/lib/utils'
import { composerPath } from '@/utils/routes'
import { composerArtId } from '@/services/customArt'
import { useApp } from '@/contexts/app'

interface ComposerCardProps {
  composer: Composer
  className?: string
}

/** Grid-view twin of the composer directory row, built like ArtistCard. */
export default function ComposerCard({ composer, className }: ComposerCardProps) {
  const {
    playlists,
    artUrls,
    playComposer,
    playComposerNext,
    addComposerToPlaylist,
  } = useApp()
  const to = composerPath(composer.name)

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>
        <Link to={to} className={cn('group block', className)}>
          <GeneratedArt
            name={composer.name}
            src={artUrls[composerArtId(composer.name)]}
            className="aspect-square rounded-full mb-3 transition-transform group-hover:scale-[1.02]"
          />

          <p className="text-sm font-semibold truncate leading-snug mb-1">{composer.name}</p>
          <p className="text-xs text-muted-foreground truncate">
            {composer.trackCount} {composer.trackCount === 1 ? 'track' : 'tracks'}
          </p>
        </Link>
      </ContextMenuTrigger>
      <EntityMenuContent
        kind="composer"
        playlists={playlists}
        openTo={to}
        onPlay={() => playComposer(composer.name)}
        onPlayNext={() => playComposerNext(composer.name)}
        onAddToPlaylist={playlistId => addComposerToPlaylist(composer.name, playlistId)}
      />
    </ContextMenu>
  )
}
