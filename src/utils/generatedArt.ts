/**
 * Deterministic artwork for entities that have no image of their own.
 *
 * Everything derives from the name, so the same artist or playlist paints the
 * same colours on every machine and across reloads — no random seed to persist
 * and no cache to invalidate.
 */

// FNV-1a offset basis and prime
const OFFSET_BASIS = 0x811c9dc5
const PRIME = 0x01000193

function hashName(name: string): number {
  let hash = OFFSET_BASIS
  for (let i = 0; i < name.length; i++) {
    hash ^= name.charCodeAt(i)
    hash = Math.imul(hash, PRIME) >>> 0
  }
  return hash >>> 0
}

/**
 * Two analogous hues keep every tile inside one colour family — a random second
 * hue would land on clashing pairs for roughly a third of the library.
 */
export function generatedBackground(name: string): string {
  const hash = hashName(name)
  const hue = hash % 360
  const partnerHue = (hue + 24 + ((hash >>> 9) % 48)) % 360
  const angle = 90 + ((hash >>> 18) % 4) * 45
  const deep = `hsl(${partnerHue} 58% 24%)`
  return [
    `radial-gradient(120% 100% at 18% 12%, hsl(${partnerHue} 85% 62% / 0.45), transparent 58%)`,
    `linear-gradient(${angle}deg, hsl(${hue} 62% 46%), ${deep})`,
  ].join(', ')
}

/**
 * Monogram: first letter of the first and last word, or the leading character
 * alone when the name is a single word — "Johannes Brahms" → JB, "Madonna" → M,
 * which also keeps CJK names to one glyph instead of a broken pair.
 */
export function initialsOf(name: string): string {
  const words = name.trim().replace(/^(the|le|la)\s+/i, '').split(/\s+/).filter(Boolean)
  if (words.length === 0) return ''
  if (words.length === 1) return words[0].charAt(0).toUpperCase()
  return (words[0].charAt(0) + words[words.length - 1].charAt(0)).toUpperCase()
}
