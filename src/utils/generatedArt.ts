/**
 * Monogram for entities that have no image of their own: first letter of the
 * first and last word, or the leading character alone when the name is a
 * single word — "Johannes Brahms" → JB, "Madonna" → M, which also keeps CJK
 * names to one glyph instead of a broken pair. The same name always shortens
 * to the same initials, on every machine and reload.
 */
export function initialsOf(name: string): string {
  const words = name.trim().replace(/^(the|le|la)\s+/i, '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}
