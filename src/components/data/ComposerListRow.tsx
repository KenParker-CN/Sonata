import type { Composer } from '@/utils/groupComposers'
import { composerPath } from '@/utils/routes'
import { Link } from 'react-router-dom'
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'
import EntityMenuContent from '@/components/context-menus/EntityContextMenu'
import GeneratedArt from '@/components/media/GeneratedArt'
import { composerArtId } from '@/services/customArt'
import { useApp } from '@/contexts/app'

interface ComposerListRowProps {
  composer: Composer
}

/** List-view twin of ComposerCard  — the directory row the A-Z sections fill. */
export default function ComposerListRow({ composer }: ComposerListRowProps) {
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
        <Link
          to={to}
          className="group flex items-center gap-3 px-2 py-2 rounded-md transition-colors hover:bg-accent/50"
        >
          {/* Portrait once uploaded, otherwise a circle painted from the name */}
          <GeneratedArt
            name={composer.name}
            src={artUrls[composerArtId(composer.name)]}
            className="h-12 w-12 shrink-0 rounded-full"
          />

          <p className="min-w-0 flex-1 text-sm truncate group-hover:text-foreground">
            {composer.name}
          </p>

          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {composer.trackCount} {composer.trackCount === 1 ? 'track' : 'tracks'}
          </span>
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

