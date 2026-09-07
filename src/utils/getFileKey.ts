/**
 * Generate a deterministic key for a File object based on its name, size, and lastModified timestamp.
 * This is used for duplicate detection during import.
 *
 * Note: This is a browser-MVP approach. Future Tauri version may use canonical file paths.
 */
export function getFileKey(file: File): string {
  return `${file.name}|${file.size}|${file.lastModified}`
}
