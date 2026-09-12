import { ArrowLeft } from 'lucide-react'
import { Link } from 'react-router-dom'

interface BackLinkProps {
  /** Route of the list page this detail page belongs to. */
  to: string
  /** Screen-reader text, e.g. "Back to artists". */
  label: string
}

/**
 * Back affordance at the top of a detail page. The visible text stays short;
 * the destination lives in the accessible name.
 */
export default function BackLink({ to, label }: BackLinkProps) {
  return (
    <Link
      to={to}
      aria-label={label}
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground hover:underline transition-colors mb-6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      <ArrowLeft size={16} aria-hidden="true" />
      Back
    </Link>
  )
}
