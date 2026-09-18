export interface AudioEntry {
  path: string
  handle: FileSystemFileHandle
  lyricsHandle?: FileSystemFileHandle
}

// Some environments report an empty MIME type for files like .m4a, so the
// extension is the authority for what counts as audio here.
const AUDIO_EXTENSIONS = /\.(mp3|m4a|m4b|aac|flac|wav|wave|ogg|oga|opus|weba|aif|aiff|alac|wma)$/i
const LYRICS_EXTENSIONS = /\.lrc$/i

export function isAudioFileName(name: string): boolean {
  return AUDIO_EXTENSIONS.test(name)
}

export function isLyricsFileName(name: string): boolean {
  return LYRICS_EXTENSIONS.test(name)
}

/**
 * Matches a sidecar by exact basename in the same directory. Matching is
 * case-insensitive because folders copied between platforms may change case.
 */
export function lyricsSidecarKey(path: string): string {
  return path.replace(/\.[^./]+$/, '').toLocaleLowerCase()
}

export function matchLyricsPath(audioPath: string, lyricsPaths: Iterable<string>): string | null {
  const key = lyricsSidecarKey(audioPath)
  for (const path of lyricsPaths) {
    if (lyricsSidecarKey(path) === key && isLyricsFileName(path)) return path
  }
  return null
}

export function isPersistenceSupported(): boolean {
  return typeof indexedDB !== 'undefined' && typeof window.showDirectoryPicker === 'function'
}

// Returns null when the user dismisses the picker.
export async function pickMusicDirectory(): Promise<FileSystemDirectoryHandle | null> {
  try {
    return await window.showDirectoryPicker({ id: 'sonata-library', mode: 'read' })
  } catch (error) {
    if ((error as DOMException).name === 'AbortError') return null
    throw error
  }
}

// Handles only: reading bytes is left to the caller so a restore never stats a
// file the library doesn't reference. Paths are prefixed with the picked
// directory's name, matching what the folder-input fallback produces.
export async function collectAudioEntries(
  root: FileSystemDirectoryHandle,
): Promise<AudioEntry[]> {
  const files: Array<{ path: string; handle: FileSystemFileHandle }> = []
  const walk = async (dir: FileSystemDirectoryHandle, prefix: string): Promise<void> => {
    for await (const child of dir.values()) {
      if (child.name.startsWith('.')) continue
      if (child.kind === 'directory') {
        await walk(child, `${prefix}/${child.name}`)
      } else if (isAudioFileName(child.name) || isLyricsFileName(child.name)) {
        files.push({ path: `${prefix}/${child.name}`, handle: child })
      }
    }
  }
  await walk(root, root.name)

  const lyricsByKey = new Map<string, { path: string; handle: FileSystemFileHandle }>()
  for (const file of files) {
    if (isLyricsFileName(file.path)) lyricsByKey.set(lyricsSidecarKey(file.path), file)
  }

  return files
    .filter(file => isAudioFileName(file.path))
    .map(file => ({
      path: file.path,
      handle: file.handle,
      lyricsHandle: lyricsByKey.get(lyricsSidecarKey(file.path))?.handle,
    }))
}

// `ask` must only be true from inside a click handler: requestPermission shows a
// prompt, queryPermission just reports what it knows.
export async function hasReadAccess(
  handle: FileSystemDirectoryHandle,
  ask: boolean,
): Promise<boolean> {
  const descriptor = { mode: 'read' as const }
  const state = ask
    ? await handle.requestPermission(descriptor)
    : await handle.queryPermission(descriptor)
  return state === 'granted'
}
