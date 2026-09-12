import { Play } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlayButtonProps {
  onClick: () => void
  /** Accessible name — the visible label is always just "Play". */
  label: string
  className?: string
}

/** Primary pill that starts playback of a whole entity (album, composer, playlist). */
export default function PlayButton({ onClick, label, className }: PlayButtonProps) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className={cn(
        'inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background',
        className,
      )}
    >
      <Play size={15} fill="currentColor" aria-hidden="true" />
      Play
    </button>
  )
}
