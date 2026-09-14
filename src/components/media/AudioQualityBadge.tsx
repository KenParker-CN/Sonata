import { cn } from '@/lib/utils'
import type { AudioQualityBadge as AudioQualityBadgeType } from '@/utils/getAudioQualityBadge'

interface AudioQualityBadgeProps {
  badge: AudioQualityBadgeType | null
  className?: string
  /** Force the dark-surface palette: the player bar is charcoal in both themes. */
  onDark?: boolean
}
export default function AudioQualityBadge({ badge, className}: AudioQualityBadgeProps) {
  if (!badge) return null
  return (
    <span
      className={cn(
        'relative inline-flex items-center px-1.5 py-0.5 text-xs font-medium leading-none tracking-wide whitespace-nowrap shrink-0',
        className
      )}
    >
      <h4 className="">
        {badge.label}
      </h4>
    </span>
  )
}

