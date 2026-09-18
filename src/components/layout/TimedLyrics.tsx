import '@applemusic-like-lyrics/core/style.css'
import type {CSSProperties, RefObject} from 'react'
import {useEffect, useRef} from 'react'
import type {LyricLine} from '@applemusic-like-lyrics/core'
import {LyricPlayer, type LyricPlayerRef} from '@applemusic-like-lyrics/react'

interface TimedLyricsProps {
    /** Lines the tag carried timing for, already sorted by `parseLyrics`. */
    lines: LyricLine[]
    playing: boolean
    audioElementRef: RefObject<HTMLAudioElement | null>
}

/**
 * Apple-Music-style timed lyrics, rendered by AMLL (applemusic-like-lyrics).
 * Loading this file also loads AMLL's stylesheet, which is why it sits behind
 * its own dynamic import in LyricsPanel.
 *
 * Everything AMLL needs beyond the lines — spring, blur, scale, centring — is
 * left at its default, so the panel follows the library's own idea of how
 * lyrics should look instead of pinning a set of effects here.
 */
export default function TimedLyrics({lines, playing, audioElementRef}: TimedLyricsProps) {
    const playerRef = useRef<LyricPlayerRef | null>(null)

    // AMLL takes the position as a prop, but holding it in state would re-render
    // React ~60 times a second for as long as a track plays. The <audio> element
    // is already the clock, so the frame loop hands its position straight to the
    // player instance — the imperative approach the audio hook itself uses.
    useEffect(() => {
        let frame = 0
        let attached: HTMLAudioElement | null = null
        let lastPushed = -1
        let seeked = false
        const onSeeked = () => {
            seeked = true
        }

        const tick = () => {
            const audio = audioElementRef.current
            // The element is created by the audio hook's mount effect and can
            // outlive a render, so the listener is attached whenever it changes.
            if (audio !== attached) {
                attached?.removeEventListener('seeked', onSeeked)
                audio?.addEventListener('seeked', onSeeked)
                attached = audio
            }

            const player = playerRef.current?.lyricPlayer
            if (audio && player) {
                const position = Math.round(audio.currentTime * 1000)
                if (position !== lastPushed) {
                    // A seek lands the highlight where the user jumped to instead
                    // of animating it across the gap.
                    player.setCurrentTime(position, seeked)
                    lastPushed = position
                    seeked = false
                }
            }

            frame = requestAnimationFrame(tick)
        }

        frame = requestAnimationFrame(tick)
        return () => {
            cancelAnimationFrame(frame)
            attached?.removeEventListener('seeked', onSeeked)
        }
    }, [audioElementRef])

    return (
        <LyricPlayer
            ref={playerRef}
            lyricLines={lines}
            // Pinned to 0 so a track change resets the scrolling; the frame loop
            // above pushes the real position on its next frame.
            currentTime={0}
            playing={playing}
            wordFadeWidth={1}
            className="h-full w-full"
            style={{
                // The panel is part of the always-dark player surface, so it reads
                // the player tokens rather than the theme's own colours.
                '--amll-lp-color': 'var(--color-player-foreground)',
                '--amll-lp-font-size': 'clamp(1rem, 0.5vw + 0.9rem, 1.5rem)',
            } as CSSProperties}
        />
    )
}
