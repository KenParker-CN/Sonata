import {useAudioPlayer} from '@/hooks/useAudioPlayer'
import {useImportManager} from '@/hooks/useImportManager'
import {revokeTrackUrls} from '@/services/metadata'
import {
    collectAudioEntries,
    isAudioFileName,
    isPersistenceSupported,
    pickMusicDirectory,
} from '@/services/musicFolders'
import {buildLibrary, type RestoredLibrary} from '@/services/restoreLibrary'
import {
    clearStoredLibrary,
    deleteArt,
    deleteStoredTracks,
    saveArt,
    savePlaylists,
} from '@/services/libraryStore'
import {
    type ArtId,
    loadCustomArt,
    playlistArtId,
    prepareArt,
} from '@/services/customArt'
import type {Playlist, QueueItem, Track} from '@/types/music'
import {memo, useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {Navigate, Route, Routes} from 'react-router-dom'
import AppLayout from '@/components/layout/AppLayout'
import PlayerBar from '@/components/layout/PlayerBar'
import QueuePanel from '@/components/layout/QueuePanel'
import ImportProgressToast from '@/components/feedback/ImportProgressToast'
import LibraryStatusBanner from '@/components/feedback/LibraryStatusBanner'
import ConfirmDialog from '@/components/dialogs/ConfirmDialog'
import {PlaylistDetailsDialog} from '@/components/dialogs/PlaylistDialogs'
import {AppProvider, type AppContextValue} from '@/contexts/app'
import {useMediaQuery} from '@/hooks/useMediaQuery'
import LibraryPage from '@/pages/LibraryPage'
import ArtistsPage from '@/pages/ArtistsPage'
import ArtistDetailPage from '@/pages/ArtistDetailPage'
import ComposersPage from '@/pages/ComposersPage'
import ComposerDetailPage from '@/pages/ComposerDetailPage'
import AlbumsPage from '@/pages/AlbumsPage'
import AlbumDetailPage from '@/pages/AlbumDetailPage'
import PlaylistsPage from '@/pages/PlaylistsPage'
import PlaylistDetailPage from '@/pages/PlaylistDetailPage'
import TrackDetailPage from '@/pages/TrackDetailPage'
import {getFilePath} from '@/utils/getFileKey'
import {touch, type PlaylistDetails} from '@/utils/playlist'
import {matchesAlbum} from '@/utils/groupAlbums'
import {hasComposer} from '@/utils/groupComposers'
import {hasArtist} from '@/utils/groupArtists'
import * as React from "react";
import {CssBaseline, ThemeProvider} from '@mui/material'
import {createAppTheme} from '@/theme'
import {extractAccentColor} from '@/utils/extractAccentColor'


/** Ids of every track an entity action applies to, in library order. */
function matchingIds(tracks: Track[], matches: (track: Track) => boolean): string[] {
    const ids: string[] = []
    for (const track of tracks) {
        if (matches(track)) ids.push(track.id)
    }
    return ids
}

// The play head tick re-renders App several times a second. With no props to
// compare, memo stops that render from reaching the mounted page and its lists.
// Pages still update when the app context changes value; memo does not block
// context propagation.
interface PageRoutesProps {
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

const PageRoutes = memo(function PageRoutes({
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
                                            }: PageRoutesProps) {
    return (
        <div className="flex-1 flex overflow-hidden relative">
            <Routes>
                <Route
                    element={
                        <AppLayout
                            queueOpen={queueOpen}
                            isDesktop={isDesktop}
                            queue={queue}
                            currentQueueIndex={currentQueueIndex}
                            tracks={tracks}
                            playlists={playlists}
                            onPlayQueueItem={onPlayQueueItem}
                            onRemoveQueueItem={onRemoveQueueItem}
                            onAddToPlaylist={onAddToPlaylist}
                            onPlayNextTrack={onPlayNextTrack}
                            onAddToQueue={onAddToQueue}
                            onCloseQueue={onCloseQueue}
                        />
                    }
                >
                    <Route path="/library" element={<LibraryPage/>}/>
                    <Route path="/artists" element={<ArtistsPage/>}/>
                    <Route path="/artists/:artistName" element={<ArtistDetailPage/>}/>
                    <Route path="/composers" element={<ComposersPage/>}/>
                    <Route path="/composers/:composerName" element={<ComposerDetailPage/>}/>
                    <Route path="/albums" element={<AlbumsPage/>}/>
                    <Route path="/albums/:albumArtist/:albumName" element={<AlbumDetailPage/>}/>
                    <Route path="/playlists" element={<PlaylistsPage/>}/>
                    <Route path="/playlists/:playlistId" element={<PlaylistDetailPage/>}/>
                    <Route path="/tracks/:trackId" element={<TrackDetailPage/>}/>
                    <Route path="/" element={<Navigate to="/library" replace/>}/>
                </Route>
            </Routes>
        </div>
    )
})

function App() {
    const [tracks, setTracks] = useState<Track[]>([])
    const [playlists, setPlaylists] = useState<Playlist[]>([])
    // Uploaded images, as object URLs valid for this page. Like track artwork,
    // they are rebuilt from the cached blobs on every load.
    const [artUrls, setArtUrls] = useState<Partial<Record<ArtId, string>>>({})
    const [sidebarOpen, setSidebarOpen] = useState(false)
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
    const [queueOpen, setQueueOpen] = useState(false)
    const [theme, setTheme] = useState<'light' | 'dark'>(() => {
        return localStorage.getItem('sonata-theme') === 'dark' ? 'dark' : 'light'
    })
    const importInputRef = useRef<HTMLInputElement>(null)
    const tracksRef = useRef(tracks)
    const artUrlsRef = useRef(artUrls)

    useEffect(() => {
        document.documentElement.dataset.theme = theme
        localStorage.setItem('sonata-theme', theme)
    }, [theme])

    useEffect(() => {
        artUrlsRef.current = artUrls
    }, [artUrls])

    useEffect(() => {
        void loadCustomArt()
            .then(setArtUrls)
            .catch(error => console.error('Failed to read the saved images', error))
    }, [])

    // Global import manager - persists across route changes
    const handleTracksParsed = useCallback((newTracks: Track[]) => {
        // A folder picked again after an edit re-imports tracks that are already
        // here; ids come from the file, so this is where duplicates drop out.
        setTracks(prev => {
            const known = new Set(prev.map(t => t.id))
            return [...prev, ...newTracks.filter(t => !known.has(t.id))]
        })
    }, [])

    const {progress, importEntries} = useImportManager(handleTracksParsed)

    const [libraryStatus, setLibraryStatus] = useState<RestoredLibrary | null>(null)
    const hydratedRef = useRef(false)

    const {
        currentTrackId,
        currentQueueIndex,
        queue,
        isPlaying,
        currentTime,
        duration,
        volume,
        repeatMode,
        shuffle,
        playbackError,
        canPrev,
        canNext,
        playFromContext,
        playQueueItemAt,
        togglePlay,
        playNext,
        queueNext,
        queueNextMany,
        playPrev,
        seek,
        setVolume,
        cycleRepeatMode,
        toggleShuffle,
        addToQueue,
        removeFromQueue,
    } = useAudioPlayer(tracks)

    // The first import into an empty library starts playback. A restored library
    // marks this as done before its tracks arrive, and clearing the cache doesn't
    // undo it, so nothing ever starts playing on its own a second time.
    const hasAutoPlayedRef = useRef(false)
    useEffect(() => {
        if (hasAutoPlayedRef.current || tracks.length === 0) return
        hasAutoPlayedRef.current = true
        playFromContext(tracks.map(t => t.id), 0)
    }, [tracks, playFromContext])

    // Revoke object URLs on unmount to prevent memory leaks
    useEffect(() => {
        return () => {
            // eslint-disable-next-line react-hooks/exhaustive-deps
            tracksRef.current.forEach(revokeTrackUrls)
        }
    }, [])

    const applyLibrary = useCallback((restored: RestoredLibrary) => {
        if (restored.tracks.length > 0) hasAutoPlayedRef.current = true
        setTracks(restored.tracks)
        setPlaylists(restored.playlists)
        setLibraryStatus(restored)
        hydratedRef.current = true
    }, [])

    const restoreStartedRef = useRef(false)
    useEffect(() => {
        if (restoreStartedRef.current) return
        restoreStartedRef.current = true
        void buildLibrary(false)
            .then(applyLibrary)
            .catch(error => console.error('Failed to restore the library', error))
    }, [applyLibrary])

    // Chrome only lets a handle be re-authorized from a user gesture, which is
    // what the banner's Reconnect button provides.
    const handleReconnectLibrary = useCallback(() => {
        void buildLibrary(true)
            .then(applyLibrary)
            .catch(error => console.error('Failed to reconnect the library', error))
    }, [applyLibrary])

    // Before the first restore resolves, `playlists` is still the empty initial
    // state and would overwrite what was just read.
    useEffect(() => {
        if (hydratedRef.current) void savePlaylists(playlists)
    }, [playlists])

    const handleFilesSelected = useCallback(async (files: File[]) => {
        const entries = files
            .filter(file => file.type.startsWith('audio/') || isAudioFileName(file.name))
            .map(file => ({path: getFilePath(file), getFile: async () => file}))
        await importEntries(entries, null)
    }, [importEntries])

    const importMusic = useCallback(async () => {
        if (!isPersistenceSupported()) {
            importInputRef.current?.click()
            return
        }
        const root = await pickMusicDirectory()
        if (!root) return
        const entries = await collectAudioEntries(root)
        await importEntries(
            entries.map(entry => ({path: entry.path, getFile: () => entry.handle.getFile()})),
            {id: root.name, handle: root},
        )
    }, [importEntries])

    const handleImportInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
        const files = event.target.files
        if (files) {
            void handleFilesSelected(Array.from(files))
        }
        event.target.value = ''
    }, [handleFilesSelected])

    const openSidebar = useCallback(() => setSidebarOpen(true), [])
    const closeSidebar = useCallback(() => setSidebarOpen(false), [])
    const toggleSidebarCollapsed = useCallback(
        () => setSidebarCollapsed(prev => !prev),
        [],
    )

    const handleCreatePlaylist = useCallback(({name, description}: PlaylistDetails) => {
        const now = Date.now()
        const newPlaylist: Playlist = {
            id: `playlist-${now}-${Math.random().toString(36).slice(2, 9)}`,
            name: name.trim(),
            trackIds: [],
            description: description.trim() || null,
            createdAt: now,
            updatedAt: now,
        }
        setPlaylists(prev => [...prev, newPlaylist])
    }, [])

    const setCustomArt = useCallback(async (id: ArtId, file: File) => {
        const blob = await prepareArt(file)
        await saveArt({id, blob})
        const url = URL.createObjectURL(blob)
        const previous = artUrlsRef.current[id]
        if (previous) URL.revokeObjectURL(previous)
        setArtUrls(prev => ({...prev, [id]: url}))
    }, [])

    const clearCustomArt = useCallback(async (id: ArtId) => {
        await deleteArt(id)
        const previous = artUrlsRef.current[id]
        if (previous) URL.revokeObjectURL(previous)
        setArtUrls(prev => {
            const next = {...prev}
            delete next[id]
            return next
        })
    }, [])

    const deletePlaylist = useCallback((playlistId: string) => {
        setPlaylists(prev => prev.filter(p => p.id !== playlistId))
        // The playlist's own uploaded cover goes with it, or the blob would outlive
        // the only thing that could ever address it.
        void clearCustomArt(playlistArtId(playlistId)).catch(error => {
            console.error('Failed to drop the saved playlist image', error)
        })
    }, [clearCustomArt])

    const playPlaylist = useCallback((playlistId: string) => {
        const playlist = playlists.find(p => p.id === playlistId)
        if (playlist) playFromContext(playlist.trackIds, 0)
    }, [playlists, playFromContext])

    const removeTrackFromPlaylist = useCallback((playlistId: string, trackId: string) => {
        const now = Date.now()
        setPlaylists(prev => prev.map(p =>
            p.id === playlistId
                ? touch({...p, trackIds: p.trackIds.filter(id => id !== trackId)}, now)
                : p,
        ))
    }, [])

    const addTrackIdsToPlaylist = useCallback((trackIds: string[], playlistId: string) => {
        const now = Date.now()
        setPlaylists(prev => prev.map(p => {
            if (p.id !== playlistId) return p
            const missing = trackIds.filter(id => !p.trackIds.includes(id))
            return missing.length === 0 ? p : touch({...p, trackIds: [...p.trackIds, ...missing]}, now)
        }))
    }, [])

    const addTrackToPlaylist = useCallback((trackId: string, playlistId: string) => {
        addTrackIdsToPlaylist([trackId], playlistId)
    }, [addTrackIdsToPlaylist])

    const addTracksToPlaylist = useCallback((playlistId: string, trackIds: string[]) => {
        addTrackIdsToPlaylist(trackIds, playlistId)
    }, [addTrackIdsToPlaylist])

    // Reordering happens in the stored order, so a track that left the library
    // still holds its place until the user drops it.
    const moveTrackInPlaylist = useCallback(
        (playlistId: string, trackId: string, direction: 'up' | 'down') => {
            const now = Date.now()
            setPlaylists(prev => prev.map(p => {
                if (p.id !== playlistId) return p
                const trackIds = [...p.trackIds]
                const from = trackIds.indexOf(trackId)
                const to = direction === 'up' ? from - 1 : from + 1
                if (from < 0 || to < 0 || to >= trackIds.length) return p
                const [moved] = trackIds.splice(from, 1)
                trackIds.splice(to, 0, moved)
                return touch({...p, trackIds}, now)
            }))
        },
        [],
    )

    const updatePlaylist = useCallback((playlistId: string, details: PlaylistDetails) => {
        const name = details.name.trim()
        if (!name) return
        const description = details.description.trim() || null
        const now = Date.now()
        setPlaylists(prev => prev.map(p => {
            if (p.id !== playlistId) return p
            if (p.name === name && (p.description ?? null) === description) return p
            return touch({...p, name, description}, now)
        }))
    }, [])

    const removeFromLibrary = useCallback((trackId: string) => {
        const removed = tracks.filter(t => t.id === trackId)
        if (removed.length === 0) return
        removed.forEach(revokeTrackUrls)
        setTracks(prev => prev.filter(t => t.id !== trackId))
        setPlaylists(prev => prev.map(p =>
            p.trackIds.includes(trackId)
                ? {...p, trackIds: p.trackIds.filter(id => id !== trackId)}
                : p,
        ))
        void deleteStoredTracks(removed.map(t => t.id)).catch(error => {
            console.error('Failed to drop the cached track', error)
        })
    }, [tracks])

    const playAlbum = useCallback((albumName: string, albumArtist: string) => {
        const trackIds = matchingIds(tracks, t => matchesAlbum(t, albumName, albumArtist))
        if (trackIds.length > 0) playFromContext(trackIds, 0)
    }, [tracks, playFromContext])

    const playAlbumNext = useCallback((albumName: string, albumArtist: string) => {
        queueNextMany(matchingIds(tracks, t => matchesAlbum(t, albumName, albumArtist)))
    }, [tracks, queueNextMany])

    const addAlbumToPlaylist = useCallback((albumName: string, albumArtist: string, playlistId: string) => {
        addTrackIdsToPlaylist(
            tracks.filter(t => matchesAlbum(t, albumName, albumArtist)).map(t => t.id),
            playlistId,
        )
    }, [tracks, addTrackIdsToPlaylist])

    const removeAlbumFromLibrary = useCallback((albumName: string, albumArtist: string) => {
        const removed = tracks.filter(t => matchesAlbum(t, albumName, albumArtist))
        if (removed.length === 0) return
        const removedIds = new Set(removed.map(t => t.id))
        removed.forEach(revokeTrackUrls)
        setTracks(prev => prev.filter(t => !removedIds.has(t.id)))
        setPlaylists(prev => prev.map(p => {
            const kept = p.trackIds.filter(id => !removedIds.has(id))
            return kept.length === p.trackIds.length ? p : {...p, trackIds: kept}
        }))
    }, [tracks])

    const playArtist = useCallback((artistName: string) => {
        const trackIds = matchingIds(tracks, t => hasArtist(t, artistName))
        if (trackIds.length > 0) playFromContext(trackIds, 0)
    }, [tracks, playFromContext])

    const playArtistNext = useCallback((artistName: string) => {
        queueNextMany(matchingIds(tracks, t => hasArtist(t, artistName)))
    }, [tracks, queueNextMany])

    const addArtistToPlaylist = useCallback((artistName: string, playlistId: string) => {
        addTrackIdsToPlaylist(
            tracks.filter(t => hasArtist(t, artistName)).map(t => t.id),
            playlistId,
        )
    }, [tracks, addTrackIdsToPlaylist])

    const playComposer = useCallback((composerName: string) => {
        const trackIds = matchingIds(tracks, t => hasComposer(t, composerName))
        if (trackIds.length > 0) playFromContext(trackIds, 0)
    }, [tracks, playFromContext])

    const playComposerNext = useCallback((composerName: string) => {
        queueNextMany(matchingIds(tracks, t => hasComposer(t, composerName)))
    }, [tracks, queueNextMany])

    const addComposerToPlaylist = useCallback((composerName: string, playlistId: string) => {
        addTrackIdsToPlaylist(
            tracks.filter(t => hasComposer(t, composerName)).map(t => t.id),
            playlistId,
        )
    }, [tracks, addTrackIdsToPlaylist])

    // One id→track lookup for the whole app: pages resolve playlists and queues
    // through this instead of scanning `tracks` per row.
    const trackById = useMemo(() => new Map(tracks.map(t => [t.id, t])), [tracks])

    const currentTrack = currentTrackId === null
        ? null
        : trackById.get(currentTrackId) ?? null

    // Derive the accent color from the current track's cover so the player bar
    // and now-playing overlay share a hue that reflects the album art.
    const [accentColor, setAccentColor] = useState<string | null>(null)

    useEffect(() => {
        const cover = currentTrack?.cover
        let cancelled = false
        void (async () => {
            // Reading the color happens off the render path, so setting state
            // here never blocks the effect body itself.
            const color = cover ? await extractAccentColor(cover) : null
            // A slower extraction from a previous track must not overwrite the
            // color of the cover that is actually playing now.
            if (!cancelled) setAccentColor(color ?? null)
        })()
        return () => {
            cancelled = true
        }
    }, [currentTrack?.cover])

    const [createPlaylistOpen, setCreatePlaylistOpen] = useState(false)
    const requestCreatePlaylist = useCallback(() => setCreatePlaylistOpen(true), [])
    const [resetLibraryOpen, setResetLibraryOpen] = useState(false)
    const requestResetLibrary = useCallback(() => setResetLibraryOpen(true), [])

    // A reload reads back what is cached, so clearing the cache also clears the
    // running library; otherwise the two disagree until the next restart.
    const handleResetLibrary = useCallback(() => {
        void clearStoredLibrary()
            .then(() => {
                tracks.forEach(revokeTrackUrls)
                setTracks([])
                setPlaylists([])
                Object.values(artUrlsRef.current).forEach(url => {
                    if (url) URL.revokeObjectURL(url)
                })
                setArtUrls({})
                setLibraryStatus(null)
            })
            .catch(error => console.error('Failed to clear the cached library', error))
    }, [tracks])

    const appValue = useMemo<AppContextValue>(
        () => ({
            tracks,
            trackById,
            playlists,
            currentTrackId,
            isPlaying,
            playFromContext,
            playTrackNext: queueNext,
            addTrackToQueue: addToQueue,
            addTrackToPlaylist,
            removeFromLibrary,
            playAlbum,
            playAlbumNext,
            addAlbumToPlaylist,
            removeAlbumFromLibrary,
            playArtist,
            playArtistNext,
            addArtistToPlaylist,
            playComposer,
            playComposerNext,
            addComposerToPlaylist,
            requestCreatePlaylist,
            playPlaylist,
            updatePlaylist,
            moveTrackInPlaylist,
            deletePlaylist,
            removeTrackFromPlaylist,
            addTracksToPlaylist,
            artUrls,
            setCustomArt,
            clearCustomArt,
            requestResetLibrary,
            theme,
            setTheme,
            importMusic,
            sidebarOpen,
            sidebarCollapsed,
            toggleSidebarCollapsed,
            openSidebar,
            closeSidebar,
        }),
        [
            tracks,
            trackById,
            playlists,
            currentTrackId,
            isPlaying,
            playFromContext,
            queueNext,
            addToQueue,
            addTrackToPlaylist,
            removeFromLibrary,
            playAlbum,
            playAlbumNext,
            addAlbumToPlaylist,
            removeAlbumFromLibrary,
            playArtist,
            playArtistNext,
            addArtistToPlaylist,
            playComposer,
            playComposerNext,
            addComposerToPlaylist,
            requestCreatePlaylist,
            playPlaylist,
            updatePlaylist,
            moveTrackInPlaylist,
            deletePlaylist,
            removeTrackFromPlaylist,
            addTracksToPlaylist,
            artUrls,
            setCustomArt,
            clearCustomArt,
            requestResetLibrary,
            theme,
            setTheme,
            importMusic,
            sidebarOpen,
            sidebarCollapsed,
            toggleSidebarCollapsed,
            openSidebar,
            closeSidebar,
        ],
    )

    // Desktop shows a fixed side panel; mobile uses a bottom sheet.
    const isDesktop = useMediaQuery('(min-width: 1024px)')
    const muiTheme = useMemo(() => createAppTheme(theme), [theme])

    return (
        <ThemeProvider theme={muiTheme}>
            <CssBaseline />
            <div
                className="relative flex-1 flex flex-col overflow-hidden"
                style={{ '--player-accent': accentColor ?? undefined } as React.CSSProperties}
            >
                {/* Fallback for browsers without the File System Access API: pick files directly. */}
                <input
                    ref={importInputRef}
                    type="file"
                    accept="audio/*,.mp3,.m4a,.m4b,.aac,.flac,.wav,.ogg,.oga,.opus,.weba,.aif,.aiff,.alac,.wma"
                    multiple
                    onChange={handleImportInputChange}
                    className="hidden"
                />
                <ImportProgressToast progress={progress}/>

                {libraryStatus && (
                    <LibraryStatusBanner
                        rootNames={libraryStatus.rootsNeedingAccess}
                        tracksNeedingAccess={libraryStatus.tracksNeedingAccess}
                        persistenceUnavailable={libraryStatus.persistenceUnavailable && tracks.length > 0}
                        onReconnect={handleReconnectLibrary}
                    />
                )}

                <AppProvider value={appValue}>
                    <PageRoutes
                        queueOpen={queueOpen}
                        isDesktop={isDesktop}
                        queue={queue}
                        currentQueueIndex={currentQueueIndex}
                        tracks={tracks}
                        playlists={playlists}
                        onPlayQueueItem={playQueueItemAt}
                        onRemoveQueueItem={removeFromQueue}
                        onAddToPlaylist={addTrackToPlaylist}
                        onPlayNextTrack={queueNext}
                        onAddToQueue={addToQueue}
                        onCloseQueue={() => setQueueOpen(false)}
                    />

                    <PlaylistDetailsDialog
                        open={createPlaylistOpen}
                        onOpenChange={setCreatePlaylistOpen}
                        mode="create"
                        onSubmit={handleCreatePlaylist}
                    />

                    <ConfirmDialog
                        open={resetLibraryOpen}
                        onOpenChange={setResetLibraryOpen}
                        title="Clear cache"
                        description={`Sonata will forget ${tracks.length} ${tracks.length === 1 ? 'track' : 'tracks'} and ${playlists.length} ${playlists.length === 1 ? 'playlist' : 'playlists'}. Your audio files stay on disk; pick the folder again to load them.`}
                        confirmLabel="Clear"
                        onConfirm={handleResetLibrary}
                    />
                </AppProvider>

                {/* PlayerBar is outside the page switch; it persists across navigation */}
                <PlayerBar
                    track={currentTrack}
                    hasTrack={Boolean(currentTrack)}
                    isPlaying={isPlaying}
                    repeatMode={repeatMode}
                    shuffle={shuffle}
                    currentTime={currentTime}
                    duration={duration}
                    volume={volume}
                    canPrev={canPrev}
                    canNext={canNext}
                    queueCount={queue.length > 0 ? queue.length - currentQueueIndex - 1 : 0}
                    playbackError={playbackError}
                    onTogglePlay={togglePlay}
                    onPrev={playPrev}
                    onNext={playNext}
                    onSeek={seek}
                    onVolumeChange={setVolume}
                    onCycleRepeatMode={cycleRepeatMode}
                    onToggleShuffle={toggleShuffle}
                    onOpenQueue={() => setQueueOpen(prev => !prev)}
                />

                {/* Mobile queue: bottom sheet. Desktop uses the side panel in AppLayout. */}
{!isDesktop && (
        <QueuePanel
          open={queueOpen}
          onClose={() => setQueueOpen(false)}
          queue={queue}
          currentQueueIndex={currentQueueIndex}
          tracks={tracks}
          playlists={playlists}
          onPlayQueueItem={playQueueItemAt}
          onRemoveQueueItem={removeFromQueue}
          onAddToPlaylist={addTrackToPlaylist}
          onPlayNextTrack={queueNext}
          onAddToQueue={addToQueue}
        />
      )}
            </div>
        </ThemeProvider>
    )
}

export default App
