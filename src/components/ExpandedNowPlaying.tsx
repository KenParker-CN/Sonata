import type { Track } from '@/types/music'
import { formatTime } from '@/utils/formatTime'
import { parseArtists } from '@/utils/parseArtists'
import { parseClassicalTitle } from '@/utils/parseClassicalTitle'
import { findActiveLyricLines, findActiveWord } from '@/utils/parseLyrics'
import { extractDominantColor, adjustColorForContrast, isDarkMode } from '@/utils/extractColor'
import { getAudioQualityBadge } from '@/utils/getAudioQualityBadge'
import AudioQualityBadge from '@/components/AudioQualityBadge'
import {
  Drawer,
  DrawerContent,
  DrawerTitle,
} from '@/components/ui/Drawer'
import LyricsControls from '@/components/LyricsControls'
import { Play, Pause, SkipBack, SkipForward, X, Disc3 } from 'lucide-react'
import { useEffect, useRef, useState, useCallback } from 'react'

interface ExpandedNowPlayingProps {
  isOpen: boolean
  onClose: () => void
  track: Track | null
  isPlaying: boolean
  currentTime: number
  duration: number
  canPrev: boolean
  canNext: boolean
  onTogglePlay: () => void
  onPrev: () => void
  onNext: () => void
  onSeek: (time: number) => void
  onArtistClick?: (artistName: string) => void
}

export default function ExpandedNowPlaying({
  isOpen,
  onClose,
  track,
  isPlaying,
  currentTime,
  duration,
  canPrev,
  canNext,
  onTogglePlay,
  onPrev,
  onNext,
  onSeek,
  onArtistClick,
}: ExpandedNowPlayingProps) {
  // Parse classical title if needed
  const parsedTitle = track ? parseClassicalTitle(track.title) : null
  
  // Find active lyric lines (can be multiple with same startTime) and words
  const activeLineIndices = findActiveLyricLines(currentTime, track?.lyrics ?? null)
  const activeWordIndices = new Map<number, number>()
  
  // For each active line, find the active word index if it has word-level sync
  activeLineIndices.forEach(lineIndex => {
    const line = track?.lyrics?.lines[lineIndex]
    if (line?.words && line.words.length > 0) {
      activeWordIndices.set(lineIndex, findActiveWord(currentTime, line))
    }
  })
  
  // Determine fade state for each lyric line based on playback progress
  const getLineFadeState = useCallback((lineIndex: number): 'past' | 'current' | 'near-future' | 'far-future' => {
    if (!track?.lyrics || !track.lyrics.synced) {
      return 'far-future'
    }
    
    const lines = track.lyrics.lines
    const currentLine = lines[lineIndex]
    
    // Check if this line is currently active
    if (activeLineIndices.includes(lineIndex)) {
      return 'current'
    }
    
    // Past lines: already played (startTime < currentTime and not active)
    if (currentLine.startTime < currentTime) {
      return 'past'
    }
    
    // Future lines: calculate how soon this line will start
    const timeToStart = currentLine.startTime - currentTime
    const threshold = 5.0 // seconds
    
    if (timeToStart <= threshold) {
      return 'near-future'
    }
    
    return 'far-future'
  }, [track?.lyrics, activeLineIndices, currentTime])
  
  // Calculate opacity based on fade state
  const getLineOpacity = useCallback((state: 'past' | 'current' | 'near-future' | 'far-future'): string => {
    switch (state) {
      case 'past':
        return 'opacity-40'
      case 'current':
        return 'opacity-100'
      case 'near-future':
        return 'opacity-70'
      case 'far-future':
        return 'opacity-50'
      default:
        return 'opacity-50'
    }
  }, [])
  
  // Refs for lyrics auto-scroll
  const lyricsContainerRef = useRef<HTMLDivElement>(null)
  const activeLineRefs = useRef<(HTMLDivElement | null)[]>([])
  
  // State for dynamic accent color from cover
  const [accentColor, setAccentColor] = useState<string | null>(null)
  const lastProcessedTrackId = useRef<string | null>(null)
  
  // Lyrics display controls state
  const [showTranslation, setShowTranslation] = useState(true)
  const [showRomanization, setShowRomanization] = useState(true)
  const [fontSizeIndex, setFontSizeIndex] = useState(1) // 0=S, 1=M, 2=L, 3=XL
  
  // Check if current track has translation or romanization
  const hasTranslation = track?.lyrics?.lines.some(line => line.translation) ?? false
  const hasRomanization = track?.lyrics?.lines.some(line => line.romanization) ?? false
  
  // Font size mapping (rem values)
  const fontSizeMap = [0.875, 1, 1.125, 1.25, 1.5, 1.75] as const
  const currentFontSize = fontSizeMap[fontSizeIndex]
  
  // Extract dominant color from cover when track changes
  const extractColor = useCallback(async (track: Track | null) => {
    if (!track?.cover || track.id === lastProcessedTrackId.current) {
      return
    }
    
    lastProcessedTrackId.current = track.id
    
    const hexColor = await extractDominantColor(track.cover)
    if (hexColor) {
      const adjusted = adjustColorForContrast(hexColor, isDarkMode())
      setAccentColor(adjusted)
    } else {
      setAccentColor(null)
    }
  }, [])
  
  useEffect(() => {
    extractColor(track)
  }, [track, extractColor])
  
  // Listen for theme changes
  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    const handleChange = () => {
      if (track?.cover) {
        extractColor(track)
      }
    }
    
    mediaQuery.addEventListener('change', handleChange)
    return () => mediaQuery.removeEventListener('change', handleChange)
  }, [track, extractColor])
  
  // Auto-scroll active lyric line to center of viewport
  useEffect(() => {
    if (activeLineIndices.length === 0 || !lyricsContainerRef.current) return
    
    // Use the first active line as the scroll target
    const firstActiveIndex = activeLineIndices[0]
    const element = activeLineRefs.current[firstActiveIndex]
    const container = lyricsContainerRef.current
    
    if (element && container) {
      // Calculate how many lines can fit in the visible area
      const containerHeight = container.clientHeight
      const lineHeight = element.offsetHeight || 32 // approximate line height
      
     
      const targetTop = element.offsetTop - containerHeight / 2 + lineHeight / 2
      const maxScrollTop = container.scrollHeight - container.clientHeight
      container.scrollTo({
        top: Math.max(0, Math.min(targetTop, maxScrollTop)),
        behavior: 'smooth',
      })
    }
  }, [activeLineIndices, track?.lyrics?.lines.length])

  return (
    <Drawer open={isOpen} onOpenChange={(open: boolean) => !open && onClose()}>
      <DrawerContent className="mx-auto h-[100dvh] w-full rounded-none border-none bg-background p-0 shadow-2xl sm:h-[92vh] sm:w-[96vw] sm:max-w-7xl sm:rounded-2xl overflow-hidden flex flex-col">
        <DrawerTitle className="sr-only">Now Playing</DrawerTitle>
        <div className="flex items-center justify-between border-b border-border/60 px-4 py-3 sm:px-6">
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground">
            <Disc3 size={15} className="text-primary" />
            Now Playing
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close now playing"
            className="rounded-full p-2 text-muted-foreground transition hover:bg-accent hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <X size={18} />
          </button>
        </div>
        {/* Main content - two columns: left (artwork + info), right (lyrics) */}
        <div className="flex-1 min-h-0 overflow-y-auto lg:overflow-hidden">
          <div className="grid min-h-full grid-cols-1 gap-8 px-4 py-5 sm:px-8 sm:py-7 lg:grid-cols-[minmax(280px,380px)_minmax(0,1fr)] lg:gap-12 lg:px-12">
            {/* Left column: Artwork + Track Info + Technical Info (2/5 width) */}
            <div className="flex flex-col gap-5 lg:min-h-0 lg:overflow-hidden">
              {/* Artwork */}
              <div className="relative mx-auto aspect-square w-full max-w-[min(78vw,380px)] shrink-0 overflow-hidden rounded-xl bg-muted shadow-[0_24px_80px_hsl(28_30%_3%_/_0.35)] lg:mx-0 lg:max-w-none">
                {track?.cover ? (
                  <img
                    src={track.cover}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <Play size={64} className="text-muted-foreground/30" />
                  </div>
                )}
                {/* Quality badge on cover */}
                {track && (
                  <AudioQualityBadge
                    badge={getAudioQualityBadge(track)}
                    className="absolute bottom-2 right-2 shadow-md"
                  />
                )}
              </div>

              {/* Track Information */}
              <div className="space-y-3 text-center lg:flex-1 lg:overflow-hidden lg:text-left">
                {parsedTitle?.movement ? (
                  <>
                    {/* Classical music layout: Work first, then emphasized Movement */}
                    <div className="flex flex-col gap-1 lg:flex-row lg:items-baseline lg:gap-2">
                      <p className="text-lg text-muted-foreground truncate hover:text-foreground transition-colors group cursor-pointer">
                        <span className="inline-block whitespace-nowrap group-hover:animate-marquee">
                          {parsedTitle.work}
                        </span>
                      </p>
                      <p className="text-lg font-semibold truncate hover:text-foreground transition-colors group cursor-pointer">
                        <span className="inline-block whitespace-nowrap group-hover:animate-marquee">
                          {parsedTitle.movement}
                        </span>
                      </p>
                    </div>
                  </>
                ) : null}

                {/* Two-column grid for Artist/Album */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-3 text-left">
                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Artist</p>
                    <div className="text-sm">
                      {onArtistClick && track?.artist ? (
                        parseArtists(track.artist).map((artist, idx) => (
                          <span key={idx}>
                            <button
                              onClick={() => onArtistClick(artist)}
                              className="hover:text-foreground transition-colors"
                            >
                              {artist}
                            </button>
                            {idx < parseArtists(track.artist).length - 1 && ', '}
                          </span>
                        ))
                      ) : (
                        track?.artist || 'Unknown Artist'
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-xs text-muted-foreground mb-1">Album</p>
                    <p className="text-sm truncate">{track?.album || 'Unknown Album'}</p>
                  </div>
                </div>

                {/* Audio Technical Information */}
                {(track?.bitDepth || track?.sampleRate || track?.bitrate) && (
                  <div className="pt-2 border-t border-border mt-3">
                    <div className="flex items-center justify-between text-sm tabular-nums">
                      <div className="flex items-center gap-2">
                        <AudioQualityBadge badge={getAudioQualityBadge(track)} />
                        {track.bitDepth && track.sampleRate && (
                          <span className="text-foreground">{track.bitDepth}B/{(track.sampleRate / 1000).toFixed(1)}kHz</span>
                        )}
                      </div>
                      {track.bitrate && (
                        <span className="text-foreground">{Math.round(track.bitrate / 1000)}kbps</span>
                      )}
                    </div>
                  </div>
                )}
              </div>

            </div>

            {/* Right column: Lyrics (3/5 width) */}
            <div className="flex min-h-[260px] flex-col overflow-hidden pb-2 lg:min-h-0 lg:pb-5">
              {/* Lyrics header with controls */}
              <div className="mb-3 flex shrink-0 items-center justify-between border-b border-border/60 pb-3">
                <div>
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-primary/80">Lyrics</p>
                  <p className="mt-1 text-xs text-muted-foreground">Follow the performance line by line</p>
                </div>
                <LyricsControls
                  showTranslation={showTranslation}
                  onShowTranslationChange={setShowTranslation}
                  showRomanization={showRomanization}
                  onShowRomanizationChange={setShowRomanization}
                  fontSize={fontSizeIndex}
                  onFontSizeChange={setFontSizeIndex}
                  hasTranslation={hasTranslation}
                  hasRomanization={hasRomanization}
                />
              </div>
              
              <div 
                ref={lyricsContainerRef}
                className="h-[min(46svh,420px)] min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-3 scrollbar-hide sm:pr-5 lg:h-auto"
                style={{ fontSize: `${currentFontSize}rem` }}
              >
                {track?.lyrics && track.lyrics.lines.length > 0 ? (
                  track.lyrics.lines.map((line, lineIndex) => {
                    const isActive = activeLineIndices.includes(lineIndex)
                    const hasWords = line.words && line.words.length > 0
                    const activeWordIndex = activeWordIndices.get(lineIndex) ?? -1
                    const fadeState = getLineFadeState(lineIndex)
                    const opacityClass = getLineOpacity(fadeState)
                    
                    return (
                      <div
                        key={lineIndex}
                        ref={(el) => {
                          activeLineRefs.current[lineIndex] = el
                        }}
                        className={`transition-all duration-300 ${opacityClass} ${
                          isActive 
                            ? 'font-medium' 
                            : 'text-muted-foreground hover:text-foreground/70'
                        }`}
                        style={isActive && accentColor ? { color: accentColor } : undefined}
                      >
                        {/* Original text */}
                        {hasWords && isActive ? (
                          // Word-level sync: highlight individual words
                          <p className="leading-relaxed">
                            {line.words!.map((word, wordIndex) => {
                              const isWordActive = wordIndex <= activeWordIndex
                              return (
                                <span
                                  key={wordIndex}
                                  className={`transition-colors duration-150 ${
                                    isWordActive 
                                      ? 'font-medium' 
                                      : 'text-muted-foreground'
                                  }`}
                                  style={isWordActive && accentColor ? { color: accentColor } : undefined}
                                >
                                  {word.text}
                                </span>
                              )
                            })}
                          </p>
                        ) : (
                          // Line-level sync or unsynced: show full line
                          <p className="leading-relaxed">
                            {line.text}
                          </p>
                        )}
                        
                        {/* Translation */}
                        {showTranslation && line.translation && (
                          <p className="leading-relaxed text-sm mt-1 opacity-80">
                            {line.translation}
                          </p>
                        )}
                        
                        {/* Romanization */}
                        {showRomanization && line.romanization && (
                          <p className="leading-relaxed text-sm mt-1 opacity-60 italic">
                            {line.romanization}
                          </p>
                        )}
                      </div>
                    )
                  })
                ) : (
                  <div className="flex items-center justify-center h-full">
                    <p className="text-muted-foreground italic">No lyrics available</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Bottom: Playback controls */}
        <div className="border-t border-border/70 bg-player/80 px-4 py-4 backdrop-blur-xl shrink-0 sm:px-8 sm:py-5">
          <div className="mx-auto flex max-w-3xl flex-col gap-3">
            {/* Controls - centered above progress bar */}
            <div className="flex items-center justify-center gap-5">
              {/* Transport controls */}
              <button
                onClick={onPrev}
                disabled={!canPrev}
                aria-label="Previous track"
                className="rounded-md p-2 text-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SkipBack size={20} fill="currentColor" />
              </button>
              <button
                onClick={onTogglePlay}
                disabled={!track}
                aria-label={isPlaying ? 'Pause' : 'Play'}
                className="rounded-full bg-primary p-3 text-primary-foreground shadow-[0_0_28px_hsl(38_88%_62%_/_0.2)] transition hover:brightness-105 disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                {isPlaying ? <Pause size={20} fill="currentColor" /> : <Play size={20} fill="currentColor" />}
              </button>
              <button
                onClick={onNext}
                disabled={!canNext}
                aria-label="Next track"
                className="rounded-md p-2 text-foreground transition hover:text-primary disabled:cursor-not-allowed disabled:opacity-30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <SkipForward size={20} fill="currentColor" />
              </button>
            </div>

            {/* Progress bar */}
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span className="w-12 text-right tabular-nums">{formatTime(currentTime)}</span>
              <input
                type="range"
                min={0}
                max={duration || 0}
                value={currentTime}
                onChange={e => onSeek(Number(e.target.value))}
                aria-label="Track progress"
                className="progress-bar flex-1 h-5"
                style={{ '--range-fill': `${duration > 0 ? (currentTime / duration) * 100 : 0}%` } as React.CSSProperties}
              />
              <span className="w-12 tabular-nums">{formatTime(duration)}</span>
            </div>
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  )
}
