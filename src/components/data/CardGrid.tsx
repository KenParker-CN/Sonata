import type { ReactNode } from 'react'

/**
 * Shared card grid. The 220px floor is what every entity card is designed for,
 * so the three library grids stay in step instead of restating the breakpoint.
 */
export default function CardGrid({ children }: { children: ReactNode }) {
  return (
    <div
      className="grid gap-6"
      style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))' }}
    >
      {children}
    </div>
  )
}
