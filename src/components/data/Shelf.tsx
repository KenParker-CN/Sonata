import { ChevronLeft, ChevronRight } from 'lucide-react'
import { useCallback, useEffect, useRef, useState } from 'react'
import { cn } from '@/lib/utils'

interface ShelfProps {
  children: React.ReactNode
  className?: string
}

export default function Shelf({ children, className }: ShelfProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [showLeftArrow, setShowLeftArrow] = useState(false)
  const [showRightArrow, setShowRightArrow] = useState(false)

  // Asked for both while scrolling and after every render: the library arrives
  // long after this component has mounted, and no resize event fires for that.
  const measure = useCallback(() => {
    const strip = scrollRef.current
    if (!strip) return
    const { scrollLeft, scrollWidth, clientWidth } = strip
    setShowLeftArrow(scrollLeft > 0)
    setShowRightArrow(scrollLeft < scrollWidth - clientWidth - 1)
  }, [])

  useEffect(measure)

  // A window resize need not re-render anything, so it is the one case a
  // post-render effect cannot cover.
  useEffect(() => {
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [measure])

  const scroll = (direction: 'left' | 'right') => {
    const strip = scrollRef.current
    if (!strip) return
    // Most of a viewport per press, so the next page always overlaps the last
    // one and a card is never cut in half at the edge.
    const step = strip.clientWidth * 0.8
    strip.scrollTo({
      left: strip.scrollLeft + (direction === 'left' ? -step : step),
      behavior: 'smooth',
    })
  }

  return (
    <div className={cn('relative', className)}>
      {showLeftArrow && (
        <button
          type="button"
          aria-label="Scroll left"
          onClick={() => scroll('left')}
          className="absolute left-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 touch-target items-center justify-center rounded-full bg-background/90 shadow-md transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronLeft size={16} />
        </button>
      )}

      <div
        ref={scrollRef}
        className="overflow-x-auto scrollbar-hide snap-x snap-mandatory"
        onScroll={measure}
      >
        {children}
      </div>

      {/* After the strip in DOM order, so each veil paints over the cards it
          clips. The arrows carry z-10 and stay above them. */}
      {showLeftArrow && (
        <span
          aria-hidden="true"
          className="shelf-fade-start pointer-events-none absolute inset-y-0 left-0 w-10"
        />
      )}
      {showRightArrow && (
        <span
          aria-hidden="true"
          className="shelf-fade-end pointer-events-none absolute inset-y-0 right-0 w-10"
        />
      )}

      {showRightArrow && (
        <button
          type="button"
          aria-label="Scroll right"
          onClick={() => scroll('right')}
          className="absolute right-0 top-1/2 z-10 flex h-8 w-8 -translate-y-1/2 touch-target items-center justify-center rounded-full bg-background/90 shadow-md transition-colors hover:bg-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <ChevronRight size={16} />
        </button>
      )}
    </div>
  )
}
