// Search is a literal test on accent-stripped text: "bach" finds "Bach" and
// "Alban Berg" finds "berg", with no synonym table anywhere to fall out of date.
function normalizeForSearch(text: string): string {
  return text
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .toLocaleLowerCase()
}

/**
 * The query split into terms. Whitespace separates them and every term has to
 * match, so "beethoven moonlight" narrows instead of widening.
 */
export function searchTerms(query: string): string[] {
  return normalizeForSearch(query).split(/\s+/).filter(Boolean)
}

/** True when every term appears in at least one of the row's fields. */
export function matchesSearch(terms: string[], ...fields: (string | null | undefined)[]): boolean {
  if (terms.length === 0) return true
  const haystack = normalizeForSearch(fields.filter(Boolean).join(' '))
  return terms.every(term => haystack.includes(term))
}
