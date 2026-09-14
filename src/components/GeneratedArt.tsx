import type { ReactNode } from 'react'
import { Avatar } from '@heroui/react'
import { cn } from '@/lib/utils'
import { initialsOf } from '@/utils/generatedArt'

interface GeneratedArtProps {
  /** Seed — the fallback monogram comes from this name. */
  name: string
  /** Real artwork. The avatar fallback is what it falls back to. */
  src?: string | null
  /** Geometry: sizing and rounding. The avatar paints the box it is given. */
  className?: string
  /** Replaces the monogram, for tiles that read better with a glyph. */
  children?: ReactNode
}

/**
 * Entity artwork: the real image when there is one, otherwise a HeroUI Avatar
 * with the name's initials on the library's default surface. The tile is a
 * size container, and the monogram scales with it (cqw), so the same initials
 * read correctly at list-row and full-cover size.
 *
 * The monogram is decorative — the name always sits beside it in the DOM — so
 * the fallback tile is hidden from assistive tech.
 */
export default function GeneratedArt({ name, src = null, className, children }: GeneratedArtProps) {
  return (
    <Avatar
      className={cn('[container-type:inline-size]', className)}
      aria-hidden={src ? undefined : true}
    >
      {src && <Avatar.Image src={src} alt="" loading="lazy" />}
      {children ?? (
        <Avatar.Fallback className="text-[28cqw] font-semibold leading-none">
          {initialsOf(name)}
        </Avatar.Fallback>
      )}
    </Avatar>
  )
}
