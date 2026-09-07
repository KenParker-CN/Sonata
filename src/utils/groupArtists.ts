import type { Track } from '@/types/music'
import { parseArtists } from '@/utils/parseArtists'

export interface Artist {
  name: string
  trackCount: number
}

export function groupArtists(tracks: Track[]): Artist[] {
  // Map artist name → set of track IDs (for dedup counting)
  const map = new Map<string, Set<string>>()

  for (const track of tracks) {
    // Parse both track.artist and track.albumArtist to get all artists
    const trackArtists = parseArtists(track.artist)
    const albumArtists = parseArtists(track.albumArtist)
    
    // Combine and deduplicate artists for this track
    const allArtists = [...new Set([...trackArtists, ...albumArtists])]
    
    // If no valid artists found, use "Unknown Artist"
    const names = allArtists.length > 0 ? allArtists : ['Unknown Artist']

    for (const name of names) {
      if (map.has(name)) {
        map.get(name)!.add(track.id)
      } else {
        map.set(name, new Set([track.id]))
      }
    }
  }

  // Convert to Artist[] with trackCount = number of unique tracks
  return Array.from(map.entries()).map(([name, trackIds]) => ({
    name,
    trackCount: trackIds.size,
  }))
}
