import { Play } from 'lucide-react'
import {Button} from '@mui/material'
import {cn} from '@/lib/utils'

interface PlayButtonProps {
  onClick: () => void
  /** Accessible name — the visible label is always just "Play". */
  label: string
  className?: string
}

/** Primary pill that starts playback of a whole entity (album, composer, playlist). */
export default function PlayButton({ onClick, label, className }: PlayButtonProps) {
  return (
    <Button
      type="button"
      onClick={onClick}
      aria-label={label}
      variant="contained"
      startIcon={<Play size={15} fill="currentColor" aria-hidden="true" />}
      className={cn('rounded-full px-6', className)}
      sx={{borderRadius: 999, fontWeight: 600}}
    >
      Play
    </Button>
  )
}
