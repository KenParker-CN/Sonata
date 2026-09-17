/**
 * Extract a representative accent color from an image via canvas sampling.
 * Returns a CSS-ready `hsl(...)` string, or null when extraction fails.
 */
export async function extractAccentColor(src: string): Promise<string | null> {
  return new Promise((resolve) => {
    const image = new Image()
    image.decoding = 'async'
    image.onload = () => {
      try {
        resolve(sampleAccent(image))
      } catch {
        resolve(null)
      }
    }
    image.onerror = () => resolve(null)
    image.src = src
  })
}

/**
 * Sample pixels from the image, quantize them, and return the most common
 * color as an HSL string. Works with any image that can be drawn onto a
 * canvas (including blob: and data: URLs). Cross-origin images that cannot
 * be tainted are skipped.
 */
function sampleAccent(image: HTMLImageElement): string | null {
  const canvas = document.createElement('canvas')
  const size = Math.min(image.naturalWidth, image.naturalHeight, 128)
  if (size < 16) return null
  canvas.width = size
  canvas.height = size
  const context = canvas.getContext('2d')
  if (!context) return null
  context.drawImage(image, 0, 0, size, size)
  const pixels = context.getImageData(0, 0, size, size).data

  // Collect colors with a coarse quantization: reduce each channel to 4 bits.
  const colorMap = new Map<number, number>()
  for (let i = 0; i < pixels.length; i += 4) {
    const r = pixels[i]
    const g = pixels[i + 1]
    const b = pixels[i + 2]
    const a = pixels[i + 3]
    if (a < 128) continue // skip transparent pixels

    // Quantize to 4 bits per channel (16 steps). This groups visually similar
    // colors together and keeps the map small enough for a 128x128 sample.
    const qr = (r * 16 + 255) / 510 // 0..15
    const qg = (g * 16 + 255) / 510
    const qb = (b * 16 + 255) / 510
    const key = (Math.round(qr) << 8) | (Math.round(qg) << 4) | Math.round(qb)
    colorMap.set(key, (colorMap.get(key) ?? 0) + 1)
  }

  if (colorMap.size === 0) return null

  // Pick the most frequent quantized color.
  let dominantKey = 0
  let dominantCount = 0
  for (const [key, count] of colorMap) {
    if (count > dominantCount) {
      dominantCount = count
      dominantKey = key
    }
  }

  const dr = ((dominantKey >> 8) & 0xf) * 510 / 16
  const dg = ((dominantKey >> 4) & 0xf) * 510 / 16
  const db = (dominantKey & 0xf) * 510 / 16

  // Convert to HSL.
  const [h, s, l] = rgbToHsl(dr, dg, db)
  // Saturate a touch and lighten/darken slightly so the accent reads well
  // against the player's dark surface.
  const adjustedS = Math.min(100, s * 1.15)
  const adjustedL = Math.max(30, Math.min(70, l * 1.1))
  return `hsl(${Math.round(h)} ${Math.round(adjustedS)}% ${Math.round(adjustedL)}%)`
}

function rgbToHsl(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const l = (max + min) / 2 / 255
  if (max === min) return [0, 0, l * 100]

  const d = max - min
  const s = l > 0.5 ? d / (2 * 255 - max - min) : d / (max + min)
  let h = 0
  switch (max) {
    case r:
      h = ((g - b) / d + (g < b ? 6 : 0)) / 6
      break
    case g:
      h = ((b - r) / d + 2) / 6
      break
    case b:
      h = ((r - g) / d + 4) / 6
      break
  }
  return [h * 360, s * 100, l * 100]
}