import { cn } from '@/lib/utils'
import type { AudioQualityBadge as AudioQualityBadgeType } from '@/utils/getAudioQualityBadge'

interface AudioQualityBadgeProps {
  badge: AudioQualityBadgeType | null
  className?: string
}

const variantClasses = {
  // MASTER carries its own metal plate treatment in index.css
  'master': 'badge-master',
  'hi-res': 'bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-200',
  'cd': 'bg-sky-100 text-sky-700 dark:bg-sky-950 dark:text-sky-300',
  'hq': 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/70 dark:text-emerald-400',
}

export default function AudioQualityBadge({ badge, className }: AudioQualityBadgeProps) {
  if (!badge) return null

  return (
    <span
      className={cn(
        'relative inline-flex items-center overflow-hidden rounded-md px-1.5 py-0.5 text-xs font-medium leading-none tracking-wide whitespace-nowrap shrink-0',
        variantClasses[badge.variant],
        className
      )}
    >
      {badge.variant === 'master' && <span className="badge-master-sheen" aria-hidden="true" />}
      <span className="relative">{badge.label}</span>
    </span>
  )
}
