import type { Playlist, Track } from '@/types/music'

const DB_NAME = 'sonata'
// v2 adds the `art` store: images the user uploaded for an entity that the
// library itself carries no artwork for.
const DB_VERSION = 2
const TRACK_STORE = 'tracks'
const ROOT_STORE = 'roots'
const STATE_STORE = 'state'
const ART_STORE = 'art'
const PLAYLIST_KEY = 'playlists'

// `url` and `cover` are object URLs for blobs made in the current page, so they
// die with the tab and are cached blank; restore rebuilds both. The audio itself
// is never copied into IndexedDB — a track is remembered by its File System
// Access path, and the cache holds the parsed metadata plus the cover bytes.
export type StoredTrackMetadata = Track

export interface StoredTrack {
  id: string
  fileKey: string
  // '' for imports this browser can't remember (no directory handle).
  rootId: string
  cover: Blob | null
  metadata: StoredTrackMetadata
}

export interface StoredRoot {
  id: string
  handle: FileSystemDirectoryHandle
}

export interface LibrarySnapshot {
  roots: StoredRoot[]
  tracks: StoredTrack[]
  playlists: Playlist[]
}

let dbPromise: Promise<IDBDatabase> | null = null

function openDb(): Promise<IDBDatabase> {
  dbPromise ??= new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(TRACK_STORE)) {
        db.createObjectStore(TRACK_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(ROOT_STORE)) {
        db.createObjectStore(ROOT_STORE, { keyPath: 'id' })
      }
      if (!db.objectStoreNames.contains(STATE_STORE)) {
        db.createObjectStore(STATE_STORE, { keyPath: 'key' })
      }
      if (!db.objectStoreNames.contains(ART_STORE)) {
        db.createObjectStore(ART_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
  return dbPromise
}

function request<T>(open: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    open.onsuccess = () => resolve(open.result)
    open.onerror = () => reject(open.error)
  })
}

function transactionDone(tx: IDBTransaction): Promise<void> {
  return new Promise((resolve, reject) => {
    tx.oncomplete = () => resolve()
    tx.onabort = () => reject(tx.error)
    tx.onerror = () => reject(tx.error)
  })
}

export async function saveImport(root: StoredRoot | null, tracks: StoredTrack[]): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([TRACK_STORE, ROOT_STORE], 'readwrite')
  if (root) tx.objectStore(ROOT_STORE).put(root)
  for (const track of tracks) tx.objectStore(TRACK_STORE).put(track)
  await transactionDone(tx)
}

// A directory nobody still references would keep asking for permission on every
// launch, so it goes away with its last track.
export async function deleteStoredTracks(ids: string[]): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([TRACK_STORE, ROOT_STORE], 'readwrite')
  for (const id of ids) tx.objectStore(TRACK_STORE).delete(id)
  await transactionDone(tx)

  const remaining = await loadStoredTracks()
  const usedRootIds = new Set(remaining.map(track => track.rootId))
  const roots = await loadStoredRoots()
  const orphaned = roots.filter(root => !usedRootIds.has(root.id))
  if (orphaned.length === 0) return

  const cleanup = db.transaction(ROOT_STORE, 'readwrite')
  for (const root of orphaned) cleanup.objectStore(ROOT_STORE).delete(root.id)
  await transactionDone(cleanup)
}

export async function loadStoredTracks(): Promise<StoredTrack[]> {
  const db = await openDb()
  return request(db.transaction(TRACK_STORE, 'readonly').objectStore(TRACK_STORE).getAll())
}

export async function loadStoredRoots(): Promise<StoredRoot[]> {
  const db = await openDb()
  return request(db.transaction(ROOT_STORE, 'readonly').objectStore(ROOT_STORE).getAll())
}

export async function savePlaylists(playlists: Playlist[]): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(STATE_STORE, 'readwrite')
  tx.objectStore(STATE_STORE).put({ key: PLAYLIST_KEY, value: playlists })
  await transactionDone(tx)
}

export interface StoredArt {
  id: `artist:${string}` | `composer:${string}` | `playlist:${string}`
  blob: Blob
}

// Users upload a handful of these, so restore reads the whole store in one pass
// and turns each blob into an object URL for the lifetime of the page.
export async function loadStoredArt(): Promise<StoredArt[]> {
  const db = await openDb()
  return request(db.transaction(ART_STORE, 'readonly').objectStore(ART_STORE).getAll())
}

export async function saveArt(art: StoredArt): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(ART_STORE, 'readwrite')
  tx.objectStore(ART_STORE).put(art)
  await transactionDone(tx)
}

export async function deleteArt(id: StoredArt['id']): Promise<void> {
  const db = await openDb()
  const tx = db.transaction(ART_STORE, 'readwrite')
  tx.objectStore(ART_STORE).delete(id)
  await transactionDone(tx)
}

export async function loadLibrarySnapshot(): Promise<LibrarySnapshot> {
  const db = await openDb()
  const entry = await request<{ key: string; value: Playlist[] } | undefined>(
    db.transaction(STATE_STORE, 'readonly').objectStore(STATE_STORE).get(PLAYLIST_KEY),
  )
  const [roots, tracks] = await Promise.all([loadStoredRoots(), loadStoredTracks()])
  return { roots, tracks, playlists: entry?.value ?? [] }
}

export async function clearStoredLibrary(): Promise<void> {
  const db = await openDb()
  const tx = db.transaction([TRACK_STORE, ROOT_STORE, STATE_STORE, ART_STORE], 'readwrite')
  tx.objectStore(TRACK_STORE).clear()
  tx.objectStore(ROOT_STORE).clear()
  tx.objectStore(ART_STORE).clear()
  tx.objectStore(STATE_STORE).delete(PLAYLIST_KEY)
  await transactionDone(tx)
}
