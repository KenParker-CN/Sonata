import { getStrictContext } from '@/lib/get-strict-context'
import type { ArtId } from '@/services/customArt'
import type { Playlist, Track } from '@/types/music'
import type { PlaylistDetails } from '@/utils/playlist'

/**
 * Everything the routed pages need. Before this existed, App.tsx repeated the
 * same 8-12 callbacks through PageWrapper and the page props for all ten routes;
 * one mounted page reads one object instead.
 *
 * Player tick state (time, volume, queue) stays out of here — PlayerBar and
 * QueuePanel are rendered by App directly, so they take props.
 */
export interface AppContextValue {
  tracks: Track[]
  /** Every library track by id — the shared resolution for playlists and queues. */
  trackById: Map<string, Track>
  playlists: Playlist[]

  /** Id of the currently playing track, or null when nothing is queued. */
  currentTrackId: string | null
  isPlaying: boolean
  /** Replace the queue with these ids and start at `startIndex` into that list. */
  playFromContext: (trackIds: string[], startIndex: number) => void

  playTrackNext: (trackId: string) => void
  addTrackToQueue: (trackId: string) => void
  addTrackToPlaylist: (trackId: string, playlistId: string) => void
  removeFromLibrary: (trackId: string) => void

  playAlbum: (albumName: string, albumArtist: string) => void
  playAlbumNext: (albumName: string, albumArtist: string) => void
  addAlbumToPlaylist: (albumName: string, albumArtist: string, playlistId: string) => void
  removeAlbumFromLibrary: (albumName: string, albumArtist: string) => void

  playArtist: (artistName: string) => void
  playArtistNext: (artistName: string) => void
  addArtistToPlaylist: (artistName: string, playlistId: string) => void

  playComposer: (composerName: string) => void
  playComposerNext: (composerName: string) => void
  addComposerToPlaylist: (composerName: string, playlistId: string) => void

  requestCreatePlaylist: () => void
  playPlaylist: (playlistId: string) => void
  updatePlaylist: (playlistId: string, details: PlaylistDetails) => void
  deletePlaylist: (playlistId: string) => void
  removeTrackFromPlaylist: (playlistId: string, trackId: string) => void
  /** Swap a track with its neighbour in the stored playlist order. */
  moveTrackInPlaylist: (playlistId: string, trackId: string, direction: 'up' | 'down') => void
  addTracksToPlaylist: (playlistId: string, trackIds: string[]) => void

  /** Uploaded images by art id, as object URLs valid for this page. */
  artUrls: Partial<Record<ArtId, string>>
  /** Store a picked image under `id` — downscaled — and show it right away. */
  setCustomArt: (id: ArtId, file: File) => Promise<void>
  /** Drop the stored image under `id`, falling back to mosaic or generated art. */
  clearCustomArt: (id: ArtId) => Promise<void>
  requestResetLibrary: () => void

  theme: 'light' | 'dark'
  /** The next mode, asked for explicitly — ThemeToggler owns the light/dark flip. */
  setTheme: (theme: 'light' | 'dark') => void
  importMusic: () => void
  /** Drawer visibility — the full column on narrow screens. */
  sidebarOpen: boolean
  /** Desktop only: the column has shrunk to its icon rail. */
  sidebarCollapsed: boolean
  toggleSidebarCollapsed: () => void
  openSidebar: () => void
  closeSidebar: () => void
}

const [AppProvider, useApp] = getStrictContext<AppContextValue>('AppProvider')

export { AppProvider, useApp }
