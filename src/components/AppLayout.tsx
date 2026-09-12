import { useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'

/**
 * Layout route shared by every page: sidebar, scroll container, outlet.
 * It used to be a PageWrapper written out per route. Rendering <main> from here
 * means the scroll container survives navigation, which is what lets the scroll
 * position be remembered and put back per path.
 */
export default function AppLayout() {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)
  // Path the scroll events below belong to; updated with each committed route.
  const pathRef = useRef(location.pathname)
  const scrollTopByPath = useRef(new Map<string, number>())

  useLayoutEffect(() => {
    const main = mainRef.current
    if (!main) return
    main.scrollTo(0, scrollTopByPath.current.get(location.pathname) ?? 0)
    pathRef.current = location.pathname
  }, [location.pathname])

  // Saved on scroll rather than at navigation time: by then the outgoing page's
  // content is already gone and the container has clamped its own position.
  const handleScroll = () => {
    const main = mainRef.current
    if (main) scrollTopByPath.current.set(pathRef.current, main.scrollTop)
  }

  return (
    <>
      <Sidebar />
      <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto">
        <Outlet />
      </main>
    </>
  )
}
