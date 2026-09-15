import type { ReactNode } from 'react'
import type { LucideIcon } from 'lucide-react'

interface EmptyStateProps {
  title: string
  hint?: ReactNode
  icon?: LucideIcon
  action?: ReactNode
}

/**
 * The one-line "nothing here yet" block list pages fall back to. The Library
 * page keeps its own richer call to action — this covers the browse pages.
 */
export default function EmptyState({ title, hint, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="mx-auto flex max-w-md flex-col items-center justify-center py-28 text-center text-muted-foreground">
      {Icon && (
        <div className="mb-5 flex h-16 w-16 items-center justify-center rounded-2xl border border-border bg-muted/60 text-primary shadow-sm">
          <Icon size={28} strokeWidth={1.6} aria-hidden="true" />
        </div>
      )}
      <p className="text-xl font-semibold tracking-tight text-foreground">{title}</p>
      {hint && <p className="mt-2 text-sm leading-6">{hint}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}
