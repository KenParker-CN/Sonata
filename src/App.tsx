import { useAudioPlayer } from '@/hooks/useAudioPlayer'
import { useImportManager } from '@/hooks/useImportManager'
import { revokeTrackUrls } from '@/services/metadata'
import type { Playlist, Track } from '@/types/music'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Routes, Route, useNavigate, useLocation } from 'react-router-dom'
import Sidebar from '@/components/Sidebar'
import PlayerBar from '@/components/PlayerBar'
import Breadcrumb from '@/components/Breadcrumb'
import ImportProgressToast from '@/components/ImportProgressToast'
import ExpandedNowPlaying from '@/components/ExpandedNowPlaying'
import LibraryPage from '@/pages/LibraryPage'
import ArtistsPage from '@/pages/ArtistsPage'
import ArtistDetailPage from '@/pages/ArtistDetailPage'
import AlbumsPage from '@/pages/AlbumsPage'
import AlbumDetailPage from '@/pages/AlbumDetailPage'
import PlaylistsPage from '@/pages/PlaylistsPage'
import { getFileKey } from '@/utils/getFileKey'
import { parseArtists } from '@/utils/parseArtists'

// Scroll position preservation for grid pages
interface ScrollPositions {
  artists: number
  albums: number
}

// Wrapper component that provides navigation context to pages
function PageWrapper({ children, onImportMusic, handleNavigate, onMainRef, sidebarOpen, onSidebarClose }: {
  children: React.ReactNode
  onImportMusic?: () => void
  handleNavigate: (path: string) => void
  onMainRef?: (ref: HTMLElement | null) => void
  sidebarOpen?: boolean
  onSidebarClose?: () => void
}) {
  const location = useLocation()
  const mainRef = useRef<HTMLElement>(null)

  // Expose mainRef to parent for scroll position management
  useEffect(() => {
    if (onMainRef && mainRef.current) {
      onMainRef(mainRef.current)
    }
  }, [onMainRef])

  // Scroll to top when route changes
  useEffect(() => {
    const container = mainRef.current
    if (container) {
      requestAnimationFrame(() => {
        container.scrollTo(0, 0)
      })
    }
  }, [location.pathname])

  return (
    <>
      <Sidebar 
        onNavigate={handleNavigate} 
        onImportMusic={onImportMusic}
        isOpen={sidebarOpen}
        onClose={onSidebarClose}
      />
      <main ref={mainRef} className="flex-1 overflow-y-auto">
        <Breadcrumb />
        {children}
      </main>
    </>
  )
}

function App() {
  const [tracks, setTracks] = useState<Track[]>([])
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [nowPlayingOpen, setNowPlayingOpen] = useState(false)
  const importInputRef = useRef<HTMLInputElement>(null)
  const tracksRef = useRef(tracks)

  useEffect(() => {
    tracksRef.current = tracks
  }, [tracks])

  // Global import manager - persists across route changes
  const handleTracksParsed = useCallback((newTracks: Track[]) => {
    setTracks(prev => [...prev, ...newTracks])
  }, [])

  const { progress, importFiles } = useImportManager(handleTracksParsed)

  const {
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    canPrev,
    canNext,
    playTrack,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
  } = useAudioPlayer(tracks)

  // Auto-play first track when going from empty to having tracks
  const prevLengthRef = useRef(0)
  useEffect(() => {
    if (prevLengthRef.current === 0 && tracks.length > 0) {
      playTrack(0)
    }
    prevLengthRef.current = tracks.length
  }, [tracks, playTrack])

  // Revoke object URLs on unmount to prevent memory leaks
  useEffect(() => {
    return () => {
      tracksRef.current.forEach(revokeTrackUrls)
    }
  }, [])

  const handleFilesSelected = useCallback(async (files: File[]) => {
    // Build a Set of existing fileKeys from the library
    // Filter out tracks without fileKey (legacy tracks)
    const existingKeys = new Set<string>(
      tracks.map(t => t.fileKey).filter((key): key is string => key != null)
    )
    
    // Filter out duplicates before passing to import manager
    const audioFiles = files.filter(f => f.type.startsWith('audio/'))
    const uniqueFiles: File[] = []
    
    for (const file of audioFiles) {
      const fileKey = getFileKey(file)
      if (!existingKeys.has(fileKey)) {
        existingKeys.add(fileKey)
        uniqueFiles.push(file)
      }
    }
    
    if (uniqueFiles.length > 0) {
      await importFiles(uniqueFiles)
    }
  }, [tracks, importFiles])

  const handleImportMusic = useCallback(() => {
    importInputRef.current?.click()
  }, [])

  const handleImportInputChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files
    if (files) {
      void handleFilesSelected(Array.from(files))
    }
    event.target.value = ''
  }, [handleFilesSelected])

  const handleCreatePlaylist = useCallback((name: string) => {
    const newPlaylist: Playlist = {
      id: `playlist-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
      name: name.trim(),
      trackIds: [],
    }
    setPlaylists(prev => [...prev, newPlaylist])
  }, [])

  const handleDeletePlaylist = useCallback((id: string) => {
    setPlaylists(prev => prev.filter(p => p.id !== id))
  }, [])

  const handleOpenPlaylist = useCallback((playlistId: string) => {
    // TODO: Navigate to playlist detail page (not yet implemented)
    console.log('Open Playlist:', playlistId)
  }, [])

  const handlePlayPlaylist = useCallback((playlistId: string) => {
    // TODO: Implement play playlist functionality
    console.log('Play Playlist:', playlistId)
  }, [])

  // Navigation handler with scroll preservation
  const navigate = useNavigate()
  const location = useLocation()

  const handlePlayNext = useCallback((track: Track) => {
    // TODO: Implement queue functionality
    console.log('Play Next:', track.title)
  }, [])

  const handleAddToPlaylist = useCallback((trackId: string) => {
    // TODO: Implement add to playlist with dialog
    console.log('Add to Playlist:', trackId)
  }, [])

  const handleGoToAlbum = useCallback((album: { name: string; albumArtist: string }) => {
    navigate(`/albums/${encodeURIComponent(album.albumArtist)}/${encodeURIComponent(album.name)}`)
  }, [navigate])

  const handleGoToArtist = useCallback((artistName: string) => {
    navigate(`/artists/${encodeURIComponent(artistName)}`)
  }, [navigate])

  const handleRemoveFromLibrary = useCallback((trackId: string) => {
    setTracks(prev => prev.filter(t => t.id !== trackId))
  }, [])

  const handlePlayAlbum = useCallback((albumName: string, albumArtist: string) => {
    // Find all tracks in this album and play from the first one
    const albumTracks = tracks.filter(t => t.album === albumName && t.albumArtist === albumArtist)
    if (albumTracks.length > 0) {
      const firstTrackIndex = tracks.findIndex(t => t.id === albumTracks[0].id)
      if (firstTrackIndex >= 0) {
        playTrack(firstTrackIndex)
      }
    }
  }, [tracks, playTrack])

  const handlePlayAlbumNext = useCallback((albumName: string, albumArtist: string) => {
    // TODO: Implement queue functionality for albums
    console.log('Play Album Next:', albumName, albumArtist)
  }, [])

  const handleAddAlbumToPlaylist = useCallback((albumName: string, albumArtist: string) => {
    // TODO: Implement add album to playlist with dialog
    console.log('Add Album to Playlist:', albumName, albumArtist)
  }, [])

  const handleRemoveAlbumFromLibrary = useCallback((albumName: string, albumArtist: string) => {
    setTracks(prev => prev.filter(t => !(t.album === albumName && t.albumArtist === albumArtist)))
  }, [])

  const handlePlayArtist = useCallback((artistName: string) => {
    // Find all tracks by this artist and play from the first one
    const artistTracks = tracks.filter(t => parseArtists(t.artist).includes(artistName))
    if (artistTracks.length > 0) {
      const firstTrackIndex = tracks.findIndex(t => t.id === artistTracks[0].id)
      if (firstTrackIndex >= 0) {
        playTrack(firstTrackIndex)
      }
    }
  }, [tracks, playTrack])

  const handlePlayArtistNext = useCallback((artistName: string) => {
    // TODO: Implement queue functionality for artists
    console.log('Play Artist Next:', artistName)
  }, [])

  const handleAddArtistToPlaylist = useCallback((artistName: string) => {
    // TODO: Implement add artist to playlist with dialog
    console.log('Add Artist to Playlist:', artistName)
  }, [])

  const currentTrack = tracks[currentIndex] ?? null

  const mainRefForNav = useRef<HTMLElement | null>(null)
  const [scrollPositions, setScrollPositions] = useState<ScrollPositions>({
    artists: 0,
    albums: 0,
  })

  const saveScrollPosition = useCallback((page: 'artists' | 'albums') => {
    if (mainRefForNav.current) {
      setScrollPositions(prev => ({
        ...prev,
        [page]: mainRefForNav.current!.scrollTop,
      }))
    }
  }, [])

  const restoreScrollPosition = useCallback((page: 'artists' | 'albums') => {
    const scrollTop = scrollPositions[page]
    if (mainRefForNav.current && scrollTop > 0) {
      requestAnimationFrame(() => {
        mainRefForNav.current?.scrollTo(0, scrollTop)
      })
    }
  }, [scrollPositions])

  const handleNavigate = useCallback((path: string) => {
    const currentPath = location.pathname
    
    // Save scroll position for grid pages before navigating
    if (currentPath === '/artists') {
      saveScrollPosition('artists')
    } else if (currentPath === '/albums') {
      saveScrollPosition('albums')
    }
    
    navigate(path)
    
    // Restore scroll position when going back to grid pages
    if (path === '/artists' || path === '/albums') {
      restoreScrollPosition(path.slice(1) as 'artists' | 'albums')
    }
  }, [location.pathname, navigate, saveScrollPosition, restoreScrollPosition])

  return (
    <div className="flex-1 flex flex-col overflow-hidden">
      {/* Global import progress toast */}
      <input
        ref={importInputRef}
        type="file"
        accept="audio/*"
        multiple
        {...({ webkitdirectory: '', directory: '' } as React.InputHTMLAttributes<HTMLInputElement>)}
        onChange={handleImportInputChange}
        className="hidden"
      />
      <ImportProgressToast progress={progress} />

      <div className="flex-1 flex overflow-hidden relative">
        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 lg:hidden"
            onClick={() => setSidebarOpen(false)}
          />
        )}

        <Routes>
          <Route path="/library" element={
            <PageWrapper 
              onImportMusic={handleImportMusic} 
              handleNavigate={handleNavigate} 
              onMainRef={(ref) => { mainRefForNav.current = ref }}
              sidebarOpen={sidebarOpen}
              onSidebarClose={() => setSidebarOpen(false)}
            >
              <LibraryPage
                tracks={tracks}
                currentIndex={currentIndex}
                onTrackSelect={playTrack}
                onPlayNext={handlePlayNext}
                onAddToPlaylist={handleAddToPlaylist}
                onGoToAlbum={handleGoToAlbum}
                onGoToArtist={handleGoToArtist}
                onRemoveFromLibrary={handleRemoveFromLibrary}
                onImportMusic={handleImportMusic}
                onOpenSidebar={() => setSidebarOpen(true)}
              />
            </PageWrapper>
          } />
          
          <Route path="/artists" element={
            <PageWrapper 
              onImportMusic={handleImportMusic} 
              handleNavigate={handleNavigate} 
              onMainRef={(ref) => { mainRefForNav.current = ref }}
              sidebarOpen={sidebarOpen}
              onSidebarClose={() => setSidebarOpen(false)}
            >
              <ArtistsPage 
                tracks={tracks}
                onPlayArtist={handlePlayArtist}
                onPlayNext={handlePlayArtistNext}
                onAddToPlaylist={handleAddArtistToPlaylist}
                onOpenSidebar={() => setSidebarOpen(true)} 
              />
            </PageWrapper>
          } />
          
          <Route path="/artists/:artistName" element={
            <PageWrapper 
              onImportMusic={handleImportMusic} 
              handleNavigate={handleNavigate} 
              onMainRef={(ref) => { mainRefForNav.current = ref }}
              sidebarOpen={sidebarOpen}
              onSidebarClose={() => setSidebarOpen(false)}
            >
              <ArtistDetailPage
                tracks={tracks}
                currentIndex={currentIndex}
                onTrackSelect={playTrack}
                onOpenSidebar={() => setSidebarOpen(true)}
                onPlayNext={handlePlayNext}
                onAddToPlaylist={handleAddToPlaylist}
                onGoToAlbum={handleGoToAlbum}
                onGoToArtist={handleGoToArtist}
                onRemoveFromLibrary={handleRemoveFromLibrary}
              />
            </PageWrapper>
          } />
          
          <Route path="/albums" element={
            <PageWrapper 
              onImportMusic={handleImportMusic} 
              handleNavigate={handleNavigate} 
              onMainRef={(ref) => { mainRefForNav.current = ref }}
              sidebarOpen={sidebarOpen}
              onSidebarClose={() => setSidebarOpen(false)}
            >
              <AlbumsPage 
                tracks={tracks}
                onPlayAlbum={handlePlayAlbum}
                onPlayNext={handlePlayAlbumNext}
                onAddToPlaylist={handleAddAlbumToPlaylist}
                onRemoveFromLibrary={handleRemoveAlbumFromLibrary}
                onOpenSidebar={() => setSidebarOpen(true)} 
              />
            </PageWrapper>
          } />
          
          <Route path="/albums/:albumArtist/:albumName" element={
            <PageWrapper 
              onImportMusic={handleImportMusic} 
              handleNavigate={handleNavigate} 
              onMainRef={(ref) => { mainRefForNav.current = ref }}
              sidebarOpen={sidebarOpen}
              onSidebarClose={() => setSidebarOpen(false)}
            >
              <AlbumDetailPage
                tracks={tracks}
                currentIndex={currentIndex}
                onTrackSelect={playTrack}
                onOpenSidebar={() => setSidebarOpen(true)}
              />
            </PageWrapper>
          } />
          
          <Route path="/playlists" element={
            <PageWrapper 
              onImportMusic={handleImportMusic} 
              handleNavigate={handleNavigate} 
              onMainRef={(ref) => { mainRefForNav.current = ref }}
              sidebarOpen={sidebarOpen}
              onSidebarClose={() => setSidebarOpen(false)}
            >
              <PlaylistsPage
                playlists={playlists}
                tracks={tracks}
                onCreatePlaylist={handleCreatePlaylist}
                onDeletePlaylist={handleDeletePlaylist}
                onOpenSidebar={() => setSidebarOpen(true)}
                onOpenPlaylist={handleOpenPlaylist}
                onPlayPlaylist={handlePlayPlaylist}
              />
            </PageWrapper>
          } />
          
          {/* Default route redirects to library */}
          <Route path="/" element={
            <PageWrapper 
              onImportMusic={handleImportMusic} 
              handleNavigate={handleNavigate} 
              onMainRef={(ref) => { mainRefForNav.current = ref }}
              sidebarOpen={sidebarOpen}
              onSidebarClose={() => setSidebarOpen(false)}
            >
              <LibraryPage
                tracks={tracks}
                currentIndex={currentIndex}
                onTrackSelect={playTrack}
                onPlayNext={handlePlayNext}
                onAddToPlaylist={handleAddToPlaylist}
                onGoToAlbum={handleGoToAlbum}
                onGoToArtist={handleGoToArtist}
                onRemoveFromLibrary={handleRemoveFromLibrary}
                onImportMusic={handleImportMusic}
                onOpenSidebar={() => setSidebarOpen(true)}
              />
            </PageWrapper>
          } />
        </Routes>
      </div>

      {/* PlayerBar is outside the page switch — it persists across navigation */}
      <PlayerBar
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        volume={volume}
        canPrev={canPrev}
        canNext={canNext}
        onTogglePlay={togglePlay}
        onPrev={playPrev}
        onNext={playNext}
        onSeek={seek}
        onVolumeChange={setVolume}
        onArtistClick={handleGoToArtist}
        onCoverClick={() => setNowPlayingOpen(true)}
      />

      {/* Expanded Now Playing overlay */}
      <ExpandedNowPlaying
        isOpen={nowPlayingOpen}
        onClose={() => setNowPlayingOpen(false)}
        track={currentTrack}
        isPlaying={isPlaying}
        currentTime={currentTime}
        duration={duration}
        canPrev={canPrev}
        canNext={canNext}
        onTogglePlay={togglePlay}
        onPrev={playPrev}
        onNext={playNext}
        onSeek={seek}
        onArtistClick={handleGoToArtist}
      />
    </div>
  )
}

export default App
