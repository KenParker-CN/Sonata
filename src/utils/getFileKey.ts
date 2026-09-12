// Deterministic identity for a track, built from where it is rather than from
// when the page happened to read it, so the same file keeps the same id across
// sessions and playlist references survive a reload.
export function makeFileKey(path: string, size: number, lastModified: number): string {
  return `${path}|${size}|${lastModified}`
}

export function trackIdFor(fileKey: string): string {
  return `track:${fileKey}`
}

export function getFileKey(file: File): string {
  return makeFileKey(getFilePath(file), file.size, file.lastModified)
}

export function getFilePath(file: File): string {
  return file.webkitRelativePath || file.name
}
