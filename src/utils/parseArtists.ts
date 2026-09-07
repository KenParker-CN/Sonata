/**
 * Parse a raw artist metadata string into individual artist names.
 *
 * Supports common separators:
 * - "/" (Artist A/Artist B)
 * - ";" (Artist A;Artist B)
 * - "&" (Artist A & Artist B)
 * - ", " (Artist A, Artist B) — conservative, avoids "Lastname, Firstname"
 *
 * Rules:
 * - Trim each artist name
 * - Remove empty strings
 * - Deduplicate (case-sensitive, preserve original casing)
 * - Do NOT normalize case or modify names
 */
export function parseArtists(value: string): string[] {
  if (!value || !value.trim()) {
    return []
  }

  // First split by unambiguous separators: / ; and &
  let parts = value.split(/[;&/]/)

  // Then handle commas conservatively
  const result: string[] = []

  for (const part of parts) {
    const trimmed = part.trim()
    if (!trimmed) continue

    // Check if this part contains ", " — potential multi-artist
    if (trimmed.includes(', ')) {
      // Conservative heuristic: split by ", " only if it looks like multiple artists
      // Avoid splitting "Lastname, Firstname" patterns
      const subParts = trimmed.split(', ')

      // Heuristic: if all sub-parts are relatively short and start with uppercase,
      // treat as multiple artists. Otherwise, keep as single artist.
      const looksLikeMultipleArtists = subParts.every(
        p => p.trim().length > 0 &&
             p.trim().length < 40 &&
             /^[A-Z]/.test(p.trim())
      )

      if (looksLikeMultipleArtists && subParts.length > 1) {
        result.push(...subParts.map(p => p.trim()).filter(p => p))
      } else {
        result.push(trimmed)
      }
    } else {
      result.push(trimmed)
    }
  }

  // Deduplicate while preserving order
  const seen = new Set<string>()
  const deduped: string[] = []

  for (const artist of result) {
    if (artist && !seen.has(artist)) {
      seen.add(artist)
      deduped.push(artist)
    }
  }

  return deduped
}
