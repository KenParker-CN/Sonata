import { useEffect, useMemo, useRef } from 'react'
import type { ReactNode, Ref } from 'react'
import type { Playlist, QueueItem, Track } from '@/types/music'
import { parseArtists } from '@/utils/parseArtists'
import { cn } from '@/lib/utils'
import { MoreHorizontal, Play, ListMusic, X, ChevronDown } from 'lucide-react'
import { TrackDropdownContent } from '@/components/TrackContextMenu'

/**
 * QueueList — 队列列表的纯展示层。
 *
 * 不关心自己是嵌在右侧固定面板里，还是从底部弹起。
 * 这一层只负责：把 queue 数据渲染成可交互的行。
 */

interface QueueListProps {
  queue: QueueItem[]
  currentQueueIndex: number
  tracks: Track[]
  playlists: Playlist[]
  onPlayQueueItem: (queueIndex: number) => void
  onRemoveQueueItem: (queueItemId: string) => void
  onAddToPlaylist?: (trackId: string, playlistId: string) => void
  onPlayNextTrack?: (trackId: string) => void
  onAddToQueue?: (trackId: string) => void
  onClose?: () => void
  showHeader?: boolean
}

type Section = 'history' | 'playing' | 'upnext'

const sectionLabel: Record<Section, string> = {
  history: 'Previously Played',
  playing: 'Now Playing',
  upnext: 'Up Next',
}

function QueueRow({
  queueIndex,
  queueItemId,
  track,
  section,
  onPlay,
  rowRef,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  onRemoveFromQueue,
  playlists,
}: {
  queueIndex: number
  queueItemId: string
  track: Track | null
  section: Section
  onPlay: (queueIndex: number) => void
  rowRef?: Ref<HTMLDivElement>
  onPlayNext?: (trackId: string) => void
  onAddToQueue?: (trackId: string) => void
  onAddToPlaylist?: (trackId: string, playlistId: string) => void
  onRemoveFromQueue?: (queueItemId: string) => void
  playlists: Playlist[]
}) {
  const isCurrent = section === 'playing'

  return (
    <div
      ref={rowRef}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-md transition-colors group',
        isCurrent ? 'bg-accent' : 'hover:bg-accent/50',
      )}
    >
      {/* Clickable area - plays the track */}
      <button
        type="button"
        onClick={() => onPlay(queueIndex)}
        aria-current={isCurrent ? 'true' : undefined}
        className={cn(
          'flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded',
        )}
      >
        {/* Cover */}
        <div className="w-10 h-10 shrink-0 rounded overflow-hidden bg-muted">
          {track?.cover ? (
            <img src={track.cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Play size={14} className="text-muted-foreground/40" />
            </div>
          )}
        </div>

        {/* Title / artist */}
        <div className="min-w-0 flex-1 text-left">
          <p className={cn('text-sm truncate', isCurrent ? 'font-medium text-foreground' : 'text-foreground')}>
            {track?.title ?? 'Track not found'}
          </p>
          <p className="text-xs text-muted-foreground truncate">
            {track?.artist ? parseArtists(track.artist).join(', ') : ''}
          </p>
        </div>
      </button>

      {track && (
        <div className="dropdown dropdown-end shrink-0">
          <button
            type="button"
            tabIndex={0}
            aria-label="More options"
            className="rounded p-1 text-muted-foreground opacity-0 group-hover:opacity-100 hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <MoreHorizontal size={14} />
          </button>
          <TrackDropdownContent
            track={track}
            playlists={playlists}
            onPlayNext={onPlayNext}
            onAddToQueue={onAddToQueue}
            onAddToPlaylist={onAddToPlaylist}
            links={{ album: true, artist: true, composer: false }}
            onRemoveFromQueue={() => onRemoveFromQueue?.(queueItemId)}
          />
        </div>
      )}
    </div>
  )
}

function SectionHeading({ children }: { children: ReactNode }) {
  return (
    <div className="px-3 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
      {children}
    </div>
  )
}

export default function QueueList({
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
  showHeader,
}: QueueListProps) {
  const listRef = useRef<HTMLDivElement>(null)
  const currentRef = useRef<HTMLDivElement>(null)

  // When the current track changes, keep it visible in the viewport
  useEffect(() => {
    if (currentQueueIndex >= 0 && currentRef.current) {
      currentRef.current.scrollIntoView({ block: 'nearest' })
    }
  }, [currentQueueIndex])

  // Build a map of track ID to track for lookups
  const trackMap = useMemo(() => {
    const map = new Map<string, Track>()
    for (const t of tracks) {
      map.set(t.id, t)
    }
    return map
  }, [tracks])

  const upNextCount = queue.length > 0 ? queue.length - currentQueueIndex - 1 : 0
  const hasCurrent = currentQueueIndex >= 0 && currentQueueIndex < queue.length

  const rowFor = (idx: number, section: Section) => {
    const q = queue[idx]
    const track = (q ? trackMap.get(q.trackId) : null) ?? null
    const ref = idx === currentQueueIndex ? currentRef : undefined

    return (
      <QueueRow
        key={q?.id ?? idx}
        queueIndex={idx}
        queueItemId={q?.id ?? ''}
        track={track}
        section={section}
                onPlay={onPlayQueueItem}
        rowRef={ref}
        onPlayNext={onPlayNextTrack}
        onAddToQueue={onAddToQueue}
        onAddToPlaylist={onAddToPlaylist}
        onRemoveFromQueue={onRemoveQueueItem}
        playlists={playlists}
      />
    )
  }

  const renderRow = (idx: number, section: Section) => rowFor(idx, section)

  return (
    <div className="flex h-full min-h-0 flex-col">
      {showHeader && (
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            <ListMusic size={16} className="text-muted-foreground shrink-0" />
            <h2 className="text-sm font-semibold text-foreground">Queue</h2>
          </div>
          <div className="flex items-center gap-1 shrink-0">
            {queue.length > 0 && (
              <button
                onClick={() => {
                  // Clear queue from index 0 to currentQueueIndex (keep current)
                  for (let i = 0; i < currentQueueIndex; i++) {
                    onRemoveQueueItem(queue[i].id)
                  }
                  for (let i = queue.length - 1; i > currentQueueIndex; i--) {
                    onRemoveQueueItem(queue[i].id)
                  }
                }}
                aria-label="Clear queue"
                title="Clear queue"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <X size={14} />
              </button>
            )}
            {onClose && (
              <button
                onClick={onClose}
                aria-label="Close queue"
                className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <ChevronDown size={14} />
              </button>
            )}
          </div>
        </div>
      )}

      {/* Queue content */}
      <div ref={listRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-2 py-2 focus:outline-none">
        {queue.length === 0 ? (
          <div className="flex h-full flex-col items-center justify-center gap-2 py-14 text-center">
            <ListMusic size={28} className="text-muted-foreground/40" />
            <p className="text-sm text-muted-foreground">Your queue is empty</p>
            <p className="text-xs text-muted-foreground/70">
              Play a track or use "Add to Queue" to build one.
            </p>
          </div>
        ) : hasCurrent ? (
          <>
            {currentQueueIndex > 0 && (
              <>
                <SectionHeading>{sectionLabel.history}</SectionHeading>
                {queue.slice(0, currentQueueIndex).map((_, i) => renderRow(i, 'history'))}
              </>
            )}

            <SectionHeading>{sectionLabel.playing}</SectionHeading>
            {renderRow(currentQueueIndex, 'playing')}

            {upNextCount > 0 && (
              <>
                <SectionHeading>{sectionLabel.upnext}</SectionHeading>
                {queue
                  .slice(currentQueueIndex + 1)
                  .map((_, i) => renderRow(currentQueueIndex + 1 + i, 'upnext'))}
              </>
            )}
          </>
        ) : (
          <>
            <SectionHeading>{sectionLabel.upnext}</SectionHeading>
            {queue.map((_, i) => renderRow(i, 'upnext'))}
          </>
        )}
      </div>
    </div>
  )
}
