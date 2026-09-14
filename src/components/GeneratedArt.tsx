import type { ReactNode } from 'react'
import { cn } from '@/lib/utils'
import { initialsOf } from '@/utils/generatedArt'

interface GeneratedArtProps {
  name: string
  src?: string | null
  className?: string
  children?: ReactNode
}

export default function GeneratedArt({ name, src = null, className, children }: GeneratedArtProps) {
  return (
    <div
      className={cn('relative overflow-hidden bg-muted [container-type:inline-size]', className)}
      aria-hidden={src ? undefined : true}
    >
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <div className="flex h-full w-full items-center justify-center text-[28cqw] font-semibold leading-none">
          {children ?? initialsOf(name)}
        </div>
      )}
    </div>
  )
}
