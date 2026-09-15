import { cn } from '@/lib/utils'
import type { AudioQualityBadge as AudioQualityBadgeType } from '@/utils/getAudioQualityBadge'

interface AudioQualityBadgeProps {
  badge: AudioQualityBadgeType | null
  className?: string
  /** Force the dark-surface palette: the player bar is charcoal in both themes. */
  onDark?: boolean
}
export default function AudioQualityBadge({ badge, className, onDark }: AudioQualityBadgeProps) {
  if (!badge) return null
  return (
    <span
      role="img"
      aria-label={`Audio quality: ${badge.label}`}
      title={badge.label}
      className={cn(
        'quality-block',
        `quality-block-${badge.variant}`,
        onDark && 'quality-block-on-dark',
        className,
      )}
    >
      <span className="quality-block-mark" aria-hidden="true" />
      <span>{badge.detail}</span>
    </span>
  )
}
