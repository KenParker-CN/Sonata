import { useEffect, useMemo, useRef } from 'react'
import type { ReactElement } from 'react'
import type { Playlist, QueueItem, Track } from '@/types/music'
import { formatTime } from '@/utils/formatTime'
import { parseArtists } from '@/utils/parseArtists'
import { cn } from '@/lib/utils'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/Drawer'
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'
import TrackMenuContent from '@/components/TrackContextMenu'
import { ChevronUp, ChevronDown, X, Play, ListMusic } from 'lucide-react'

interface QueuePanelProps {
  open: boolean
  onClose: () => void
  queue: QueueItem[]
  currentQueueIndex: number
  tracks: Track[]
  playlists: Playlist[]
  onPlayQueueItem: (queueIndex: number) => void
  onRemoveQueueItem: (queueItemId: string) => void
  onMoveQueueItem: (fromIndex: number, toIndex: number) => void
  onAddToPlaylist?: (trackId: string, playlistId: string) => void
}

type Section = 'history' | 'playing' | 'upnext'

const sectionLabel: Record<Section, string> = {
  history: 'Previously Played',
  playing: 'Now Playing',
  upnext: 'Up Next',
}

function QueueRow({
  queueIndex,
  item,
  track,
  section,
  canMoveUp,
  canMoveDown,
  onPlay,
  onRemove,
  onMoveUp,
  onMoveDown,
  rowRef,
  menu,
}: {
  queueIndex: number
  item: QueueItem
  track: Track | null
  section: Section
  canMoveUp: boolean
  canMoveDown: boolean
  onPlay: (queueIndex: number) => void
  onRemove: (queueItemId: string) => void
  onMoveUp: () => void
  onMoveDown: () => void
  rowRef?: (node: HTMLDivElement | null) => void
  // Rendered inside a ContextMenu so the row offers the standard track actions.
  menu?: ReactElement
}) {
  const isCurrent = section === 'playing'

  const row = (
    <div
      ref={rowRef}
      onClick={() => onPlay(queueIndex)}
      aria-current={isCurrent ? 'true' : undefined}
      className={cn(
        'flex items-center gap-2.5 px-3 py-2 rounded-md cursor-pointer transition-colors group',
        isCurrent ? 'bg-accent' : 'hover:bg-accent/50',
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

      {/* Duration */}
      <span className="text-xs text-muted-foreground tabular-nums shrink-0">
        {track ? formatTime(track.duration) : ''}
      </span>

      {/* Hover actions — also revealed on keyboard focus and on touch, where neither exists */}
      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity shrink-0 touch:opacity-100">
        {section === 'upnext' && (
          <>
            <button
              onClick={e => { e.stopPropagation(); onMoveUp() }}
              disabled={!canMoveUp}
              aria-label="Move up in queue"
              className="p-1.5 rounded hover:bg-accent text-muted-foreground disabled:pointer-events-none disabled:opacity-40 touch-target"
            >
              <ChevronUp size={14} />
            </button>
            <button
              onClick={e => { e.stopPropagation(); onMoveDown() }}
              disabled={!canMoveDown}
              aria-label="Move down in queue"
              className="p-1.5 rounded hover:bg-accent text-muted-foreground disabled:pointer-events-none disabled:opacity-40 touch-target"
            >
              <ChevronDown size={14} />
            </button>
          </>
        )}
        <button
          onClick={e => { e.stopPropagation(); onRemove(item.id) }}
          aria-label="Remove from queue"
          className="p-1.5 rounded hover:bg-accent text-muted-foreground touch-target"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  )

  if (!menu) return row

  return (
    <ContextMenu>
      <ContextMenuTrigger asChild>{row}</ContextMenuTrigger>
      {menu}
    </ContextMenu>
  )
}

function SectionHeading({ children }: { children: string }) {
  return (
    <p className="px-3 pt-4 pb-1 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
      {children}
    </p>
  )
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
  onMoveQueueItem,
  onAddToPlaylist,
}: QueuePanelProps) {
  const playingRowRef = useRef<HTMLDivElement | null>(null)
  const listRef = useRef<HTMLDivElement | null>(null)

  // The panel is opened programmatically rather than via a DrawerTrigger, so
  // focus has to be moved inside explicitly — otherwise it stays on the
  // PlayerBar button, which the modal has already marked aria-hidden.
  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => {
      listRef.current?.focus()
      // Opening on a long queue should land on the current track, not the top.
      playingRowRef.current?.scrollIntoView({ block: 'center' })
    })
  }, [open])

  const hasCurrent = currentQueueIndex >= 0 && currentQueueIndex < queue.length
  const upNextCount = hasCurrent ? queue.length - currentQueueIndex - 1 : queue.length

  const trackById = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks])

  const renderRow = (queueIndex: number, section: Section) => {
    const item = queue[queueIndex]
    const track = trackById.get(item.trackId) ?? null
    return (
      <QueueRow
        key={item.id}
        queueIndex={queueIndex}
        item={item}
        track={track}
        section={section}
        // Reordering is limited to upcoming items; they must not be pushed
        // above the first "Up Next" slot, which would displace the current track.
        canMoveUp={queueIndex > currentQueueIndex + 1}
        canMoveDown={queueIndex < queue.length - 1}
        onPlay={onPlayQueueItem}
        onRemove={onRemoveQueueItem}
        onMoveUp={() => onMoveQueueItem(queueIndex, queueIndex - 1)}
        onMoveDown={() => onMoveQueueItem(queueIndex, queueIndex + 1)}
        rowRef={section === 'playing' ? node => { playingRowRef.current = node } : undefined}
        menu={track ? (
          <TrackMenuContent
            track={track}
            playlists={playlists}
            onAddToPlaylist={onAddToPlaylist}
            onNavigate={onClose}
            onRemoveFromQueue={() => onRemoveQueueItem(item.id)}
          />
        ) : undefined}
      />
    )
  }

  return (
    <Drawer
      direction="right"
      // Non-modal, so the player bar under the panel stays clickable — a dimmed
      // but inert bar would still read as covered.
      modal={false}
      shouldScaleBackground={false}
      open={open}
      onOpenChange={next => { if (!next) onClose() }}
    >
      <DrawerContent
        direction="right"
        className="bottom-[var(--player-height)]"
        overlayClassName="bg-transparent bottom-[var(--player-height)]"
      >
        <DrawerHeader className="flex flex-row items-start justify-between gap-3 pb-2 text-left">
          <div className="min-w-0 space-y-1">
            <DrawerTitle className="flex items-center gap-2 text-base">
              <ListMusic size={16} className="text-muted-foreground" />
              Queue
            </DrawerTitle>
            <DrawerDescription>
              {queue.length === 0
                ? 'Nothing queued'
                : `${queue.length} ${queue.length === 1 ? 'track' : 'tracks'} · ${upNextCount} upcoming`}
            </DrawerDescription>
          </div>
          <DrawerClose
            aria-label="Close queue"
            className="shrink-0 rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={16} />
          </DrawerClose>
        </DrawerHeader>

        <div ref={listRef} tabIndex={-1} className="min-h-0 flex-1 overflow-y-auto px-2 pb-4 focus:outline-none">
          {queue.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center gap-2 py-14 text-center">
              <ListMusic size={28} className="text-muted-foreground/40" />
              <p className="text-sm text-muted-foreground">Your queue is empty</p>
              <p className="text-xs text-muted-foreground/70">
                Play a track or use “Add to Queue” to build one.
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
            // A queue with nothing selected yet: every entry is still reorderable.
            <>
              <SectionHeading>{sectionLabel.upnext}</SectionHeading>
              {queue.map((_, i) => renderRow(i, 'upnext'))}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
