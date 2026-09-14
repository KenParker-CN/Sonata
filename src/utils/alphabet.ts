// A-Z indexing shared by the artist and composer directories. Anything that
// doesn't start with a Latin letter — digits, CJK, punctuation — falls into
// the '#' bucket, which always sorts last.
export const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

/** First letter bucket for A-Z indexing; anything else falls into '#'. */
export function getInitial(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase()
  return ch >= 'A' && ch <= 'Z' ? ch : '#'
}

/** Bucket rows by the initial of `getName`, preserving the order given. */
export function groupByInitial<T>(
  rows: readonly T[],
  getName: (row: T) => string,
): Map<string, T[]> {
  const map = new Map<string, T[]>()
  for (const row of rows) {
    const letter = getInitial(getName(row))
    if (!map.has(letter)) map.set(letter, [])
    map.get(letter)!.push(row)
  }
  return map
}

/**
 * Letter order for the sections: A-Z, reversed for a Z-A sort, then '#' last
 * either way.
 */
export function sectionLetters(
  groups: { has(letter: string): boolean },
  reverse = false,
): string[] {
  const letters = ALPHABET.filter(letter => groups.has(letter))
  if (reverse) letters.reverse()
  if (groups.has('#')) letters.push('#')
  return letters
}
