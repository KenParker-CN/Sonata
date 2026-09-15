import type { Playlist, QueueItem, Track } from '@/types/music'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/Drawer'
import QueueList from '@/components/queue/QueueList'
import { X, ListMusic } from 'lucide-react'

/**
 * QueuePanel  — 移动端底部弹出的队列面板 — 
 *
 * 桌面端使 — QueueSidePanel（右侧固定面板），移动端使用本组件（底部弹出） — 
 * 两者共 — QueueList 作为列表展示层 — 
 */

interface QueuePanelProps {
  open: boolean
  onClose: () => void
  queue: QueueItem[]
  currentQueueIndex: number
  tracks: Track[]
  playlists: Playlist[]
  onPlayQueueItem: (queueIndex: number) => void
  onRemoveQueueItem: (queueItemId: string) => void
  onAddToPlaylist?: (trackId: string, playlistId: string) => void
  onPlayNextTrack?: (trackId: string) => void
  onAddToQueue?: (trackId: string) => void
}

export default function QueuePanel({
  open,
  onClose,
  queue,
  currentQueueIndex,
  tracks,
  playlists,
  onPlayQueueItem,
  onRemoveQueueItem,
  onAddToPlaylist,
  onPlayNextTrack,
  onAddToQueue,
}: QueuePanelProps) {
  return (
    <Drawer
      open={open}
      onOpenChange={next => { if (!next) onClose() }}
    >
      <DrawerContent
        direction="bottom"
        className="h-[80vh] max-h-150"
      >
        <DrawerHeader className="flex flex-row items-start justify-between gap-3 pb-2 text-left">
          <div className="min-w-0 space-y-1">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <ListMusic size={16} className="text-muted-foreground" />
              Queue
            </DrawerTitle>
          </div>
          <DrawerClose
            aria-label="Close queue"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={16} />
          </DrawerClose>
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-hidden">
                    <QueueList
            queue={queue}
            currentQueueIndex={currentQueueIndex}
            tracks={tracks}
            playlists={playlists}
            onPlayQueueItem={onPlayQueueItem}
            onRemoveQueueItem={onRemoveQueueItem}
            onAddToPlaylist={onAddToPlaylist}
            onPlayNextTrack={onPlayNextTrack}
            onAddToQueue={onAddToQueue}
            onClose={onClose}
          />
        </div>
      </DrawerContent>
    </Drawer>
  )
}
