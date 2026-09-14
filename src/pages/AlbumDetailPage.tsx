import type {Track} from '@/types/music'
import {matchesAlbum} from '@/utils/groupAlbums'
import {groupTracksByWork, type TrackListItem, type WorkItem} from '@/utils/groupTracksByWork'
import {parseArtists} from '@/utils/parseArtists'
import {formatDurationLong, formatTime} from '@/utils/formatTime'
import {ChevronDown, Disc3} from 'lucide-react'
import {useMemo, useState} from 'react'
import {Link, useParams} from 'react-router-dom'
import {cn} from '@/lib/utils'
import {ContextMenu, ContextMenuTrigger,} from '@/components/ui/ContextMenu'
import TrackMenuContent from '@/components/context-menus/TrackContextMenu'
import ArtistLinks from '@/components/data/ArtistLinks'
import ArtPicker from '@/components/media/ArtPicker'
import AudioQualityBadge from '@/components/media/AudioQualityBadge'
import BackLink from '@/components/navigation/BackLink'
import NotFoundState from '@/components/feedback/NotFoundState'
import PlayButton from '@/components/media/PlayButton'
import NowPlayingBars from '@/components/media/NowPlayingBars'
import {getAlbumQualityBadge} from '@/utils/getAudioQualityBadge'
import {useApp} from '@/contexts/app'
import {trackPath} from '@/utils/routes'


interface DiscGroup {
    discNumber: number
    tracks: Track[]
    items: TrackListItem[]
}

/** One rendered line of a disc's track list. */
type DiscRow =
    | { kind: 'track'; track: Track }
    | { kind: 'work'; work: WorkItem; itemIdx: number }
    | { kind: 'movement'; work: WorkItem; entry: WorkItem['entries'][number]; entryIdx: number }

// A work's identity for expand/collapse purposes. Position-based keys would
// carry a collapse from one album to the next, since both start numbering at 0.
function workKey(discNumber: number, work: WorkItem): string {
    return `${discNumber}:${work.composer}:${work.work}`
}

// Flatten a disc into the rows it renders. Every row lands in one list �� rather
// than one container per work �� so the hairline dividers between rows run
// uninterrupted down the disc.
function buildDiscRows(discGroup: DiscGroup, collapsedWorks: Set<string>): DiscRow[] {
    const rows: DiscRow[] = []
    discGroup.items.forEach((item, itemIdx) => {
        if (item.type === 'track') {
            rows.push({kind: 'track', track: item.track})
            return
        }
        rows.push({kind: 'work', work: item, itemIdx})
        if (!collapsedWorks.has(workKey(discGroup.discNumber, item))) {
            item.entries.forEach((entry, entryIdx) =>
                rows.push({kind: 'movement', work: item, entry, entryIdx})
            )
        }
    })
    return rows
}

// Extract disc number from the file path or filename.
// Scans path segments from the filename outward to parent folders, matching
// patterns like CD1, CD 1, Disc1, Disc 1, CD01, Disc01 (case-insensitive).
// This catches disc info stored either in the filename or in a folder name.
function extractDiscNumber(track: Track): number | null {
    const source = track.filePath
    const segments = source.split(/[/\\]/)
    for (let i = segments.length - 1; i >= 0; i--) {
        const match = segments[i].match(/(?:CD|Disc)\s*(\d+)/i)
        if (match) return parseInt(match[1], 10)
    }
    return null
}

// Build sorted DiscGroups from a disc-number �� tracks mapping
function buildDiscGroups(discMap: Map<number, Track[]>): DiscGroup[] {
    return Array.from(discMap.entries())
        .sort(([a], [b]) => a - b)
        .map(([discNumber, tracks]) => {
            const sortedTracks = [...tracks].sort(
                (a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0)
            )
            return {
                discNumber,
                tracks: sortedTracks,
                items: groupTracksByWork(sortedTracks),
            }
        })
}

// Group album tracks by disc number using explicit metadata, filename detection, or inferred boundaries
function groupTracksByDisc(albumTracks: Track[]): DiscGroup[] {
    // Strategy 1: ALL tracks have explicit discNumber metadata
    const hasExplicitDiscNumbers = albumTracks.every(t => t.discNumber != null && t.discNumber > 0)

    if (hasExplicitDiscNumbers) {
        const discMap = new Map<number, Track[]>()
        for (const albumTrack of albumTracks) {
            const discNo = albumTrack.discNumber!
            const disc = discMap.get(discNo)
            if (disc) disc.push(albumTrack)
            else discMap.set(discNo, [albumTrack])
        }
        return buildDiscGroups(discMap)
    }

    // Strategy 2: ALL tracks have a disc number identifiable from filename or folder path
    // (e.g. "CD1-01-Title.flac" or ".../CD1/01-Title.flac")
    const filenameDiscs = albumTracks.map(t => extractDiscNumber(t))
    if (filenameDiscs.length > 0 && filenameDiscs.every(d => d !== null)) {
        const discMap = new Map<number, Track[]>()
        for (let i = 0; i < albumTracks.length; i++) {
            const discNo = filenameDiscs[i]!
            const disc = discMap.get(discNo)
            if (disc) disc.push(albumTracks[i])
            else discMap.set(discNo, [albumTracks[i]])
        }
        return buildDiscGroups(discMap)
    }

    // Strategy 3 (fallback): infer disc boundaries from trackNumber resets.
    // This depends on albumTracks preserving the original FileList order ��
    // if the library order places a later disc's tracks first, the disc
    // numbering will be wrong. No reliable correction is possible without
    // disc metadata or filename hints.
    const discs: Track[][] = []
    let currentDisc: Track[] = []
    let lastTrackNo = 0

    for (const albumTrack of albumTracks) {
        const trackNo = albumTrack.trackNumber ?? 0

        if (currentDisc.length > 0 && (trackNo === 1 || (trackNo > 0 && trackNo < lastTrackNo))) {
            discs.push(currentDisc)
            currentDisc = []
        }

        currentDisc.push(albumTrack)
        lastTrackNo = trackNo
    }

    if (currentDisc.length > 0) {
        discs.push(currentDisc)
    }

    return discs.map((tracks, idx) => {
        const sortedTracks = [...tracks].sort(
            (a, b) => (a.trackNumber ?? 0) - (b.trackNumber ?? 0)
        )
        return {
            discNumber: idx + 1,
            tracks: sortedTracks,
            items: groupTracksByWork(sortedTracks),
        }
    })
}

// Performers worth naming under a track row. The album artist already heads
// the page, so only artists that differ from it get their own line.
function performerArtists(track: Track, albumArtist: string): string[] {
    const trackArtists = parseArtists(track.artist || '').filter(a => a.length > 0)
    if (trackArtists.length === 0) return []
    return trackArtists.join(', ') === parseArtists(albumArtist).join(', ') ? [] : trackArtists
}

export default function AlbumDetailPage() {
    const {
        tracks,
        playlists,
        currentTrackId,
        isPlaying,
        playFromContext,
        playTrackNext,
        addTrackToQueue,
        addTrackToPlaylist,
        removeFromLibrary,
        playAlbum,
    } = useApp()
    const {albumArtist, albumName} = useParams<{ albumArtist: string; albumName: string }>()

    // Decode URL params
    const decodedAlbumArtist = albumArtist ? decodeURIComponent(albumArtist) : ''
    const decodedAlbumName = albumName ? decodeURIComponent(albumName) : ''

    const album = {name: decodedAlbumName, albumArtist: decodedAlbumArtist}

    const albumTracks = useMemo(
        () => tracks.filter(t => matchesAlbum(t, decodedAlbumName, decodedAlbumArtist)),
        [tracks, decodedAlbumName, decodedAlbumArtist],
    )
    // The page's artist list is rebuilt from the tracks, not parsed out of the
    // URL: the URL may carry either the raw tag ("A & B") or the normalized
    // form ("A, B"), and the normalized form cannot be re-split because commas
    // are deliberately not parseArtists separators.
    const albumArtists = useMemo(() => {
        const names: string[] = []
        const seen = new Set<string>()
        for (const t of albumTracks) {
            for (const name of parseArtists(t.albumArtist ?? '')) {
                if (!seen.has(name)) {
                    seen.add(name)
                    names.push(name)
                }
            }
        }
        return names.length > 0 ? names : [decodedAlbumArtist]
    }, [albumTracks, decodedAlbumArtist])
    const {cover, totalDuration} = useMemo(() => ({
        // The album's cover is the first track that carries artwork.
        cover: albumTracks.find(t => t.cover)?.cover ?? null,
        totalDuration: albumTracks.reduce((sum, t) => sum + t.duration, 0),
    }), [albumTracks])
    const discGroups = useMemo(() => groupTracksByDisc(albumTracks), [albumTracks])
    const albumBadge = useMemo(() => getAlbumQualityBadge(albumTracks), [albumTracks])

    // All album track ids in presentation order (disc �� track). This is the
    // playback context for this album: previous/next stay within the album.
    const albumTrackIds = useMemo(
        () => discGroups.flatMap(disc => disc.tracks.map(t => t.id)),
        [discGroups],
    )

    // Play the album starting at the given track.
    const playAlbumFrom = (trackId: string) => {
        const start = albumTrackIds.indexOf(trackId)
        playFromContext(albumTrackIds, start >= 0 ? start : 0)
    }

    // Works the user has folded up. Everything else is open, so a library that
    // arrives after this page's first render still shows its works expanded.
    const [collapsedWorks, setCollapsedWorks] = useState<Set<string>>(() => new Set())

    const toggleGroup = (key: string) => {
        setCollapsedWorks(prev => {
            const next = new Set(prev)
            if (next.has(key)) {
                next.delete(key)
            } else {
                next.add(key)
            }
            return next
        })
    }

    if (albumTracks.length === 0) {
        return (
            <NotFoundState
                title="Album not found"
                icon={Disc3}
                to="/albums"
                backLabel="Back to albums"
            />
        )
    }

    return (
        <div className="page-gutter pt-6 pb-8">
            <BackLink to="/albums" label="Back to albums"/>

            {/* Album header */}
            <div className="flex flex-col sm:flex-row gap-6 sm:gap-8 mb-8">
                {/* Cover */}
                <ArtPicker covers={cover ? [cover] : []} name={`${album.name} ${album.albumArtist}`}/>

                {/* Info �� compact stack centered against the cover */}
                <div className="flex flex-col justify-center gap-3 min-w-0 h-auto sm:h-64 text-center sm:text-left">
                    <div className="space-y-2">
                        <h1 className="text-2xl sm:text-4xl font-bold tracking-tight">{album.name}{albumBadge &&
                            <AudioQualityBadge badge={albumBadge}/>}</h1>
                        <ArtistLinks
                            artists={albumArtists}
                            className="text-sm sm:text-base"
                        />
                    </div>
                    <div
                        className="flex flex-wrap items-center justify-center sm:justify-start gap-x-2 gap-y-1 text-xs sm:text-sm text-muted-foreground">
            <span>
              {albumTracks[0]?.releaseDate && `${albumTracks[0].releaseDate} · `}
                {albumTracks.length} {albumTracks.length === 1 ? 'track' : 'tracks'}
            </span>
                    </div>
                    <div className="flex justify-center sm:justify-start pt-1">
                        <PlayButton
                            onClick={() => playAlbum(album.name, album.albumArtist)}
                            label={`Play ${album.name}`}
                        />
                    </div>
                </div>
            </div>

            {/* Track list */}
            <div>
                {discGroups.map(discGroup => (
                    <div key={discGroup.discNumber}>
                        {/* Disc header �� only meaningful when the album really spans discs */}
                        {discGroups.length > 1 && (
                            <div className="flex items-center">
                                <h2 className="text-[11px] font-medium tracking-[0.18em] text-muted-foreground">Disc {discGroup.discNumber}</h2>
                            </div>
                        )}

                        <div className="divide-y divide-border/60">
                            {buildDiscRows(discGroup, collapsedWorks).map(row => {
                                if (row.kind === 'work') {
                                    const {work, itemIdx} = row
                                    const key = workKey(discGroup.discNumber, work)
                                    const isExpanded = !collapsedWorks.has(key)
                                    const workDuration = work.entries.reduce(
                                        (sum, entry) => sum + (entry.track.duration || 0),
                                        0
                                    )

                                    // Work header �� clicking the row toggles its movements
                                    return (
                                        <div
                                            key={`work-${itemIdx}`}
                                            role="button"
                                            tabIndex={0}
                                            aria-expanded={isExpanded}
                                            onClick={() => toggleGroup(key)}
                                            onKeyDown={e => {
                                                if (e.key === 'Enter' || e.key === ' ') {
                                                    e.preventDefault()
                                                    toggleGroup(key)
                                                }
                                            }}
                                            className="w-full flex items-center gap-3 pr-3 py-2 text-left hover:bg-accent/50 transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
                                        >
                                            {/* Same box as a track's number column, so the work title
                          starts where the movement titles do */}
                                            <span className="min-w-5 shrink-0 flex items-center">
                        <ChevronDown
                            size={14}
                            aria-hidden="true"
                            className={cn(
                                'text-muted-foreground transition-transform',
                                !isExpanded && '-rotate-90'
                            )}
                        />
                      </span>
                                            <div className="flex-1 min-w-0">
                                                {work.composer ? (
                                                    <p className="text-sm truncate">

                                                        <span className="font-[550]">{work.work}</span>
                                                        <span className="text-muted-foreground">{' '}</span>
                                                        <span className="text-muted-foreground">{'('}</span>
                                                        <span className="font-normal">{work.composer}</span>
                                                        <span className="text-muted-foreground">{')'}</span>
                                                    </p>

                                                ) : (
                                                    <p className="text-sm font-semibold truncate">{work.work}</p>
                                                )}
                                            </div>
                                            <span
                                                className="shrink-0 text-muted-foreground text-sm tabular-nums whitespace-nowrap">
                        {formatTime(workDuration)}
                      </span>
                                        </div>
                                    )
                                }

                                const track = row.kind === 'movement' ? row.entry.track : row.track
                                const isActive = track.id === currentTrackId
                                const performers = performerArtists(track, album.albumArtist)
                                // Movements are numbered within their work; standalone tracks use
                                // their own tag number and show nothing when it is missing.
                                const number = row.kind === 'movement'
                                    ? String((row.work.entries[0].track.trackNumber ?? 1) + row.entryIdx).padStart(2, '0')
                                    : track.trackNumber != null && track.trackNumber > 0
                                        ? String(track.trackNumber).padStart(2, '0')
                                        : ''
                                // A standalone track keeps its full original title �� the parse was
                                // only a candidate. Grouped tracks show their section instead.
                                const label = row.kind === 'movement' ? row.entry.movement : track.title

                                return (
                                    <ContextMenu key={track.id}>
                                        <ContextMenuTrigger asChild>
                                            <div
                                                onClick={() => playAlbumFrom(track.id)}
                                                className="w-full flex items-center gap-3 pr-3 py-2 text-left transition-colors cursor-pointer hover:bg-accent/50"
                                            >
                        <span className="min-w-5 shrink-0 text-sm tabular-nums whitespace-nowrap text-muted-foreground">
                          {isActive && isPlaying ? <NowPlayingBars/> : number}
                        </span>
                                                {/* Fixed at the height of a title plus performer line so
                            every row matches; a row without performers centres
                            its title against the number instead. */}
                                                <div className="min-w-0 flex-1 min-h-9.5 flex flex-col justify-center">
                                                    <p className={cn('text-sm truncate', isActive && 'text-primary font-medium')}>
                                                        <Link
                                                            to={trackPath(track.id)}
                                                            className="hover:underline"
                                                            onClick={(e) => e.stopPropagation()}
                                                        >
                                                            {label}
                                                        </Link>
                                                    </p>
                                                    <ArtistLinks artists={performers} className="mt-0.5"/>
                                                </div>
                                                <span
                                                    className="text-sm tabular-nums shrink-0 whitespace-nowrap text-muted-foreground">
                          {formatTime(track.duration)}
                        </span>
                                            </div>
                                        </ContextMenuTrigger>
                                        <TrackMenuContent
                                            track={track}
                                            playlists={playlists}
                                            onPlayNext={playTrackNext}
                                            onAddToQueue={addTrackToQueue}
                                            onAddToPlaylist={addTrackToPlaylist}
                                            links={{artist: true, composer: true}}
                                            onRemoveFromLibrary={removeFromLibrary}
                                        />
                                    </ContextMenu>
                                )
                            })}
                        </div>
                    </div>
                ))}

                {/* Track list footer */}
                <div className="flex items-center justify-between border-t border-border text-xs text-muted-foreground">
                    {/* Left: copyright */}
                    {albumTracks[0]?.copyright && (
                        <p className="whitespace-pre-line mt-2">
                            {albumTracks[0].copyright.replace('?', '\n?')}
                        </p>
                    )}
                    {/* Right: total duration */}
                    <p className="ml-auto">
                        {formatDurationLong(totalDuration)}
                    </p>
                </div>
            </div>
        </div>
    )
}

