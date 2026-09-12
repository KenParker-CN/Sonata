import type { Playlist, Track } from '@/types/music'
import { makeFileKey } from '@/utils/getFileKey'
import { collectAudioEntries, hasReadAccess, isPersistenceSupported } from './musicFolders'
import { loadLibrarySnapshot, type StoredTrack } from './libraryStore'

export interface RestoredLibrary {
  tracks: Track[]
  playlists: Playlist[]
  // Names of remembered folders whose read access has to be re-granted by hand.
  rootsNeedingAccess: string[]
  tracksNeedingAccess: number
  persistenceUnavailable: boolean
}

// Chrome keeps a granted read permission for a directory handle across reloads,
// so a normal launch restores silently; after the grant expires the caller has
// to retry with askForAccess from inside a click handler.
export async function buildLibrary(askForAccess: boolean): Promise<RestoredLibrary> {
  if (!isPersistenceSupported()) {
    return {
      tracks: [],
      playlists: [],
      rootsNeedingAccess: [],
      tracksNeedingAccess: 0,
      persistenceUnavailable: true,
    }
  }

  const { roots, tracks: stored, playlists } = await loadLibrarySnapshot()
  const handlesByPath = new Map<string, FileSystemFileHandle>()
  const rootsNeedingAccess: string[] = []

  for (const root of roots) {
    if (!(await hasReadAccess(root.handle, askForAccess))) {
      rootsNeedingAccess.push(root.id)
      continue
    }
    for (const entry of await collectAudioEntries(root.handle)) {
      handlesByPath.set(entry.path, entry.handle)
    }
  }

  const candidates: Array<{ record: StoredTrack; handle: FileSystemFileHandle }> = []
  let tracksNeedingAccess = 0
  for (const record of stored) {
    const handle = handlesByPath.get(record.metadata.filePath)
    if (handle) {
      candidates.push({ record, handle })
    } else if (isUnderRoot(record.metadata.filePath, rootsNeedingAccess)) {
      tracksNeedingAccess += 1
    }
  }

  const resolved = await Promise.all(
    candidates.map(({ record, handle }) => revive(record, handle)),
  )

  return {
    tracks: resolved.filter((track): track is Track => track !== null),
    playlists,
    rootsNeedingAccess,
    tracksNeedingAccess,
    persistenceUnavailable: false,
  }
}

function isUnderRoot(path: string, rootNames: string[]): boolean {
  return rootNames.some(name => path.startsWith(`${name}/`))
}

// A cached record whose file has since changed size or timestamp is treated as
// gone rather than played back with stale metadata.
async function revive(
  record: StoredTrack,
  handle: FileSystemFileHandle,
): Promise<Track | null> {
  const file = await handle.getFile()
  if (makeFileKey(record.metadata.filePath, file.size, file.lastModified) !== record.fileKey) {
    return null
  }
  return {
    ...record.metadata,
    url: URL.createObjectURL(file),
    cover: record.cover ? URL.createObjectURL(record.cover) : null,
  }
}
