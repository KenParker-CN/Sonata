import type { LucideIcon } from 'lucide-react'
import BackLink from '@/components/navigation/BackLink'
import EmptyState from '@/components/feedback/EmptyState'

interface NotFoundStateProps {
  title: string
  icon: LucideIcon
  to: string
  backLabel: string
}

/**
 * Detail-page fallback: the URL names an entity whose tracks are gone (removed
 * from the library, or a mistyped link).
 */
export default function NotFoundState({ title, icon, to, backLabel }: NotFoundStateProps) {
  return (
    <div className="page-gutter pt-6">
      <BackLink to={to} label={backLabel} />
      <EmptyState title={title} icon={icon} />
    </div>
  )
}

