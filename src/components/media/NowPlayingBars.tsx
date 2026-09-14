import { cn } from '@/lib/utils'

/**
 * Animated equalizer that stands in for a track's number while it is playing.
 * The bars are driven by the `eq-bar` keyframes in index.css.
 */
export default function NowPlayingBars({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 12 12"
      className={cn('eq-bars h-3.5 w-3.5 text-primary', className)}
      aria-hidden="true"
    >
      <rect x="1" y="1.5" width="2.4" height="9" rx="1" fill="currentColor" />
      <rect x="4.8" y="1.5" width="2.4" height="9" rx="1" fill="currentColor" />
      <rect x="8.6" y="1.5" width="2.4" height="9" rx="1" fill="currentColor" />
    </svg>
  )
}
