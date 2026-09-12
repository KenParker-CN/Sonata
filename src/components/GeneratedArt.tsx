import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { generatedBackground, initialsOf } from '@/utils/generatedArt'

interface GeneratedArtProps {
  /** Seed — the colours and the monogram both come from this name. */
  name: string
  /** Real artwork. The generated tile is what it falls back to. */
  src?: string | null
  /** Geometry: sizing and rounding. The tile paints the box it is given. */
  className?: string
  /** Replaces the monogram, for tiles that read better with a glyph. */
  children?: ReactNode
}

/**
 * Painted tile for entities the library holds no artwork for: artists,
 * composers, playlists and coverless albums. The monogram is decorative — the
 * name always sits beside it in the DOM — so the whole tile is hidden from
 * assistive tech.
 */
export default function GeneratedArt({ name, src = null, className, children }: GeneratedArtProps) {
  if (src) {
    return (
      <div className={cn('overflow-hidden', className)}>
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn('flex items-center justify-center overflow-hidden', className)}
      style={{ background: generatedBackground(name), containerType: 'inline-size' }}
    >
      {children ?? (
        <span className="text-[28cqw] font-semibold leading-none text-white/95 [text-shadow:0_1px_3px_rgb(0_0_0/0.45)]">
          {initialsOf(name)}
        </span>
      )}
    </div>
  )
}
