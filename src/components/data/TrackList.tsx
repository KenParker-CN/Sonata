import type { Playlist, Track } from '@/types/music'
import type { TrackMenuLinks } from '@/components/context-menus/TrackContextMenu'
import { formatTime } from '@/utils/formatTime'
import { parseArtists } from '@/utils/parseArtists'
import { Link } from 'react-router-dom'
import { useEffect, useRef, useState } from 'react'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { cn } from '@/lib/utils'
import { albumPath, trackPath } from '@/utils/routes'
import {
  ContextMenu,
  ContextMenuTrigger,
} from '@/components/ui/ContextMenu'
import ArtistLinks from '@/components/data/ArtistLinks'
import NowPlayingBars from '@/components/media/NowPlayingBars'
import TrackMenuContent from '@/components/context-menus/TrackContextMenu'

const ROW_HEIGHT = 64
const OVERSCAN = 8

interface TrackListProps {
  tracks: Track[]
  currentTrackId: string | null
  playlists: Playlist[]
  onTrackSelect: (index: number) => void
  onPlayNext?: (trackId: string) => void
  onAddToQueue?: (trackId: string) => void
  onAddToPlaylist?: (trackId: string, playlistId: string) => void
  links?: TrackMenuLinks
  onRemoveFromLibrary?: (trackId: string) => void
  onRemoveFromPlaylist?: (trackId: string) => void
  /** Only where the order belongs to the user  — playlists, not the library. */
  onMoveTrack?: (trackId: string, direction: 'up' | 'down') => void
}

export default function TrackList({
  tracks,
  currentTrackId,
  playlists,
  onTrackSelect,
  onPlayNext,
  onAddToQueue,
  onAddToPlaylist,
  links,
  onRemoveFromLibrary,
  onRemoveFromPlaylist,
  onMoveTrack,
}: TrackListProps) {
  const rowsRef = useRef<HTMLDivElement>(null)
  const [range, setRange] = useState({start: 0, end: Math.min(tracks.length, OVERSCAN * 2 + 1)})

  useEffect(() => {
    const rows = rowsRef.current
    if (!rows) return

    const scrollContainer = rows.closest('main')
    const updateRange = () => {
      const rowsRect = rows.getBoundingClientRect()
      const viewportTop = scrollContainer
        ? Math.max(rowsRect.top, scrollContainer.getBoundingClientRect().top)
        : Math.max(rowsRect.top, 0)
      const viewportBottom = scrollContainer
        ? Math.min(rowsRect.bottom, scrollContainer.getBoundingClientRect().bottom)
        : Math.min(rowsRect.bottom, window.innerHeight)
      const firstVisible = Math.max(0, Math.floor((viewportTop - rowsRect.top) / ROW_HEIGHT))
      const visibleCount = Math.ceil(Math.max(0, viewportBottom - viewportTop) / ROW_HEIGHT)
      const start = Math.max(0, firstVisible - OVERSCAN)
      const end = Math.min(tracks.length, firstVisible + visibleCount + OVERSCAN)

      setRange(previous => previous.start === start && previous.end === end ? previous : {start, end})
    }

    if (scrollContainer) {
      scrollContainer.addEventListener('scroll', updateRange, {passive: true})
    } else {
      window.addEventListener('scroll', updateRange, {passive: true})
    }
    window.addEventListener('resize', updateRange)
    updateRange()

    return () => {
      if (scrollContainer) {
        scrollContainer.removeEventListener('scroll', updateRange)
      } else {
        window.removeEventListener('scroll', updateRange)
      }
      window.removeEventListener('resize', updateRange)
    }
  }, [tracks.length])

  return (
    <div className="flex flex-col">
      {/* Column headers */}
      <div className="flex items-center gap-3 px-4 py-2 text-xs text-muted-foreground border-b border-border">
        <span className="w-10" />
        <span className="flex-1 min-w-0">Title</span>
        <span className="w-45 hidden lg:block">Artist</span>
        <span className="w-45 hidden xl:block">Album</span>
        {onMoveTrack && <span className="w-6 shrink-0" />}
        <span className="w-14 text-right">Duration</span>
      </div>

      {/* Track rows */}
      <div ref={rowsRef} className="relative" style={{height: tracks.length * ROW_HEIGHT}}>
        {tracks.slice(range.start, range.end).map((track, offset) => {
          const index = range.start + offset
          const isActive = track.id === currentTrackId
          return (
            <div key={track.id} className="absolute inset-x-0 h-16" style={{top: index * ROW_HEIGHT}}>
              <ContextMenu>
                <ContextMenuTrigger asChild>
                  <div
                    onClick={() => onTrackSelect(index)}
                    className={cn(
                      'group flex h-16 cursor-pointer items-center gap-3 rounded-xl border-l-2 px-4 py-2.5 transition-colors',
                      isActive
                        ? 'border-primary bg-primary/10'
                        : 'border-transparent hover:bg-accent/60',
                    )}
                  >
                    {track.cover ? (
                      <img
                        src={track.cover}
                        alt=""
                        loading="lazy"
                        className="h-11 w-11 shrink-0 rounded-lg object-cover shadow-sm"
                      />
                    ) : (
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-muted-foreground/50"><span className="text-xs">♪</span></div>
                    )}

                    <span className={cn(
                      'flex min-w-0 flex-1 items-center gap-2 truncate text-sm',
                      isActive ? 'font-semibold text-primary' : 'text-foreground',
                    )}>
                      {isActive && <NowPlayingBars />}
                      <Link
                        to={trackPath(track.id)}
                        className="hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {track.title}
                      </Link>
                    </span>

                    <ArtistLinks
                      artists={parseArtists(track.artist)}
                      className="w-45 text-sm hidden lg:block"
                    />

                    <span className="w-45 text-sm text-muted-foreground truncate hidden xl:block">
                      <Link
                        to={albumPath(track.album, track.albumArtist)}
                        onClick={e => e.stopPropagation()}
                        onContextMenu={e => e.stopPropagation()}
                        className="hover:text-foreground hover:underline transition-colors"
                      >
                        {track.album}
                      </Link>
                    </span>

                    {onMoveTrack && (
                      <span className="flex w-6 shrink-0 flex-col items-center gap-0.5">
                        {(['up', 'down'] as const).map(direction => {
                          const Icon = direction === 'up' ? ArrowUp : ArrowDown
                          const atEnd =
                            direction === 'up' ? index === 0 : index === tracks.length - 1
                          return (
                            <button
                              key={direction}
                              type="button"
                              disabled={atEnd}
                              aria-label={`Move ${track.title} ${direction}`}
                              title={`Move ${direction}`}
                              onClick={e => {
                                e.stopPropagation()
                                onMoveTrack(track.id, direction)
                              }}
                              className="touch-target rounded p-0.5 text-muted-foreground/70 transition-colors hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:invisible"
                            >
                              <Icon size={12} />
                            </button>
                          )
                        })}
                      </span>
                    )}

                    <span className="w-14 shrink-0 text-right text-sm text-muted-foreground tabular-nums">
                      {formatTime(track.duration)}
                    </span>
                  </div>
                </ContextMenuTrigger>
                <TrackMenuContent
                  track={track}
                  playlists={playlists}
                  onPlayNext={onPlayNext}
                  onAddToQueue={onAddToQueue}
                  onAddToPlaylist={onAddToPlaylist}
                  links={links}
                  onRemoveFromLibrary={onRemoveFromLibrary}
                  onRemoveFromPlaylist={onRemoveFromPlaylist}
                />
              </ContextMenu>
            </div>
          )
        })}
      </div>
    </div>
  )
}
