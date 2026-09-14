import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { artistPath } from '@/utils/routes'

interface ArtistLinksProps {
  /** Names already split from a tag — parseArtists for artist and albumArtist tags. */
  artists: string[]
  className?: string
}

/**
 * The one way a list of credited names becomes a row of artist links. These rows
 * live inside album cards and track rows that own their own click action and
 * context menu, so both events stop here.
 */
export default function ArtistLinks({ artists, className }: ArtistLinksProps) {
  if (artists.length === 0) return null

  return (
    <span className={cn('block text-xs truncate text-muted-foreground', className)}>
      {artists.map((artist, idx) => (
        <span key={artist}>
          <Link
            to={artistPath(artist)}
            onClick={e => e.stopPropagation()}
            onContextMenu={e => e.stopPropagation()}
            className="hover:text-foreground hover:underline transition-colors"
          >
            {artist}
          </Link>
          {idx < artists.length - 1 && ', '}
        </span>
      ))}
    </span>
  )
}
