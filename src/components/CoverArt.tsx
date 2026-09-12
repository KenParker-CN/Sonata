import { cn } from '@/lib/utils'
import GeneratedArt from '@/components/GeneratedArt'

interface CoverArtProps {
  /** Seed for the generated tile when there is no artwork at all. */
  name: string
  /** Artwork in display order; the first four paint the mosaic. */
  covers: string[]
  /** An uploaded image. It outranks `covers`. */
  custom?: string | null
  /** Geometry: sizing and rounding, as for GeneratedArt. */
  className?: string
}

/**
 * A collection's artwork: its own covers if it has any, a Spotify-style 2x2
 * mosaic from 2 to 4 of them, and a painted monogram when it has none.
 *
 * Mosaic cells repeat the cover list rather than leaving gaps, and four tiles of
 * one identical cover are collapsed to a single full-bleed image — a plain cover
 * cut by grid lines reads as a rendering glitch.
 */
export default function CoverArt({ name, covers, custom = null, className }: CoverArtProps) {
  if (custom) return <GeneratedArt name={name} src={custom} className={className} />

  // A long collection should not build a full set of its artwork just to paint
  // four tiles, so the scan stops as soon as four distinct covers exist.
  const distinct: string[] = []
  for (const cover of covers) {
    if (distinct.length === 4) break
    if (!distinct.includes(cover)) distinct.push(cover)
  }

  if (distinct.length === 0) {
    return <GeneratedArt name={name} className={className} />
  }
  if (distinct.length === 1) {
    return (
      <div className={cn('overflow-hidden', className)}>
        <img src={distinct[0]} alt="" loading="lazy" className="h-full w-full object-cover" />
      </div>
    )
  }

  return (
    <div
      aria-hidden="true"
      className={cn('grid grid-cols-2 grid-rows-2 overflow-hidden', className)}
    >
      {Array.from({ length: 4 }, (_, cell) => (
        <img
          key={cell}
          src={distinct[cell % distinct.length]}
          alt=""
          loading="lazy"
          className="h-full w-full object-cover"
        />
      ))}
    </div>
  )
}
