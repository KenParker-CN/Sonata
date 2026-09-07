/**
 * Extract dominant color from an image URL using Canvas API.
 * Returns hex color string or null if extraction fails.
 */
export async function extractDominantColor(imageUrl: string): Promise<string | null> {
  return new Promise((resolve) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    
    img.onload = () => {
      try {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')
        
        if (!ctx) {
          resolve(null)
          return
        }

        // Resize for performance - sample at smaller size
        const width = 50
        const height = 50
        canvas.width = width
        canvas.height = height
        
        ctx.drawImage(img, 0, 0, width, height)
        
        const imageData = ctx.getImageData(0, 0, width, height)
        const data = imageData.data
        
        // Count color frequency (skip very dark/white pixels)
        const colorMap = new Map<string, number>()
        
        for (let i = 0; i < data.length; i += 4) {
          const r = data[i]
          const g = data[i + 1]
          const b = data[i + 2]
          const a = data[i + 3]
          
          // Skip transparent or near-white/near-black pixels
          if (a < 128 || (r > 250 && g > 250 && b > 250) || (r < 10 && g < 10 && b < 10)) {
            continue
          }
          
          // Quantize colors to reduce palette (round to nearest 32)
          const qr = Math.round(r / 32) * 32
          const qg = Math.round(g / 32) * 32
          const qb = Math.round(b / 32) * 32
          
          const key = `${qr},${qg},${qb}`
          colorMap.set(key, (colorMap.get(key) || 0) + 1)
        }
        
        // Find most frequent color
        let maxCount = 0
        let dominantColor = ''
        
        for (const [color, count] of colorMap.entries()) {
          if (count > maxCount) {
            maxCount = count
            dominantColor = color
          }
        }
        
        if (!dominantColor) {
          resolve(null)
          return
        }
        
        const [r, g, b] = dominantColor.split(',').map(Number)
        const hex = rgbToHex(r, g, b)
        resolve(hex)
      } catch {
        resolve(null)
      }
    }
    
    img.onerror = () => {
      resolve(null)
    }
    
    img.src = imageUrl
  })
}

/**
 * Convert RGB to hex color string.
 */
function rgbToHex(r: number, g: number, b: number): string {
  return `#${((1 << 24) + (r << 16) + (g << 8) + b).toString(16).slice(1).toUpperCase()}`
}

/**
 * Adjust color for better contrast in current theme context.
 * Returns adjusted hex color that works well as text accent color.
 */
export function adjustColorForContrast(hexColor: string, isDarkMode: boolean): string {
  const r = parseInt(hexColor.slice(1, 3), 16)
  const g = parseInt(hexColor.slice(3, 5), 16)
  const b = parseInt(hexColor.slice(5, 7), 16)
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  
  if (isDarkMode) {
    // In dark mode, ensure color is bright enough for text
    if (luminance < 0.5) {
      // Boost brightness
      const factor = 0.5 / luminance
      const newR = Math.min(255, Math.round(r * factor))
      const newG = Math.min(255, Math.round(g * factor))
      const newB = Math.min(255, Math.round(b * factor))
      return rgbToHex(newR, newG, newB)
    }
  } else {
    // In light mode, ensure color is dark enough for text
    if (luminance > 0.6) {
      // Reduce brightness
      const factor = 0.6 / luminance
      const newR = Math.max(0, Math.round(r * factor))
      const newG = Math.max(0, Math.round(g * factor))
      const newB = Math.max(0, Math.round(b * factor))
      return rgbToHex(newR, newG, newB)
    }
  }
  
  return hexColor
}

/**
 * Detect if system is in dark mode.
 */
export function isDarkMode(): boolean {
  return window.matchMedia('(prefers-color-scheme: dark)').matches
}
