import type { Playlist, QueueItem, Track } from '@/types/music'
import QueueList from '@/components/queue/QueueList'

/**
 * QueueSidePanel �?桌面端右侧固定的队列面板�?
 *
 * 作为布局的一部分，压缩主内容区域而不是覆盖它�?
 * 通过 CSS transition 平滑展开/收起�?
 */

interface QueueSidePanelProps {
  open: boolean
  queue: QueueItem[]
  currentQueueIndex: number
  tracks: Track[]
  playlists: Playlist[]
  onPlayQueueItem: (queueIndex: number) => void
  onRemoveQueueItem: (queueItemId: string) => void
  onAddToPlaylist?: (trackId: string, playlistId: string) => void
  onPlayNextTrack?: (trackId: string) => void
  onAddToQueue?: (trackId: string) => void
  onClose: () => void
}

export default function QueueSidePanel({
  open,
  queue,
  currentQueueIndex,
  tracks,
  playlists,
  onPlayQueueItem,
  onRemoveQueueItem,
  onAddToPlaylist,
  onPlayNextTrack,
  onAddToQueue,
  onClose,
}: QueueSidePanelProps) {
  return (
    <div
      className={[
        'shrink-0 border-l border-border bg-background flex flex-col overflow-hidden',
        'transition-all duration-300 ease-in-out',
        open ? 'w-[320px] opacity-100' : 'w-0 opacity-0 border-l-0',
      ].join(' ')}
      aria-hidden={!open}
    >
      {open && (
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
          showHeader
        />
      )}
    </div>
  )
}
