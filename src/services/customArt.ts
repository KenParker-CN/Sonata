import { isPersistenceSupported } from './musicFolders'
import { loadStoredArt } from './libraryStore'
import type { StoredArt } from '@/services/libraryStore'

export type ArtId = StoredArt['id']

/** Every uploaded image, as an object URL valid for this page. */
export async function loadCustomArt(): Promise<Partial<Record<ArtId, string>>> {
  if (!isPersistenceSupported()) return {}
  const stored = await loadStoredArt()
  const urls: Partial<Record<ArtId, string>> = {}
  for (const { id, blob } of stored) urls[id] = URL.createObjectURL(blob)
  return urls
}

export const artistArtId = (name: string): ArtId => `artist:${name}`
export const composerArtId = (name: string): ArtId => `composer:${name}`
export const playlistArtId = (playlistId: string): ArtId => `playlist:${playlistId}`

// Anything wider than this is downscaled before it is stored; a banner renders
// at a few hundred pixels and a multi-megabyte original would only bloat the
// cache for the rest of its life.
const MAX_SIDE = 1024

/**
 * Ready-to-store bytes for a picked image. An image that already fits is kept
 * byte for byte so a small upload is never re-encoded and degraded; a larger one
 * is downscaled and re-encoded as WebP.
 */
export async function prepareArt(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file)
  try {
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height))
    if (scale === 1) return file

    const canvas = document.createElement('canvas')
    canvas.width = Math.round(bitmap.width * scale)
    canvas.height = Math.round(bitmap.height * scale)
    const context = canvas.getContext('2d')
    if (!context) throw new Error('Canvas 2D is unavailable')
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)

    return await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        blob => (blob ? resolve(blob) : reject(new Error('Could not encode the image'))),
        'image/webp',
        0.88,
      )
    })
  } finally {
    bitmap.close()
  }
}
