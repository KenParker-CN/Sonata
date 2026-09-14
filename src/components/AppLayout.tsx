import { useLayoutEffect, useRef } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import QueueSidePanel from '@/components/QueueSidePanel'
import type { Playlist, QueueItem, Track } from '@/types/music'

/**
 * Layout route shared by every page: sidebar, scroll container, outlet.
 * It used to be a PageWrapper written out per route. Rendering <main> from here
 * means the scroll container survives navigation, which is what lets the scroll
 * position be remembered and put back per path.
 *
 * On desktop, the QueueSidePanel renders as a fixed right-side panel that
 * compresses the main content area. On mobile, the queue is a bottom sheet
 * rendered by App.tsx.
 */

interface AppLayoutProps {
  queueOpen: boolean
  isDesktop: boolean
  queue: QueueItem[]
  currentQueueIndex: number
  tracks: Track[]
  playlists: Playlist[]
  onPlayQueueItem: (queueIndex: number) => void
  onRemoveQueueItem: (queueItemId: string) => void
  onAddToPlaylist?: (trackId: string, playlistId: string) => void
  onPlayNextTrack?: (trackId: string) => void
  onAddToQueue?: (trackId: string) => void
  onCloseQueue: () => void
}

export default function AppLayout({
  queueOpen,
  isDesktop,
  queue,
  currentQueueIndex,
  tracks,
  playlists,
  onPlayQueueItem,
  onRemoveQueueItem,
  onAddToPlaylist,
  onPlayNextTrack,
  onAddToQueue,
  onCloseQueue,
}: AppLayoutProps) {
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
      <main ref={mainRef} onScroll={handleScroll} className="flex-1 overflow-y-auto min-w-0">
        <Outlet />
      </main>
      {isDesktop && (
                <QueueSidePanel
          open={queueOpen}
          queue={queue}
          currentQueueIndex={currentQueueIndex}
          tracks={tracks}
          playlists={playlists}
          onPlayQueueItem={onPlayQueueItem}
          onRemoveQueueItem={onRemoveQueueItem}
          onAddToPlaylist={onAddToPlaylist}
          onPlayNextTrack={onPlayNextTrack}
          onAddToQueue={onAddToQueue}
          onClose={onCloseQueue}
        />
      )}
    </>
  )
}