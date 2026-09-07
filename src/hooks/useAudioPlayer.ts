import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import type { RepeatMode, Track } from '../types/music'

// Pick a random index from [0, length), never the same as excludeIndex
function pickRandomIndex(length: number, excludeIndex: number): number {
  if (length <= 1) return excludeIndex
  let next: number
  do {
    next = Math.floor(Math.random() * length)
  } while (next === excludeIndex)
  return next
}

interface AudioPlayerState {
  currentIndex: number
  isPlaying: boolean
  currentTime: number
  duration: number
  volume: number
  repeatMode: RepeatMode
  shuffle: boolean
  canPrev: boolean
  canNext: boolean
}

interface AudioPlayerActions {
  playTrack: (index: number) => void
  togglePlay: () => void
  playNext: () => void
  playPrev: () => void
  seek: (time: number) => void
  setVolume: (volume: number) => void
  cycleRepeatMode: () => void
  toggleShuffle: () => void
}

export function useAudioPlayer(tracks: Track[]): AudioPlayerState & AudioPlayerActions {
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const currentIndexRef = useRef(0)
  const isPlayingRef = useRef(false)
  const tracksRef = useRef(tracks)
  tracksRef.current = tracks

  const repeatModeRef = useRef<RepeatMode>('off')
  const shuffleRef = useRef(false)

  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [volume, setVolumeState] = useState(1)
  const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
  const [shuffle, setShuffle] = useState(false)

  // Keep refs in sync with state so event handlers always see latest values
  useEffect(() => { currentIndexRef.current = currentIndex }, [currentIndex])
  useEffect(() => { isPlayingRef.current = isPlaying }, [isPlaying])
  useEffect(() => { repeatModeRef.current = repeatMode }, [repeatMode])
  useEffect(() => { shuffleRef.current = shuffle }, [shuffle])

  // Audio element lives for the entire component lifecycle — never recreated
  useEffect(() => {
    const audio = new Audio()
    audioRef.current = audio

    const onTimeUpdate = () => setCurrentTime(audio.currentTime)
    const onLoadedMetadata = () => setDuration(audio.duration)

    // When a track ends, decide what to play next based on repeat/shuffle state
    const onEnded = () => {
      const list = tracksRef.current
      const idx = currentIndexRef.current
      if (list.length === 0) return

      // Repeat one: replay the same track
      if (repeatModeRef.current === 'one') {
        audio.currentTime = 0
        audio.play().catch(() => {})
        return
      }

      let nextIndex: number | null = null

      if (shuffleRef.current) {
        // Shuffle: pick a random track (never the current one)
        nextIndex = pickRandomIndex(list.length, idx)
      } else if (idx < list.length - 1) {
        // Normal: advance to next track
        nextIndex = idx + 1
      } else if (repeatModeRef.current === 'all') {
        // Repeat all + last track: wrap around to beginning
        nextIndex = 0
      }
      // else: repeat off + last track → stop

      if (nextIndex !== null) {
        setCurrentIndex(nextIndex)
        audio.src = list[nextIndex].url
        audio.play().catch(() => {})
        setIsPlaying(true)
      } else {
        setIsPlaying(false)
        isPlayingRef.current = false
      }
    }

    const onPlay = () => setIsPlaying(true)
    const onPause = () => setIsPlaying(false)

    audio.addEventListener('timeupdate', onTimeUpdate)
    audio.addEventListener('loadedmetadata', onLoadedMetadata)
    audio.addEventListener('ended', onEnded)
    audio.addEventListener('play', onPlay)
    audio.addEventListener('pause', onPause)

    return () => {
      audio.removeEventListener('timeupdate', onTimeUpdate)
      audio.removeEventListener('loadedmetadata', onLoadedMetadata)
      audio.removeEventListener('ended', onEnded)
      audio.removeEventListener('play', onPlay)
      audio.removeEventListener('pause', onPause)
      audio.pause()
      audio.src = ''
      audioRef.current = null
    }
  }, [])

  const playTrack = useCallback((index: number) => {
    const audio = audioRef.current
    const list = tracksRef.current
    if (!audio || index < 0 || index >= list.length) return
    setCurrentIndex(index)
    currentIndexRef.current = index
    audio.src = list[index].url
    audio.play().catch(() => {})
    setIsPlaying(true)
    isPlayingRef.current = true
  }, [])

  const togglePlay = useCallback(() => {
    const audio = audioRef.current
    if (!audio) return
    if (isPlayingRef.current) {
      audio.pause()
    } else {
      audio.play().catch(() => {})
    }
  }, [])

  // Next: shuffle → random; has next → next; repeat all + last → wrap to 0; else → nothing
  const playNext = useCallback(() => {
    const list = tracksRef.current
    const idx = currentIndexRef.current
    if (list.length === 0) return

    if (shuffleRef.current) {
      playTrack(pickRandomIndex(list.length, idx))
    } else if (idx < list.length - 1) {
      playTrack(idx + 1)
    } else if (repeatModeRef.current === 'all') {
      playTrack(0)
    }
  }, [playTrack])

  // Previous: shuffle → random; has prev → prev; repeat all + first → wrap to last; else → nothing
  const playPrev = useCallback(() => {
    const list = tracksRef.current
    const idx = currentIndexRef.current
    if (list.length === 0) return

    if (shuffleRef.current) {
      playTrack(pickRandomIndex(list.length, idx))
    } else if (idx > 0) {
      playTrack(idx - 1)
    } else if (repeatModeRef.current === 'all') {
      playTrack(list.length - 1)
    }
  }, [playTrack])

  const seek = useCallback((time: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.currentTime = time
    setCurrentTime(time)
  }, [])

  const setVolume = useCallback((vol: number) => {
    const audio = audioRef.current
    if (!audio) return
    audio.volume = vol
    setVolumeState(vol)
  }, [])

  // Cycle: off → all → one → off
  const cycleRepeatMode = useCallback(() => {
    setRepeatMode(prev => {
      const next = prev === 'off' ? 'all' : prev === 'all' ? 'one' : 'off'
      repeatModeRef.current = next
      return next
    })
  }, [])

  const toggleShuffle = useCallback(() => {
    setShuffle(prev => {
      const next = !prev
      shuffleRef.current = next
      return next
    })
  }, [])

  // canPrev/canNext: with shuffle or repeat-all, navigation is always possible (when >1 track)
  const canPrev = useMemo(() => {
    if (tracks.length <= 1) return false
    if (shuffle || repeatMode === 'all') return true
    return currentIndex > 0
  }, [tracks.length, shuffle, repeatMode, currentIndex])

  const canNext = useMemo(() => {
    if (tracks.length <= 1) return false
    if (shuffle || repeatMode === 'all') return true
    return currentIndex < tracks.length - 1
  }, [tracks.length, shuffle, repeatMode, currentIndex])

  return {
    currentIndex,
    isPlaying,
    currentTime,
    duration,
    volume,
    repeatMode,
    shuffle,
    canPrev,
    canNext,
    playTrack,
    togglePlay,
    playNext,
    playPrev,
    seek,
    setVolume,
    cycleRepeatMode,
    toggleShuffle,
  }
}
