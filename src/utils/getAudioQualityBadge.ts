import type { Track } from '@/types/music'

export type AudioQualityVariant = 'master' | 'hi-res' | 'cd' | 'hq'

export interface AudioQualityBadge {
  label: 'Master' | 'Hi-Res' | 'CD' | 'HQ'
  variant: AudioQualityVariant
}

// 24-bit only counts as a master when the sample rate reaches studio territory
const MASTER_MIN_SAMPLE_RATE = 88_200
// Lossy codecs top out near 320 kbps, so a bitrate above this range means lossless
// audio whose bit depth failed to parse — labelling that HQ would be wrong
const HQ_MAX_BITRATE = 500_000
const HQ_MIN_BITRATE = 256_000

/**
 * Resolve the single highest quality tier a track qualifies for.
 * Priority: MASTER > HI-RES > CD > HQ > no badge.
 *
 * MASTER and HI-RES are decided by bit depth + sample rate, never by bitrate.
 */
export function getAudioQualityBadge(track: Track): AudioQualityBadge | null {
  const { bitDepth, sampleRate, bitrate } = track

  if (bitDepth != null && bitDepth >= 24) {
    if (sampleRate != null && sampleRate >= MASTER_MIN_SAMPLE_RATE) {
      return { label: 'Master', variant: 'master' }
    }
    return { label: 'Hi-Res', variant: 'hi-res' }
  }

  if (bitDepth === 16 && sampleRate === 44_100) {
    return { label: 'CD', variant: 'cd' }
  }

  if (bitrate != null && bitrate >= HQ_MIN_BITRATE && bitrate <= HQ_MAX_BITRATE) {
    return { label: 'HQ', variant: 'hq' }
  }

  return null
}

// Tier ranking used to break ties in the album-level aggregation
const TIER_PRIORITY: Record<AudioQualityVariant, number> = {
  master: 4,
  'hi-res': 3,
  cd: 2,
  hq: 1,
}

/**
 * Album badge = the tier most tracks qualify for (the album's dominant quality),
 * not the single highest tier — one Hi-Res track among CD tracks should not
 * relabel the whole album. Ties resolve to the higher tier.
 */
export function getAlbumQualityBadge(tracks: Track[]): AudioQualityBadge | null {
  const counts = new Map<AudioQualityVariant, { count: number; badge: AudioQualityBadge }>()

  for (const track of tracks) {
    const badge = getAudioQualityBadge(track)
    if (!badge) continue
    const entry = counts.get(badge.variant)
    if (entry) {
      entry.count += 1
    } else {
      counts.set(badge.variant, { count: 1, badge })
    }
  }

  let best: { count: number; badge: AudioQualityBadge } | null = null
  for (const entry of counts.values()) {
    if (
      !best ||
      entry.count > best.count ||
      (entry.count === best.count &&
        TIER_PRIORITY[entry.badge.variant] > TIER_PRIORITY[best.badge.variant])
    ) {
      best = entry
    }
  }

  return best ? best.badge : null
}
