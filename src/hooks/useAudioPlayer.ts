import type {RefObject} from 'react'
import {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import type {QueueItem, RepeatMode, Track} from '../types/music'

let queueItemSeq = 0

function requiresSoftwareDecoder(track: Track): boolean {
    return /alac|apple lossless/i.test(track.codec ?? '') || /\.(m4a|m4b|mp4|mov)$/i.test(track.filePath)
}

const FADE_IN_MS = 280
const FADE_OUT_MS = 180

function createFloatWavUrl(channelData: Float32Array[], sampleRate: number): string {
    const channels = channelData.length
    const frames = channelData[0]?.length ?? 0
    const dataSize = frames * channels * Float32Array.BYTES_PER_ELEMENT
    const buffer = new ArrayBuffer(44 + dataSize)
    const view = new DataView(buffer)
    const writeAscii = (offset: number, value: string) => {
        for (let index = 0; index < value.length; index += 1) {
            view.setUint8(offset + index, value.charCodeAt(index))
        }
    }

    writeAscii(0, 'RIFF')
    view.setUint32(4, 36 + dataSize, true)
    writeAscii(8, 'WAVE')
    writeAscii(12, 'fmt ')
    view.setUint32(16, 16, true)
    view.setUint16(20, 3, true)
    view.setUint16(22, channels, true)
    view.setUint32(24, sampleRate, true)
    view.setUint32(28, sampleRate * channels * Float32Array.BYTES_PER_ELEMENT, true)
    view.setUint16(32, channels * Float32Array.BYTES_PER_ELEMENT, true)
    view.setUint16(34, 32, true)
    writeAscii(36, 'data')
    view.setUint32(40, dataSize, true)

    let offset = 44
    for (let frame = 0; frame < frames; frame += 1) {
        for (let channel = 0; channel < channels; channel += 1) {
            view.setFloat32(offset, channelData[channel][frame] ?? 0, true)
            offset += Float32Array.BYTES_PER_ELEMENT
        }
    }

    return URL.createObjectURL(new Blob([buffer], {type: 'audio/wav'}))
}

function nextQueueItemId(): string {
    queueItemSeq += 1
    return `q${Date.now()}-${queueItemSeq}`
}

// Fisher–Yates shuffle; returns a new array and leaves the input untouched.
function shuffled<T>(input: readonly T[]): T[] {
    const arr = [...input]
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1))
        const tmp = arr[i]
        arr[i] = arr[j]
        arr[j] = tmp
    }
    return arr
}

interface AudioPlayerState {
    /** ID of the track in the playing queue slot, or null when nothing is queued. */
    currentTrackId: string | null
    /** Full playback queue — the single source of truth for playback order. */
    queue: QueueItem[]
    /** Index into `queue` for the currently playing item (-1 when empty). */
    currentQueueIndex: number
    isPlaying: boolean
    currentTime: number
    duration: number
    volume: number
    repeatMode: RepeatMode
    shuffle: boolean
    canPrev: boolean
    canNext: boolean
    playbackError: string | null
    audioElementRef: RefObject<HTMLAudioElement | null>
}

interface AudioPlayerActions {
    /**
     * Replace the queue with `trackIds` and start playback at the item
     * `startIndex` points at inside that same list. All playback entry points
     * (library, albums, artists, composers, playlists) funnel through this action
     * so the queue is the single source of order.
     */
    playFromContext: (trackIds: string[], startIndex: number) => void
    /** Jump to a specific queue position (used by the Queue view). */
    playQueueItemAt: (queueIndex: number) => void
    /** Advance to the next item inside the queue. Takes no arguments so it is safe to wire directly to an onClick handler. */
    playNext: () => void
    /** Insert a track immediately after the current item ("Play Next"). Starts playback when the queue is empty. */
    queueNext: (trackId: string) => void
    /** Insert several tracks after the current item, keeping their order, in one queue update. */
    queueNextMany: (trackIds: string[]) => void
    /** Step back inside the queue. */
    playPrev: () => void
    togglePlay: () => void
    seek: (time: number) => void
    setVolume: (volume: number) => void
    cycleRepeatMode: () => void
    toggleShuffle: () => void
    /** Append a track at the end of the queue. */
    addToQueue: (trackId: string) => void
    /** Remove one queue entry by its unique item id, keeping state valid. */
    removeFromQueue: (queueItemId: string) => void
    /** Move the item at fromIndex to toIndex (the final position), keeping the current item stable. */
    moveQueueItem: (fromIndex: number, toIndex: number) => void
}

export function useAudioPlayer(tracks: Track[]): AudioPlayerState & AudioPlayerActions {
    const audioRef = useRef<HTMLAudioElement | null>(null)
    const decodedUrlRef = useRef<string | null>(null)
    const softwareDecodeRef = useRef(false)
    const decodeRequestRef = useRef(0)
    const fadeFrameRef = useRef<number | null>(null)
    const fadeTokenRef = useRef(0)
    const userVolumeRef = useRef(1)
    const isPlayingRef = useRef(false)
    const trackByIdRef = useRef<Map<string, Track>>(new Map(tracks.map(t => [t.id, t])))
    const progressFrameRef = useRef<number | null>(null)

    const repeatModeRef = useRef<RepeatMode>('off')
    const shuffleRef = useRef(false)

    // Queue state lives in refs so the one-time audio event handlers always see
    // the newest values; mirrored react state drives the UI.
    const queueRef = useRef<QueueItem[]>([])
    const currentQueueIndexRef = useRef(-1)
    // Snapshot of the original upcoming order, taken when shuffle is enabled so
    // the order can be restored (as best as possible) when shuffle is disabled.
    const shuffleBaseUpNextRef = useRef<QueueItem[]>([])

    const [queue, setQueue] = useState<QueueItem[]>([])
    const [currentQueueIndex, setCurrentQueueIndex] = useState(-1)
    const [isPlaying, setIsPlaying] = useState(false)
    const [currentTime, setCurrentTime] = useState(0)
    const [duration, setDuration] = useState(0)
    const [volume, setVolumeState] = useState(1)
    const [repeatMode, setRepeatMode] = useState<RepeatMode>('off')
    const [shuffle, setShuffle] = useState(false)
    const [playbackError, setPlaybackError] = useState<string | null>(null)
    const audioElementRef = useRef<HTMLAudioElement | null>(null)

    const targetVolume = useCallback(() => Math.min(1, Math.max(0, userVolumeRef.current)), [])

    const cancelFade = useCallback(() => {
        fadeTokenRef.current += 1
        if (fadeFrameRef.current !== null) {
            window.cancelAnimationFrame(fadeFrameRef.current)
            fadeFrameRef.current = null
        }
    }, [])

    const fadeTo = useCallback((audio: HTMLAudioElement, target: number, duration: number, onDone?: () => void) => {
        cancelFade()
        const token = fadeTokenRef.current
        const start = audio.volume
        const startedAt = performance.now()

        const tick = (now: number) => {
            if (token !== fadeTokenRef.current) return
            const progress = Math.min(1, (now - startedAt) / duration)
            // `volume` throws IndexSizeError outside [0, 1]; keep the lerp honest.
            audio.volume = Math.min(1, Math.max(0, start + (target - start) * progress))
            if (progress >= 1) {
                fadeFrameRef.current = null
                onDone?.()
                return
            }
            fadeFrameRef.current = window.requestAnimationFrame(tick)
        }

        fadeFrameRef.current = window.requestAnimationFrame(tick)
    }, [cancelFade])

    const playWithFade = useCallback((audio: HTMLAudioElement) => {
        cancelFade()
        audio.volume = 0
        void audio.play()
            .then(() => fadeTo(audio, targetVolume(), FADE_IN_MS))
            .catch(() => {
                audio.volume = targetVolume()
            })
    }, [cancelFade, fadeTo, targetVolume])

    // Keep refs in sync with state so event handlers always see latest values.
    // Handlers that start or stop playback also write isPlayingRef directly:
    // audio.play() is async, and a synchronous caller (togglePlay right after
    // playQueueItemAt) must see the new state before this render commits.
    useEffect(() => {
        isPlayingRef.current = isPlaying
    }, [isPlaying])
    useEffect(() => {
        repeatModeRef.current = repeatMode
    }, [repeatMode])
    useEffect(() => {
        shuffleRef.current = shuffle
    }, [shuffle])
    // Sync the latest track map for async audio event handlers
    useEffect(() => {
        trackByIdRef.current = new Map(tracks.map(t => [t.id, t]))
    }, [tracks])

    // Drop queue entries whose track left the library. The current item is
    // re-located by id so surrounding removals cannot shift it; if the playing
    // track itself was removed, stop — its blob URL is revoked by the remover,
    // so the stream cannot continue.
    useEffect(() => {
        const byId = trackByIdRef.current
        const q = queueRef.current
        if (q.length === 0 || q.every(item => byId.has(item.trackId))) return

        const next = q.filter(item => byId.has(item.trackId))
        queueRef.current = next
        setQueue(next)
        shuffleBaseUpNextRef.current = shuffleBaseUpNextRef.current.filter(item => byId.has(item.trackId))

        const currentId = q[currentQueueIndexRef.current]?.id
        const newCi = currentId === undefined ? -1 : next.findIndex(item => item.id === currentId)
        if (newCi >= 0) {
            currentQueueIndexRef.current = newCi
            setCurrentQueueIndex(newCi)
            return
        }

        const audio = audioRef.current
        audio?.pause()
        isPlayingRef.current = false
        setIsPlaying(false)
        currentQueueIndexRef.current = -1
        setCurrentQueueIndex(-1)
    }, [tracks])

    // Play a concrete queue position. Reads only from refs + stable setters, so
    // it can be referenced by the one-time audio effect below and by actions.
  const playQueueItemAt = useCallback((queueIndex: number) => {
    const audio = audioRef.current
    const item = queueRef.current[queueIndex]

    if (!audio || !item) return

    const track = trackByIdRef.current.get(item.trackId)

    if (!track) return

    currentQueueIndexRef.current = queueIndex
    setCurrentQueueIndex(queueIndex)
    setPlaybackError(null)
    softwareDecodeRef.current = requiresSoftwareDecoder(track)

    setCurrentTime(0)
    setDuration(0)
    decodeRequestRef.current += 1
    const requestId = decodeRequestRef.current

    if (decodedUrlRef.current) {
        URL.revokeObjectURL(decodedUrlRef.current)
        decodedUrlRef.current = null
    }

    const loadAndPlay = (source: string) => {
        if (requestId !== decodeRequestRef.current) return
        audio.src = source
        playWithFade(audio)
    }

    const replaceSource = (source: string) => {
        const start = () => {
            if (requestId !== decodeRequestRef.current) return
            audio.pause()
            audio.src = ''
            loadAndPlay(source)
        }
        if (audio.src && !audio.paused) {
            fadeTo(audio, 0, FADE_OUT_MS, start)
        } else {
            cancelFade()
            start()
        }
    }

    if (!requiresSoftwareDecoder(track)) {
        replaceSource(track.url)
        return
    }

    void fetch(track.url)
        .then(response => response.arrayBuffer())
        .then(bytes => import('@audio/decode-aac').then(({default: decode}) => decode(bytes)))
        .then(({channelData, sampleRate}) => {
            if (requestId !== decodeRequestRef.current || !audioRef.current) return
            const decodedUrl = createFloatWavUrl(channelData, sampleRate)
            decodedUrlRef.current = decodedUrl
            replaceSource(decodedUrl)
        })
        .catch(error => {
            if (requestId !== decodeRequestRef.current) return
            console.error('[audio] M4A decode failed', error)
            setIsPlaying(false)
            isPlayingRef.current = false
            setPlaybackError(`Cannot decode "${track.title}" — the M4A audio data could not be decoded.`)
        })
  }, [cancelFade, fadeTo, playWithFade])

        // Audio element lives for the entire component lifecycle — never recreated.
        // playQueueItemAt has no dependencies, so this effect stays mount-only.
        useEffect(() => {
            const audio = new Audio()
            audioRef.current = audio
            audioElementRef.current = audio

            const onTimeUpdate = () => setCurrentTime(audio.currentTime)
            const onLoadedMetadata = () => setDuration(audio.duration)

            // Smooth progress animation at 60fps
            const startProgressLoop = () => {
                const tick = () => {
                    if (audioRef.current && isPlayingRef.current) {
                        setCurrentTime(audioRef.current.currentTime)
                        progressFrameRef.current = requestAnimationFrame(tick)
                    }
                }
                progressFrameRef.current = requestAnimationFrame(tick)
            }

            const stopProgressLoop = () => {
                if (progressFrameRef.current !== null) {
                    cancelAnimationFrame(progressFrameRef.current)
                    progressFrameRef.current = null
                }
            }

            // Surface decode/playback failures instead of failing silently.
            const onError = () => {
                if (!audio.src || softwareDecodeRef.current) return
                audio.pause()
                setIsPlaying(false)
                isPlayingRef.current = false
                const qItem = queueRef.current[currentQueueIndexRef.current]
                const currentTrack = qItem ? trackByIdRef.current.get(qItem.trackId) ?? null : null
                const codec = currentTrack?.codec ?? 'unknown codec'
                console.error(
                    `[audio] Playback failed (error code ${audio.error?.code ?? 'unknown'}) for ${currentTrack?.title ?? audio.src}` +
                    ` — codec: ${codec}, lossless: ${currentTrack?.lossless ?? 'unknown'}`,
                )
                setPlaybackError(
                    `Cannot play "${currentTrack?.title ?? 'this track'}" — Unsupported audio encoding, or a DRM-protected file.`,
                )
            }

            // When a track ends, advance inside the queue (repeat-one replays the item).
            const onEnded = () => {
                const q = queueRef.current
                const ci = currentQueueIndexRef.current
                if (q.length === 0 || ci < 0) {
                    setIsPlaying(false)
                    isPlayingRef.current = false
                    return
                }

                // Repeat one: replay the same track
                if (repeatModeRef.current === 'one') {
                    audio.currentTime = 0
                    playWithFade(audio)
                    return
                }

                let nextIndex: number | null = null

                if (ci < q.length - 1) {
                    // Normal: advance to the next queue item
                    nextIndex = ci + 1
                } else if (repeatModeRef.current === 'all' && q.length > 0) {
                    // Repeat all + last item: wrap around to the queue start
                    nextIndex = 0
                }
                // else: repeat off + last item → stop

                if (nextIndex !== null) {
                    playQueueItemAt(nextIndex)
                } else {
                    setIsPlaying(false)
                    isPlayingRef.current = false
                }
            }

            const onPlay = () => {
                setIsPlaying(true)
                startProgressLoop()
            }
            const onPause = () => {
                setIsPlaying(false)
                stopProgressLoop()
            }

            const onWaiting = () => {
                console.warn('[audio] waiting', {
                    currentTime: audio.currentTime,
                    duration: audio.duration,
                    paused: audio.paused,
                    readyState: audio.readyState,
                    networkState: audio.networkState,
                })
            }

            const onStalled = () => {
                console.error('[audio] stalled', {
                    currentTime: audio.currentTime,
                    duration: audio.duration,
                    paused: audio.paused,
                    readyState: audio.readyState,
                    networkState: audio.networkState,
                    src: audio.src,
                })
            }

            const onSuspend = () => {
                console.warn('[audio] suspend', {
                    currentTime: audio.currentTime,
                    readyState: audio.readyState,
                    networkState: audio.networkState,
                })
            }

            const onPlaying = () => {
                console.log('[audio] playing', {
                    currentTime: audio.currentTime,
                })
            }

            audio.addEventListener('waiting', onWaiting)
            audio.addEventListener('stalled', onStalled)
            audio.addEventListener('suspend', onSuspend)
            audio.addEventListener('playing', onPlaying)
            audio.addEventListener('loadedmetadata', onLoadedMetadata)
            audio.addEventListener('ended', onEnded)
            audio.addEventListener('play', onPlay)
            audio.addEventListener('pause', onPause)
            audio.addEventListener('error', onError)

            return () => {
                audio.removeEventListener('loadedmetadata', onLoadedMetadata)
                audio.removeEventListener('ended', onEnded)
                audio.removeEventListener('play', onPlay)
                audio.removeEventListener('pause', onPause)
                audio.removeEventListener('error', onError)
                cancelFade()
                stopProgressLoop()
                audio.pause()
                audio.src = ''
                if (decodedUrlRef.current) {
                    URL.revokeObjectURL(decodedUrlRef.current)
                    decodedUrlRef.current = null
                }
                audioRef.current = null
                audioElementRef.current = null
                softwareDecodeRef.current = false
                audio.removeEventListener('waiting', onWaiting)
                audio.removeEventListener('stalled', onStalled)
                audio.removeEventListener('suspend', onSuspend)
                audio.removeEventListener('playing', onPlaying)
            }
        }, [cancelFade, playQueueItemAt, playWithFade])

        // ------------------------------------------------------------------
        // Queue actions
        // ------------------------------------------------------------------

        /** Replace the queue with a new playback context and start playing. */
        const playFromContext = useCallback((trackIds: string[], startIndex: number) => {
            const audio = audioRef.current
            if (!audio) return
            const byId = trackByIdRef.current
            const base = trackIds
                .filter(trackId => byId.has(trackId))
                .map(trackId => ({id: nextQueueItemId(), trackId}))
            if (base.length === 0) return

            // The clicked track stays the clicked track even if earlier ids were
            // dropped above; a start that no longer resolves falls back to the top.
            const startId = trackIds[startIndex]
            const start = Math.min(
                Math.max(base.findIndex(item => item.trackId === startId), 0),
                base.length - 1,
            )

            // History + current item stay stable; only upcoming items may be shuffled.
            shuffleBaseUpNextRef.current = shuffleRef.current ? base.slice(start + 1) : []
            const next = shuffleRef.current
                ? [...base.slice(0, start + 1), ...shuffled(base.slice(start + 1))]
                : base

            queueRef.current = next
            setQueue(next)
            playQueueItemAt(start)
        }, [playQueueItemAt])

        /** Insert tracks right after the current item, keeping their given order. */
        const queueNextMany = useCallback((trackIds: string[]) => {
            const byId = trackByIdRef.current
            const items: QueueItem[] = trackIds
                .filter(trackId => byId.has(trackId))
                .map(trackId => ({id: nextQueueItemId(), trackId}))
            if (items.length === 0) return

            const q = queueRef.current
            // Empty queue: Play Next becomes "start playing these tracks".
            if (q.length === 0) {
                queueRef.current = items
                shuffleBaseUpNextRef.current = []
                setQueue(items)
                playQueueItemAt(0)
                return
            }
            const insertAt = Math.min(currentQueueIndexRef.current + 1, q.length)
            const next = [...q.slice(0, insertAt), ...items, ...q.slice(insertAt)]
            queueRef.current = next
            setQueue(next)
            // Keep the shuffle base list in sync so a later disable restores order.
            if (shuffleRef.current) {
                shuffleBaseUpNextRef.current = [...items, ...shuffleBaseUpNextRef.current]
            }
        }, [playQueueItemAt])

        /** Insert a track right after the current item ("Play Next"). */
        const queueNext = useCallback((trackId: string) => {
            queueNextMany([trackId])
        }, [queueNextMany])

        /** Advance to the next queue item. */
        const playNext = useCallback(() => {
            const q = queueRef.current
            const ci = currentQueueIndexRef.current
            if (q.length === 0 || ci < 0) return
            if (ci < q.length - 1) {
                playQueueItemAt(ci + 1)
            } else if (repeatModeRef.current === 'all' && q.length > 0) {
                playQueueItemAt(0)
            }
        }, [playQueueItemAt])

        // Previous: has prev → prev; repeat all + first → wrap to last; else → nothing
        const playPrev = useCallback(() => {
            const q = queueRef.current
            const ci = currentQueueIndexRef.current
            if (q.length === 0 || ci < 0) return
            if (ci > 0) {
                playQueueItemAt(ci - 1)
            } else if (repeatModeRef.current === 'all' && q.length > 0) {
                playQueueItemAt(q.length - 1)
            }
        }, [playQueueItemAt])

        const togglePlay = useCallback(() => {
            const audio = audioRef.current
            if (!audio) return
            if (isPlayingRef.current) {
                fadeTo(audio, 0, FADE_OUT_MS, () => {
                    audio.pause()
                    audio.volume = targetVolume()
                })
            } else {
                playWithFade(audio)
            }
        }, [fadeTo, playWithFade, targetVolume])

        const seek = useCallback((time: number) => {
            const audio = audioRef.current
            if (!audio) return
            audio.currentTime = time
            setCurrentTime(time)
        }, [])

        const setVolume = useCallback((vol: number) => {
            const audio = audioRef.current
            const clamped = Math.min(1, Math.max(0, vol))
            userVolumeRef.current = clamped
            setVolumeState(clamped)
            if (!audio || fadeFrameRef.current !== null) return
            audio.volume = targetVolume()
        }, [targetVolume])

        // Updaters stay pure: React calls them twice in dev StrictMode, so any ref
        // write or queue rebuild done inside one would happen twice with different
        // random results. The current values are read from the refs mirrored above.
        // Cycle: off → all → one → off
        const cycleRepeatMode = useCallback(() => {
            const mode = repeatModeRef.current
            setRepeatMode(mode === 'off' ? 'all' : mode === 'all' ? 'one' : 'off')
        }, [])

        // Shuffle only reorders the upcoming items; history and the current track
        // stay put. Disabling shuffle restores the original upcoming order as
        // closely as possible without maintaining a second playback system.
        const toggleShuffle = useCallback(() => {
            const next = !shuffleRef.current
            setShuffle(next)

            const q = queueRef.current
            const ci = currentQueueIndexRef.current
            if (q.length === 0 || ci < 0) return

            if (next) {
                // (Re)capture the untouched upcoming order before shuffling.
                shuffleBaseUpNextRef.current = q.slice(ci + 1)
                const reordered = [...q.slice(0, ci + 1), ...shuffled(q.slice(ci + 1))]
                queueRef.current = reordered
                setQueue(reordered)
            } else if (shuffleBaseUpNextRef.current.length > 0) {
                // Restore: history + current stay, upcoming follows the saved order;
                // entries added while shuffled keep their relative order at the end.
                const currentUpNext = q.slice(ci + 1)
                const baseIds = new Set(shuffleBaseUpNextRef.current.map(i => i.id))
                const restored = shuffleBaseUpNextRef.current.filter(i =>
                    currentUpNext.some(u => u.id === i.id),
                )
                const additions = currentUpNext.filter(i => !baseIds.has(i.id))
                const reordered = [...q.slice(0, ci + 1), ...restored, ...additions]
                queueRef.current = reordered
                setQueue(reordered)
            }
        }, [])

        /** Append a track at the end of the queue. */
        const addToQueue = useCallback((trackId: string) => {
            if (!trackByIdRef.current.has(trackId)) return
            const q = queueRef.current
            const next = [...q, {id: nextQueueItemId(), trackId}]
            queueRef.current = next
            setQueue(next)
        }, [])

        /**
         * Remove a single queue entry. The current index is adjusted according to
         * the removed position. Removing the current item advances to the next item
         * when one exists, otherwise it stops playback safely.
         */
        const removeFromQueue = useCallback((queueItemId: string) => {
            const audio = audioRef.current
            const q = queueRef.current
            const remIndex = q.findIndex(item => item.id === queueItemId)
            if (remIndex < 0) return
            const ci = currentQueueIndexRef.current

            const next = q.filter(item => item.id !== queueItemId)
            queueRef.current = next
            setQueue(next)
            shuffleBaseUpNextRef.current = shuffleBaseUpNextRef.current.filter(item => item.id !== queueItemId)

            if (next.length === 0) {
                // Queue is now empty: stop playback and reset the index safely.
                audio?.pause()
                isPlayingRef.current = false
                setIsPlaying(false)
                currentQueueIndexRef.current = -1
                setCurrentQueueIndex(-1)
                return
            }

            if (remIndex < ci) {
                // Removed an item before the current one — shift the index down.
                currentQueueIndexRef.current = ci - 1
                setCurrentQueueIndex(ci - 1)
            } else if (remIndex === ci) {
                // Removed the currently playing item.
                if (ci < next.length) {
                    // A next item shifted into place — keep playing it.
                    playQueueItemAt(ci)
                } else {
                    // No next item — stop playback and park at the new end.
                    audio?.pause()
                    isPlayingRef.current = false
                    setIsPlaying(false)
                    currentQueueIndexRef.current = next.length - 1
                    setCurrentQueueIndex(next.length - 1)
                }
            }
            // remIndex > ci: removed an upcoming item — the current index is unchanged.
        }, [playQueueItemAt])

        /**
         * Move the item at fromIndex to toIndex (final position in the queue).
         * currentQueueIndex is adjusted so the currently playing item stays the same
         * logical item.
         */
        const moveQueueItem = useCallback((fromIndex: number, toIndex: number) => {
            const q = queueRef.current
            if (fromIndex < 0 || fromIndex >= q.length || toIndex < 0 || toIndex >= q.length) return
            if (fromIndex === toIndex) return

            const ci = currentQueueIndexRef.current
            const item = q[fromIndex]
            const without = q.filter((_, i) => i !== fromIndex)
            const next = [...without.slice(0, toIndex), item, ...without.slice(toIndex)]
            queueRef.current = next
            setQueue(next)

            // Keep the current logical item at the same place in the queue.
            let newCi = ci
            if (fromIndex === ci) {
                newCi = toIndex
            } else if (fromIndex < ci && toIndex >= ci) {
                newCi = ci - 1
            } else if (fromIndex > ci && toIndex <= ci) {
                newCi = ci + 1
            }
            currentQueueIndexRef.current = newCi
            setCurrentQueueIndex(newCi)
        }, [])

        const currentTrackId = useMemo(() => {
            const item =
                currentQueueIndex >= 0 && currentQueueIndex < queue.length
                    ? queue[currentQueueIndex]
                    : null
            return item?.trackId ?? null
        }, [queue, currentQueueIndex])

        // canPrev/canNext operate on the queue; repeat-all enables wraparound at the
        // boundaries. Shuffle only reorders upcoming items so it does not affect
        // whether navigation is possible.
        const canPrev = useMemo(() => {
            if (currentQueueIndex < 0 || queue.length <= 1) return false
            if (repeatMode === 'all') return true
            return currentQueueIndex > 0
        }, [queue.length, repeatMode, currentQueueIndex])

        const canNext = useMemo(() => {
            if (currentQueueIndex < 0 || queue.length <= 1) return false
            if (repeatMode === 'all') return true
            return currentQueueIndex < queue.length - 1
        }, [queue.length, repeatMode, currentQueueIndex])

        return {
            currentTrackId,
            queue,
            currentQueueIndex,
            isPlaying,
            currentTime,
            duration,
            volume,
            repeatMode,
            shuffle,
            canPrev,
            canNext,
            playbackError,
            audioElementRef,
            playFromContext,
            playQueueItemAt,
            playNext,
            queueNext,
            queueNextMany,
            playPrev,
            togglePlay,
            seek,
            setVolume,
            cycleRepeatMode,
            toggleShuffle,
            addToQueue,
            removeFromQueue,
            moveQueueItem,
        }
    }
