import type { Track } from '@/types/music'
import { parseClassicalTitle } from '@/utils/parseClassicalTitle'
import { parseArtists } from '@/utils/parseArtists'
import { formatTime, formatDurationLong } from '@/utils/formatTime'
import { ArrowLeft, Disc3, Play, SkipForward, SkipBack, ListMusic, Menu, MoreHorizontal, ChevronUp, ChevronDown } from 'lucide-react'
import { useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { cn } from '@/lib/utils'
import {
  ContextMenu,
  ContextMenuTrigger,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
} from '@/components/ui/ContextMenu'
import AudioQualityBadge from '@/components/AudioQualityBadge'
import { getAlbumQualityBadge } from '@/utils/getAudioQualityBadge'

interface AlbumDetailPageProps {
  tracks: Track[]
  currentIndex: number
  onTrackSelect: (index: number) => void
  onPlayAlbum?: (albumName: string, albumArtist: string) => void
  onOpenSidebar?: () => void
}

interface WorkGroup {
  work: string
  entries: { trackIndex: number; movement: string | null }[]
}

interface DiscGroup {
  discNumber: number
  tracks: { trackIndex: number; track: Track }[]
  workGroups: WorkGroup[]
}

// Group consecutive tracks by parsed work title.
// Tracks that share the same work and are adjacent in the original order
// are collapsed into a single group.
function groupTracksByWork(
  tracks: Track[],
  trackIndices: number[]
): WorkGroup[] {
  const groups: WorkGroup[] = []

  for (const idx of trackIndices) {
    const track = tracks[idx]
    const parsed = parseClassicalTitle(track.title)

    const lastGroup = groups[groups.length - 1]
    if (lastGroup && lastGroup.work === parsed.work) {
      lastGroup.entries.push({ trackIndex: idx, movement: parsed.movement })
    } else {
      groups.push({
        work: parsed.work,
        entries: [{ trackIndex: idx, movement: parsed.movement }],
      })
    }
  }

  return groups
}

// Extract disc number from the file path or filename.
// Scans path segments from the filename outward to parent folders, matching
// patterns like CD1, CD 1, Disc1, Disc 1, CD01, Disc01 (case-insensitive).
// This catches disc info stored either in the filename or in a folder name.
function extractDiscNumber(track: Track): number | null {
  const source = track.filePath || (track.fileKey ? track.fileKey.split('|')[0] : '')
  if (!source) return null
  const segments = source.split(/[/\\]/)
  for (let i = segments.length - 1; i >= 0; i--) {
    const match = segments[i].match(/(?:CD|Disc)\s*(\d+)/i)
    if (match) return parseInt(match[1], 10)
  }
  return null
}

// Build sorted DiscGroups from a disc-number → tracks mapping
function buildDiscGroups(
  discMap: Map<number, { trackIndex: number; track: Track }[]>,
  allTracks: Track[]
): DiscGroup[] {
  return Array.from(discMap.entries())
    .sort(([a], [b]) => a - b)
    .map(([discNumber, tracks]) => {
      const sortedTracks = [...tracks].sort(
        (a, b) => (a.track.trackNumber ?? 0) - (b.track.trackNumber ?? 0)
      )
      return {
        discNumber,
        tracks: sortedTracks,
        workGroups: groupTracksByWork(allTracks, sortedTracks.map(t => t.trackIndex)),
      }
    })
}

// Group album tracks by disc number using explicit metadata, filename detection, or inferred boundaries
function groupTracksByDisc(
  albumTracks: Track[],
  allTracks: Track[]
): DiscGroup[] {
  // Strategy 1: ALL tracks have explicit discNumber metadata
  const hasExplicitDiscNumbers = albumTracks.every(t => t.discNumber != null && t.discNumber > 0)

  if (hasExplicitDiscNumbers) {
    const discMap = new Map<number, { trackIndex: number; track: Track }[]>()
    for (const albumTrack of albumTracks) {
      const trackIndex = allTracks.indexOf(albumTrack)
      const discNo = albumTrack.discNumber!
      if (!discMap.has(discNo)) discMap.set(discNo, [])
      discMap.get(discNo)!.push({ trackIndex, track: albumTrack })
    }
    return buildDiscGroups(discMap, allTracks)
  }

  // Strategy 2: ALL tracks have a disc number identifiable from filename or folder path
  // (e.g. "CD1-01-Title.flac" or ".../CD1/01-Title.flac")
  const filenameDiscs = albumTracks.map(t => extractDiscNumber(t))
  if (filenameDiscs.length > 0 && filenameDiscs.every(d => d !== null)) {
    const discMap = new Map<number, { trackIndex: number; track: Track }[]>()
    for (let i = 0; i < albumTracks.length; i++) {
      const discNo = filenameDiscs[i]!
      const trackIndex = allTracks.indexOf(albumTracks[i])
      if (!discMap.has(discNo)) discMap.set(discNo, [])
      discMap.get(discNo)!.push({ trackIndex, track: albumTracks[i] })
    }
    return buildDiscGroups(discMap, allTracks)
  }

  // Strategy 3 (fallback): infer disc boundaries from trackNumber resets.
  // This depends on albumTracks preserving the original FileList order —
  // if the library order places a later disc's tracks first, the disc
  // numbering will be wrong. No reliable correction is possible without
  // disc metadata or filename hints.
  const discs: { trackIndex: number; track: Track }[][] = []
  let currentDisc: { trackIndex: number; track: Track }[] = []
  let lastTrackNo = 0

  for (const albumTrack of albumTracks) {
    const trackIndex = allTracks.indexOf(albumTrack)
    const trackNo = albumTrack.trackNumber ?? 0

    if (currentDisc.length > 0 && (trackNo === 1 || (trackNo > 0 && trackNo < lastTrackNo))) {
      discs.push(currentDisc)
      currentDisc = []
    }

    currentDisc.push({ trackIndex, track: albumTrack })
    lastTrackNo = trackNo
  }

  if (currentDisc.length > 0) {
    discs.push(currentDisc)
  }

  return discs.map((tracks, idx) => {
    const sortedTracks = [...tracks].sort(
      (a, b) => (a.track.trackNumber ?? 0) - (b.track.trackNumber ?? 0)
    )
    return {
      discNumber: idx + 1,
      tracks: sortedTracks,
      workGroups: groupTracksByWork(allTracks, sortedTracks.map(t => t.trackIndex)),
    }
  })
}

export default function AlbumDetailPage({
  tracks,
  currentIndex,
  onTrackSelect,
  onPlayAlbum,
  onOpenSidebar,
}: AlbumDetailPageProps) {
  const navigate = useNavigate()
  const { albumArtist, albumName } = useParams<{ albumArtist: string; albumName: string }>()
  
  // Decode URL params
  const decodedAlbumArtist = albumArtist ? decodeURIComponent(albumArtist) : ''
  const decodedAlbumName = albumName ? decodeURIComponent(albumName) : ''
  
  const album = { name: decodedAlbumName, albumArtist: decodedAlbumArtist }

  // Find the album's cover from the first track that has one
  const albumTracks = tracks.filter(
    t => t.album === album.name && t.albumArtist === album.albumArtist
  )
  const cover = albumTracks.find(t => t.cover)?.cover ?? null
  const discGroups = groupTracksByDisc(albumTracks, tracks)
  const albumBadge = getAlbumQualityBadge(albumTracks)
  const albumDuration = albumTracks.reduce((sum, t) => sum + t.duration, 0)

  // Track expanded state for each work group per disc (default: all expanded)
  const [expandedGroups, setExpandedGroups] = useState<Set<string>>(() => {
    const initialSet = new Set<string>()
    discGroups.forEach(disc => {
      disc.workGroups.forEach((_, idx) => {
        initialSet.add(`${disc.discNumber}-${idx}`)
      })
    })
    return initialSet
  })

  const toggleGroup = (discNumber: number, groupIdx: number) => {
    const key = `${discNumber}-${groupIdx}`
    setExpandedGroups(prev => {
      const next = new Set(prev)
      if (next.has(key)) {
        next.delete(key)
      } else {
        next.add(key)
      }
      return next
    })
  }

  // Which work's "…" menu is open (controlled so the button can open it on click)
  const [openWorkMenuKey, setOpenWorkMenuKey] = useState<string | null>(null)

  if (albumTracks.length === 0) {
    return (
      <div className="px-6 pt-6">
        <button
          onClick={() => navigate('/albums')}
          className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
        >
          <ArrowLeft size={16} />
          Back to Albums
        </button>
        <div className="flex flex-col items-center justify-center py-24 text-muted-foreground">
          <Disc3 size={40} className="mb-4 opacity-30" />
          <p className="text-lg font-medium">Album not found</p>
        </div>
      </div>
    )
  }

  return (
    <div className="px-6 pt-6 pb-8 relative">
      {/* Mobile menu button */}
      <button
        onClick={onOpenSidebar}
        className="lg:hidden absolute top-4 right-4 p-2 rounded-md hover:bg-accent text-muted-foreground hover:text-foreground transition-colors"
      >
        <Menu size={20} />
      </button>

      {/* Back button */}
      <button
        onClick={() => navigate('/albums')}
        aria-label="Back to albums"
        className="flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6"
      >
        <ArrowLeft size={16} />
        Back
      </button>

      {/* Album header */}
      <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-8">
        {/* Cover */}
        <div className="w-40 h-40 sm:w-64 sm:h-64 shrink-0 rounded-lg overflow-hidden bg-muted mx-auto sm:mx-0">
          {cover ? (
            <img src={cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Disc3 size={40} className="sm:hidden text-muted-foreground/30" />
              <Disc3 size={56} className="hidden sm:block text-muted-foreground/30" />
            </div>
          )}
        </div>

        {/* Info — compact stack centered against the cover */}
        <div className="flex flex-col justify-center gap-3 min-w-0 h-auto sm:h-64 text-center sm:text-left">
          <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Album
          </p>
          <div className="space-y-2">
            <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">{album.name}</h1>
            <div className="text-sm sm:text-base text-muted-foreground">
              {parseArtists(album.albumArtist).map((artist, idx) => (
                <span key={idx}>
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      navigate(`/artists/${encodeURIComponent(artist)}`)
                    }}
                    className="hover:text-foreground transition-colors"
                  >
                    {artist}
                  </button>
                  {idx < parseArtists(album.albumArtist).length - 1 && ', '}
                </span>
              ))}
            </div>
          </div>
          <div className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            {albumBadge && <AudioQualityBadge badge={albumBadge} />}
            <span>
              {albumTracks[0]?.releaseDate && `${albumTracks[0].releaseDate} · `}
              {albumTracks.length} {albumTracks.length === 1 ? 'track' : 'tracks'} · {formatDurationLong(albumDuration)}
            </span>
          </div>
          {onPlayAlbum && (
            <div className="flex justify-center sm:justify-start pt-1">
              <button
                type="button"
                onClick={() => onPlayAlbum(album.name, album.albumArtist)}
                className="inline-flex items-center gap-2 rounded-full bg-primary px-6 py-2.5 text-sm font-semibold text-primary-foreground transition hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background"
              >
                <Play size={15} fill="currentColor" />
                Play
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track list */}
      <div className="border-t border-border pt-4">
        {discGroups.map((discGroup, discGroupIdx) => (
          <div key={discGroup.discNumber} className={discGroupIdx > 0 ? 'mt-8' : ''}>
            {/* Disc header */}
            <div className="mb-2 flex items-center gap-2 px-1">
              <span className="h-px w-4 bg-border" aria-hidden="true" />
              <h2 className="text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground/65">Disc {discGroup.discNumber}</h2>
            </div>

            {/* Work groups for this disc */}
            {discGroup.workGroups.map((group, groupIdx) => {
              const hasMovements = group.entries.some(e => e.movement !== null)

              // Non-classical or single-track group without movements:
              // display as regular track rows
              if (!hasMovements) {
                return (
                  <div key={groupIdx} className="mb-2">
                    {group.entries.map(entry => {
                      const track = tracks[entry.trackIndex]
                      const isActive = entry.trackIndex === currentIndex

                      return (
                        <ContextMenu key={entry.trackIndex}>
                          <ContextMenuTrigger asChild>
                            <div
                              onClick={() => onTrackSelect(entry.trackIndex)}
                              className={cn(
                                'w-full flex items-center gap-3 pr-3 py-2 rounded-md text-left transition-colors cursor-pointer',
                                isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                              )}
                            >
                              <span className={cn('text-sm tabular-nums shrink-0 whitespace-nowrap', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                {track.trackNumber != null && track.trackNumber > 0 
                                  ? String(track.trackNumber).padStart(2, '0') 
                                  : ''}
                              </span>
                              <div className="min-w-0 flex-1">
                                <p className={cn('text-sm truncate', isActive && 'font-medium')}>
                                  {track.title}
                                </p>
                                {(() => {
                                  const trackArtists = parseArtists(track.artist || '').filter(a => a.length > 0)
                                  const albumArtists = parseArtists(album.albumArtist)

                                  // The album artist is already in the header — only name
                                  // performers that differ from it.
                                  if (
                                    trackArtists.length > 0 &&
                                    trackArtists.join(', ') !== albumArtists.join(', ')
                                  ) {
                                    return (
                                      <p className={cn('text-xs truncate mt-0.5', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                        {trackArtists.map((artist, idx) => (
                                          <span key={idx}>
                                            <button
                                              onClick={(e) => {
                                                e.stopPropagation()
                                                navigate(`/artists/${encodeURIComponent(artist)}`)
                                              }}
                                              onContextMenu={(e) => {
                                                e.stopPropagation()
                                              }}
                                              className={cn('transition-colors', isActive ? 'hover:text-primary-foreground' : 'hover:text-foreground')}
                                            >
                                              {artist}
                                            </button>
                                            {idx < trackArtists.length - 1 && ', '}
                                          </span>
                                        ))}
                                      </p>
                                    )
                                  }
                                  return null
                                })()}
                              </div>
                              <span className={cn('text-sm tabular-nums shrink-0 whitespace-nowrap', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                {formatTime(track.duration)}
                              </span>
                            </div>
                          </ContextMenuTrigger>
                          <ContextMenuContent className="w-64">
                            <ContextMenuItem onClick={() => onTrackSelect(entry.trackIndex)}>
                              <Play className="mr-2 h-4 w-4" />
                              Play
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <SkipBack className="mr-2 h-4 w-4" />
                              Play Previous
                            </ContextMenuItem>
                            <ContextMenuItem>
                              <SkipForward className="mr-2 h-4 w-4" />
                              Play Next
                            </ContextMenuItem>
                            <ContextMenuSeparator />
                            <ContextMenuItem>
                              <ListMusic className="mr-2 h-4 w-4" />
                              Add to Queue
                            </ContextMenuItem>
                          </ContextMenuContent>
                        </ContextMenu>
                      )
                    })}
                  </div>
                )
              }

              // Classical work with movements
              const groupKey = `${discGroup.discNumber}-${groupIdx}`
              const isExpanded = expandedGroups.has(groupKey)
              return (
                <div key={groupIdx} className="mb-4">
                  {/* Work header — clicking the row toggles expand/collapse */}
                  <div
                    onClick={() => toggleGroup(discGroup.discNumber, groupIdx)}
                    className="w-full flex items-center gap-2 pr-3 py-2 rounded-md text-left hover:bg-accent transition-colors cursor-pointer"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate">{group.work}</p>
                      {/* Show artists below work title in both states */}
                      {(() => {
                        // Use albumArtist from the first track in the group
                        const firstTrack = tracks[group.entries[0].trackIndex]
                        const allArtists = parseArtists(firstTrack.artist || '').filter(a => a.length > 0)
                        if (allArtists.length > 0) {
                          return (
                            <p className="text-xs text-muted-foreground truncate mt-0.5">
                              {allArtists.map((artist, idx) => (
                                <span key={idx}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation()
                                      navigate(`/artists/${encodeURIComponent(artist)}`)
                                    }}
                                    onContextMenu={(e) => {
                                      e.stopPropagation()
                                    }}
                                    className="hover:text-foreground transition-colors"
                                  >
                                    {artist}
                                  </button>
                                  {idx < allArtists.length - 1 && ', '}
                                </span>
                              ))}
                            </p>
                          )
                        }
                        return null
                      })()}
                    </div>
                    {/* Total duration + work actions on the right */}
                    <span className="shrink-0 flex items-center gap-1 text-muted-foreground text-sm">
                      {(() => {
                        const totalDuration = group.entries.reduce(
                          (sum, entry) => sum + (tracks[entry.trackIndex].duration || 0),
                          0
                        )
                        return formatTime(totalDuration)
                      })()}
                      <ContextMenu
                        open={openWorkMenuKey === groupKey}
                        onOpenChange={open => setOpenWorkMenuKey(open ? groupKey : null)}
                      >
                        <ContextMenuTrigger asChild>
                          <button
                            type="button"
                            aria-label={`Actions for ${group.work}`}
                            onClick={e => {
                              e.stopPropagation()
                              setOpenWorkMenuKey(groupKey)
                            }}
                            className="p-1 rounded-md hover:text-foreground transition-colors"
                          >
                            <MoreHorizontal size={16} />
                          </button>
                        </ContextMenuTrigger>
                        <ContextMenuContent className="w-56">
                          <ContextMenuItem onClick={() => onTrackSelect(group.entries[0].trackIndex)}>
                            <Play className="mr-2 h-4 w-4" />
                            Play Work
                          </ContextMenuItem>
                          <ContextMenuItem onClick={() => toggleGroup(discGroup.discNumber, groupIdx)}>
                            {isExpanded
                              ? <ChevronDown className="mr-2 h-4 w-4" />
                              : <ChevronUp className="mr-2 h-4 w-4" />}
                            {isExpanded ? 'Collapse Movements' : 'Expand Movements'}
                          </ContextMenuItem>
                        </ContextMenuContent>
                      </ContextMenu>
                    </span>
                  </div>

                  {/* Movement rows - only show if expanded */}
                  {isExpanded && (
                    <>
                      {group.entries.map((entry, entryIdx) => {
                        const track = tracks[entry.trackIndex]
                        const isActive = entry.trackIndex === currentIndex
                        const movementLabel = entry.movement || track.title
                        // Sequential numbering within the work (starting from first track's trackNumber or 1)
                        const baseNumber = group.entries[0].trackIndex !== undefined 
                          ? tracks[group.entries[0].trackIndex].trackNumber ?? 1 
                          : 1
                        const sequentialNumber = typeof baseNumber === 'number' 
                          ? baseNumber + entryIdx 
                          : entryIdx + 1

                        return (
                          <ContextMenu key={entry.trackIndex}>
                            <ContextMenuTrigger asChild>
                              <div
                                onClick={() => onTrackSelect(entry.trackIndex)}
                                className={cn(
                                  'w-full flex items-center gap-3 pr-3 py-1.5 rounded-md text-left transition-colors cursor-pointer',
                                  isActive ? 'bg-primary text-primary-foreground' : 'hover:bg-accent'
                                )}
                              >
                                <span className={cn('text-sm tabular-nums shrink-0 whitespace-nowrap', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                  {String(sequentialNumber).padStart(2, '0')}
                                </span>
                                <p className={cn('min-w-0 flex-1 text-sm truncate', isActive && 'font-medium')}>
                                  {movementLabel}
                                </p>
                                <span className={cn('text-sm tabular-nums shrink-0 whitespace-nowrap', isActive ? 'text-primary-foreground/70' : 'text-muted-foreground')}>
                                  {formatTime(track.duration)}
                                </span>
                              </div>
                            </ContextMenuTrigger>
                            <ContextMenuContent className="w-64">
                              <ContextMenuItem onClick={() => onTrackSelect(entry.trackIndex)}>
                                <Play className="mr-2 h-4 w-4" />
                                Play
                              </ContextMenuItem>
                              <ContextMenuItem>
                                <SkipBack className="mr-2 h-4 w-4" />
                                Play Previous
                              </ContextMenuItem>
                              <ContextMenuItem>
                                <SkipForward className="mr-2 h-4 w-4" />
                                Play Next
                              </ContextMenuItem>
                              <ContextMenuSeparator />
                              <ContextMenuItem>
                                <ListMusic className="mr-2 h-4 w-4" />
                                Add to Queue
                              </ContextMenuItem>
                            </ContextMenuContent>
                          </ContextMenu>
                        )
                      })}
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
        
        {/* Track list footer */}
        <div className="flex items-center justify-between pt-4 mt-4 border-t border-border text-xs text-muted-foreground">
          {/* Left: copyright */}
          {albumTracks[0]?.copyright && (
            <p>{albumTracks[0].copyright}</p>
          )}
          
          {/* Right: total duration */}
          <p className="ml-auto">
            {formatDurationLong(albumTracks.reduce((sum, t) => sum + t.duration, 0))}
          </p>
        </div>
      </div>
    </div>
  )
}
