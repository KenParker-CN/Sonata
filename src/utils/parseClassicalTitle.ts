// Conservative presentation-oriented parser for classical track titles.
// Splits "Work Title: Movement" when a clear ": " separator precedes a
// movement-like suffix (Roman numeral + period). Does NOT attempt semantic
// analysis of composers, keys, opus numbers, etc.
//
// Examples:
//   "Symphony No. 5 in C minor, Op. 67: I. Allegro con brio"
//     → { work: "Symphony No. 5 in C minor, Op. 67", movement: "I. Allegro con brio" }
//
//   "Goldberg Variations"
//     → { work: "Goldberg Variations", movement: null }

export interface ParsedClassicalTitle {
  work: string
  movement: string | null
}

// Matches a movement-like suffix: Roman numeral(s) followed by a period,
// e.g. "I.", "II.", "III.", "IV.", "V.", etc.
// Also handles common multi-movement patterns like "I. Allegro con brio".
const MOVEMENT_PATTERN = /^([IVXLC]+)\.\s+(.+)$/

export function parseClassicalTitle(title: string): ParsedClassicalTitle {
  if (!title || !title.trim()) {
    return { work: title?.trim() || '', movement: null }
  }

  const trimmed = title.trim()

  // Find the LAST occurrence of ": " — this handles titles that contain
  // commas or colons in the work name (e.g. "Sonata in C major, K. 545: ...")
  const lastColonIndex = trimmed.lastIndexOf(': ')
  if (lastColonIndex === -1) {
    return { work: trimmed, movement: null }
  }

  const beforeColon = trimmed.slice(0, lastColonIndex).trim()
  const afterColon = trimmed.slice(lastColonIndex + 2).trim()

  // Only split if the suffix looks like a movement (Roman numeral + period)
  if (MOVEMENT_PATTERN.test(afterColon) && beforeColon.length > 0) {
    return { work: beforeColon, movement: afterColon }
  }

  // Not a confident split — keep the full title as the work
  return { work: trimmed, movement: null }
}
