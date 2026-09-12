import { cn } from '@/lib/utils'
import type { AudioQualityBadge as AudioQualityBadgeType } from '@/utils/getAudioQualityBadge'
import { ShimmeringText } from '@/components/animate-ui/primitives/texts/shimmering'

interface AudioQualityBadgeProps {
  badge: AudioQualityBadgeType | null
  className?: string
  /** Force the dark-surface palette: the player bar is charcoal in both themes. */
  onDark?: boolean
}

const variantStyles: Record<string, { color: string; shimmeringColor: string }> = {
  'master': {
    color: 'var(--color-neutral-500, #6b7280)',
    shimmeringColor: 'var(--color-neutral-300, #d1d5db)',
  },
  'hi-res': {
    color: '#92400e',
    shimmeringColor: '#fbbf24',
  },
  'cd': {
    color: '#0369a1',
    shimmeringColor: '#7dd3fc',
  },
  'hq': {
    color: '#047857',
    shimmeringColor: '#6ee7b7',
  },
}

const onDarkVariantStyles: Record<string, { color: string; shimmeringColor: string }> = {
  'master': {
    color: 'var(--color-neutral-400, #9ca3af)',
    shimmeringColor: 'var(--color-neutral-200, #e5e7eb)',
  },
  'hi-res': {
    color: '#fbbf24',
    shimmeringColor: '#fef3c7',
  },
  'cd': {
    color: '#7dd3fc',
    shimmeringColor: '#e0f2fe',
  },
  'hq': {
    color: '#6ee7b7',
    shimmeringColor: '#d1fae5',
  },
}

export default function AudioQualityBadge({ badge, className, onDark = false }: AudioQualityBadgeProps) {
  if (!badge) return null

  const styles = onDark ? onDarkVariantStyles : variantStyles
  const variantStyle = styles[badge.variant]

  return (
    <span
      className={cn(
        'relative inline-flex items-center px-1.5 py-0.5 text-xs font-medium leading-none tracking-wide whitespace-nowrap shrink-0',
        className
      )}
    >
      <ShimmeringText className="font-mono text-[15px]"
        text={badge.label}
        color={variantStyle.color}
        shimmeringColor={variantStyle.shimmeringColor}
        duration={1.5}
      />
    </span>
  )
}
