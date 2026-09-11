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

  // Find a colon followed by a movement-like suffix.
  // This avoids accidentally splitting on colons inside parentheses,
  // e.g. "(Kadenz: Franz Beyer)".
  const match = trimmed.match(/:\s+([IVXLC]+\.\s+.+)$/)

  if (match && match.index !== undefined) {
    const work = trimmed.slice(0, match.index).trim()
    const movement = match[1].trim()

    if (work.length > 0 && MOVEMENT_PATTERN.test(movement)) {
      return {
        work,
        movement,
      }
    }
  }

  // Not a confident split — keep the full title as the work.
  return {
    work: trimmed,
    movement: null,
  }
}
