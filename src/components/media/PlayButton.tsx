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
        'btn btn-primary rounded-full px-6',
        className,
      )}
    >
      <Play size={15} fill="currentColor" aria-hidden="true" />
      Play
    </button>
  )
}
