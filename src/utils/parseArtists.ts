/**
 * Split one person-name metadata tag into individual names. This is the single
 * rule used for `artist`, `albumArtist` and `composer`, so the Artists, Albums
 * and Composers pages cannot disagree about the same tag.
 *
 * Separators are exactly "/", ";" and "&":
 *   "Itzhak Perlman / Zubin Mehta" → ["Itzhak Perlman", "Zubin Mehta"]
 *   "Beethoven; Mozart"            → ["Beethoven", "Mozart"]
 *
 * A comma is deliberately NOT a separator. In classical tags it overwhelmingly
 * appears inside one person's name ("Karajan, Herbert von", "Thibaud, Jacques"),
 * where the separators above carry the multi-artist meaning. Anything that tries
 * to tell that apart from "Anna Netrebko, Jonas Kaufmann" has to guess, and a
 * wrong guess invents a person who is not in the library.
 *
 * Rules: trim each name, drop empty strings, deduplicate (case-sensitive,
 * original casing preserved). Names are never rewritten or case-normalized.
 */
export function parseArtists(value: string): string[] {
  if (!value || !value.trim()) {
    return []
  }

  const parts = value.split(/[;&/]/)

  const result: string[] = []
  for (const part of parts) {
    const trimmed = part.trim()
    if (trimmed) result.push(trimmed)
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
