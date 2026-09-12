import type { LucideIcon } from 'lucide-react'
import type { ViewMode } from '@/hooks/useViewMode'
import { LayoutGrid, List } from 'lucide-react'
import { cn } from '@/lib/utils'

const MODES: { value: ViewMode; label: string; icon: LucideIcon }[] = [
  { value: 'grid', label: 'Grid view', icon: LayoutGrid },
  { value: 'list', label: 'List view', icon: List },
]

interface ViewModeToggleProps {
  /** Accessible name for the pair, e.g. "Albums view". */
  label: string
  value: ViewMode
  onChange: (mode: ViewMode) => void
}

/**
 * Grid/list switch for a page's main collection. Mutually exclusive buttons, so
 * each carries aria-pressed and the group is labelled as a whole.
 */
export default function ViewModeToggle({ label, value, onChange }: ViewModeToggleProps) {
  return (
    <div
      role="group"
      aria-label={label}
      className="flex items-center gap-0.5 rounded-md border border-border bg-card p-0.5"
    >
      {MODES.map(mode => {
        const Icon = mode.icon
        const active = value === mode.value
        return (
          <button
            key={mode.value}
            type="button"
            aria-pressed={active}
            title={mode.label}
            onClick={() => onChange(mode.value)}
            className={cn(
              'touch-target rounded p-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
              active
                ? 'bg-accent text-foreground'
                : 'text-muted-foreground hover:text-foreground',
            )}
          >
            <Icon size={14} />
          </button>
        )
      })}
    </div>
  )
}
