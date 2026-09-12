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
    <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
      {Icon && <Icon size={40} className="mb-4 opacity-30" aria-hidden="true" />}
      <p className="text-lg font-medium">{title}</p>
      {hint && <p className="text-sm mt-1">{hint}</p>}
      {action && <div className="mt-4">{action}</div>}
    </div>
  )
}
