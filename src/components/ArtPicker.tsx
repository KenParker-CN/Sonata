import type { ArtId } from '@/services/customArt'
import { useRef, useState } from 'react'
import { ImageOff, ImageUp } from 'lucide-react'
import CoverArt from '@/components/CoverArt'
import { cn } from '@/lib/utils'
import { useApp } from '@/contexts/app'

interface ArtPickerProps {
  /** Seed for the generated tile when there is no artwork at all. */
  name: string
  /** Artwork in display order; empty paints a tile from `name`. */
  covers?: string[]
  /** Omit for artwork that comes from the files; give it to make the box editable. */
  upload?: { artId: ArtId; noun: string }
  /** Geometry, merged over the default detail-page cover box. */
  className?: string
}

/**
 * Large artwork in a detail-page header, optionally editable. An entity that
 * carries no artwork of its own — artists, composers, playlists — falls back to
 * a 2x2 mosaic of its tracks' covers and then to a painted monogram, so the box
 * is never empty.
 *
 * The overlay is revealed on hover and on keyboard focus, and simply stays on
 * for touch, where a hover state never arrives.
 */
export default function ArtPicker({ name, covers = [], upload, className }: ArtPickerProps) {
  const { artUrls, setCustomArt, clearCustomArt } = useApp()
  const inputRef = useRef<HTMLInputElement>(null)
  const [error, setError] = useState<string | null>(null)
  const custom = upload ? (artUrls[upload.artId] ?? null) : null

  const box = cn(
    'w-40 h-40 sm:w-64 sm:h-64 shrink-0 rounded-lg overflow-hidden bg-muted mx-auto sm:mx-0',
    className,
  )
  const pill =
    'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1.5 text-[11px] font-medium ' +
    'text-white transition-colors hover:bg-white/25 focus-visible:outline-none ' +
    'focus-visible:ring-2 focus-visible:ring-white/80 touch-target'

  if (!upload) {
    return (
      <div className={box}>
        <CoverArt name={name} covers={covers} className="h-full w-full" />
      </div>
    )
  }

  const { artId, noun } = upload

  const pick = async (file: File | undefined) => {
    if (!file) return
    setError(null)
    try {
      await setCustomArt(artId, file)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not use that image')
    }
  }

  const remove = async () => {
    setError(null)
    try {
      await clearCustomArt(artId)
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Could not remove the image')
    }
  }

  return (
    <div className={cn('group/art relative', box)}>
      <CoverArt name={name} covers={covers} custom={custom} className="h-full w-full" />
      <div
        onClick={() => setError(null)}
        className={cn(
          'absolute inset-0 flex flex-col items-center justify-center gap-1.5 bg-black/55 p-2',
          'text-center text-[11px] font-medium text-white transition-opacity',
          error
            ? 'opacity-100'
            : 'opacity-0 focus-within:opacity-100 group-hover/art:opacity-100 touch:opacity-100',
        )}
      >
        {error && <p className="leading-snug">{error}</p>}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="sr-only"
          onChange={event => {
            void pick(event.target.files?.[0])
            event.target.value = ''
          }}
        />
        <div className="flex flex-wrap items-center justify-center gap-1.5">
          <button
            type="button"
            onClick={() => inputRef.current?.click()}
            aria-label={`Upload a ${noun}`}
            className={pill}
          >
            <ImageUp size={14} />
            {custom ? 'Replace' : 'Upload'}
          </button>
          {custom && (
            <button type="button" onClick={() => void remove()} aria-label={`Remove the ${noun}`} className={pill}>
              <ImageOff size={14} />
              Remove
            </button>
          )}
        </div>
      </div>
    </div>
  )
}
