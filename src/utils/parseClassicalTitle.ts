// Presentation-oriented parser for classical track titles.
// Splits a title at its first colon into a candidate work and section.
// It deliberately does not classify the section (movement, variation, scene,
// excerpt, arrangement…) — only the surrounding tracks can tell those apart,
// which is groupTracksByWork()'s job.
//
// Examples:
//   "Symphony No. 5 in C minor, Op. 67: I. Allegro con brio"
//     → { work: "Symphony No. 5 in C minor, Op. 67", movement: "I. Allegro con brio" }
//
//   "Concerto for Viola & Orchestra in D major: I. Allegro (Kadenz: Franz Beyer)"
//     → { work: "Concerto for Viola & Orchestra in D major",
//         movement: "I. Allegro (Kadenz: Franz Beyer)" }
//
//   "Goldberg Variations"
//     → { work: "Goldberg Variations", movement: null }

export interface ParsedClassicalTitle {
  work: string
  movement: string | null
}

// Tags edited with a CJK IME often carry a full-width colon instead of ":".
const COLON = /[：:](?=[\s\u00A0\u202F])/

export function parseClassicalTitle(title: string): ParsedClassicalTitle {

  const trimmed = title
      ?.replace(/[\u00A0\u202F]/g, ' ')
      .trim() || ''
  const separator = trimmed.search(COLON)
  if (separator < 0) {
    return { work: trimmed, movement: null }
  }

  const work = trimmed.slice(0, separator).trim()
  const movement = trimmed.slice(separator + 1).trim()

  if (!work || !movement) {
    return { work: trimmed, movement: null }
  }

  return { work, movement }
}
