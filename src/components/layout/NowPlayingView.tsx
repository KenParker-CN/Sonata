import type { CSSProperties, ReactNode } from 'react'
import { useEffect, useRef, useState } from 'react'
import type { Track } from '@/types/music'
import { motion } from 'motion/react'
import {
  ChevronLeft,
  ChevronRight,
} from 'lucide-react'
import { Link } from 'react-router-dom'
import { cn } from '@/lib/utils'
import { parseArtists } from '@/utils/parseArtists'
import { artistPath, trackPath } from '@/utils/routes'
import GeneratedArt from '@/components/media/GeneratedArt'
import AudioQualityBadge from '@/components/media/AudioQualityBadge'
import { getAudioQualityBadge } from '@/utils/getAudioQualityBadge'
import { activeLyricIndex, activeWordIndex, parseLyrics } from '@/utils/lyrics'

interface NowPlayingViewProps {
  track: Track | null
  currentTime: number
}

type MobilePanel = 'details' | 'now-playing' | 'lyrics'

function ArtworkDisplay({ track, className }: { track: Track | null; className?: string }) {
  return (
    <motion.div
      layoutId={`now-playing-art-${track?.id ?? 'empty'}`}
      className={cn('artwork-surface relative aspect-square rounded-[1.5rem] bg-player-border shadow-2xl', className)}
    >
      <GeneratedArt
        name={track?.title ?? 'Now Playing'}
        src={track?.cover ?? null}
        className="h-full w-full"
      />
    </motion.div>
  )
}

function TrackInfo({ track }: { track: Track | null }) {
  const artists = track?.artist ? parseArtists(track.artist) : []

  return (
    <div>
      <div className="mb-3 flex items-center justify-center gap-2 lg:justify-start">
        <span className="section-kicker text-player-accent">Listening now</span>
        {track && <AudioQualityBadge badge={getAudioQualityBadge(track)} onDark />}
      </div>
      <h1 className="text-3xl font-semibold tracking-[-0.035em] sm:text-5xl lg:text-6xl">
        {track ? (
          <Link to={trackPath(track.id)} className="transition hover:text-player-accent">
            {track.title}
          </Link>
        ) : 'No track selected'}
      </h1>
      <div className="mt-3 flex flex-wrap items-center justify-center gap-x-2 gap-y-1 text-base text-player-muted lg:justify-start">
        {artists.length > 0 ? artists.map((artist, index) => (
          <span key={artist}>
            <Link to={artistPath(artist)} className="hover:text-player-foreground hover:underline">
              {artist}
            </Link>
            {index < artists.length - 1 && ', '}
          </span>
        )) : <span>Add music to start listening</span>}
        {track?.album && <><span aria-hidden="true">·</span><span>{track.album}</span></>}
      </div>
    </div>
  )
}

function MetadataPanel({ track }: { track: Track | null }) {
  const fields = track ? [
    ['Composer', track.composer],
    ['Album artist', track.albumArtist],
    ['Format', track.codec?.toUpperCase()],
    ['Quality', track.lossless ? 'Lossless' : track.bitrate ? `${Math.round(track.bitrate / 1000)} kbps` : undefined],
    ['Sample rate', track.sampleRate ? `${track.sampleRate} Hz` : undefined],
    ['Release', track.releaseDate],
    ['Copyright', track.copyright],
  ].filter(([, value]) => value) : []

  return (
    <section className="music-surface-soft rounded-2xl p-5 text-left">
      <p className="section-kicker mb-4 text-player-accent">Library metadata</p>
      {fields.length > 0 ? (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
          {fields.map(([label, value]) => (
            <div key={label} className="min-w-0">
              <dt className="text-[11px] uppercase tracking-wider text-player-muted">{label}</dt>
              <dd className="mt-1 truncate text-sm text-player-foreground">{value}</dd>
            </div>
          ))}
        </dl>
      ) : (
        <div className="rounded-xl border border-dashed border-player-border px-4 py-6 text-sm leading-6 text-player-muted">
          Rich recording details will appear here when they are available in your local tags.
        </div>
      )}
    </section>
  )
}

function LyricsPanel({ track, currentTime }: { track: Track | null; currentTime: number }) {
  const lines = parseLyrics(track?.lyrics)
  const activeLine = activeLyricIndex(lines, currentTime)
  const activeLineRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    activeLineRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })
  }, [activeLine])

  if (lines.length === 0) {
    return (
      <section className="flex min-h-[280px] flex-1 flex-col justify-center rounded-2xl border border-dashed border-player-border px-6 py-10 text-center">
        <p className="text-lg font-medium text-player-foreground">Lyrics and text</p>
        <p className="mx-auto mt-2 max-w-xs text-sm leading-6 text-player-muted">
          Timestamped lyrics, libretti, and program notes will appear here when available in the recording metadata.
        </p>
      </section>
    )
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col rounded-2xl bg-player-border/30 p-5 text-left" aria-label="Lyrics">
      <div className="mb-4 flex items-center justify-between">
        <p className="section-kicker text-player-accent">Lyrics</p>
        <span className="text-xs text-player-muted">Synced to playback</span>
      </div>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto pr-2">
        {lines.map((line, index) => {
          const wordIndex = index === activeLine ? activeWordIndex(line.words, currentTime) : -1
          return (
            <div
              key={`${line.start}-${index}`}
              ref={index === activeLine ? activeLineRef : undefined}
              className={cn('text-base leading-7 transition-all duration-300', index === activeLine ? 'text-player-foreground' : 'text-player-muted/60')}
            >
              {line.words.map((word, wordPosition) => (
                <span key={`${word.start}-${wordPosition}`} className={cn(wordPosition <= wordIndex && 'text-player-accent')}>
                  {word.text}{wordPosition < line.words.length - 1 ? ' ' : ''}
                </span>
              ))}
            </div>
          )
        })}
      </div>
    </section>
  )
}

function MobilePager({ panel, setPanel, children }: { panel: MobilePanel; setPanel: (panel: MobilePanel) => void; children: Record<MobilePanel, ReactNode> }) {
  const panels: MobilePanel[] = ['details', 'now-playing', 'lyrics']
  const index = panels.indexOf(panel)

  const move = (direction: 1 | -1) => {
    const nextIndex = Math.min(panels.length - 1, Math.max(0, index + direction))
    setPanel(panels[nextIndex])
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col lg:hidden">
      <div className="mb-5 flex items-center justify-center gap-5 text-xs font-medium">
        {panels.map(item => (
          <button key={item} type="button" onClick={() => setPanel(item)} className={cn('capitalize transition', item === panel ? 'text-player-foreground' : 'text-player-muted')}>
            {item === 'now-playing' ? 'Now Playing' : item}
          </button>
        ))}
      </div>
      <motion.div
        key={panel}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragEnd={(_, info) => {
          if (info.offset.x < -50) move(1)
          if (info.offset.x > 50) move(-1)
        }}
        initial={{ opacity: 0, x: 18 }}
        animate={{ opacity: 1, x: 0 }}
        className="flex min-h-0 flex-1 flex-col justify-center"
      >
        {children[panel]}
      </motion.div>
      <div className="mt-6 flex items-center justify-center gap-2">
        {panels.map(item => (
          <button key={item} type="button" onClick={() => setPanel(item)} aria-label={`Show ${item}`} className={cn('h-1.5 rounded-full transition-all', item === panel ? 'w-6 bg-player-foreground' : 'w-1.5 bg-player-border')} />
        ))}
      </div>
      <div className="mt-4 flex justify-between">
        <button type="button" onClick={() => move(-1)} disabled={index === 0} className="flex items-center gap-1 text-xs text-player-muted disabled:opacity-30"><ChevronLeft size={15} /> Previous</button>
        <button type="button" onClick={() => move(1)} disabled={index === panels.length - 1} className="flex items-center gap-1 text-xs text-player-muted disabled:opacity-30">Next <ChevronRight size={15} /></button>
      </div>
    </div>
  )
}

export default function NowPlayingView({ track, currentTime }: NowPlayingViewProps) {
  const [mobilePanel, setMobilePanel] = useState<MobilePanel>('now-playing')
  const artworkStyle = track?.cover ? ({ backgroundImage: `url(${track.cover})` } as CSSProperties) : undefined
  const details = <MetadataPanel track={track} />
  const lyrics = <LyricsPanel track={track} currentTime={currentTime} />
  const nowPlaying = (
    <div className="flex flex-col items-center gap-7 lg:items-start">
      <ArtworkDisplay track={track} className="w-[min(72vw,380px)] sm:w-[min(58vw,440px)]" />
      <div className="w-full text-center lg:text-left">
        <TrackInfo track={track} />
      </div>
    </div>
  )

  return (
    <motion.section
      initial={{ opacity: 0, y: 24 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 24 }}
      transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      className="absolute inset-x-0 bottom-(--player-height) top-0 z-30 flex min-h-0 flex-col overflow-y-auto bg-player text-player-foreground"
      aria-label="Now Playing"
    >
      <div className="pointer-events-none absolute inset-0 opacity-30 blur-3xl" style={artworkStyle} aria-hidden="true" />
      <div className="relative mx-auto flex min-h-full w-full max-w-7xl flex-1 flex-col px-5 pb-8 pt-5 sm:px-10 lg:px-14">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <p className="section-kicker text-player-accent">Now Playing</p>
          </div>
        </header>

        <MobilePager
          panel={mobilePanel}
          setPanel={setMobilePanel}
          children={{ details, 'now-playing': nowPlaying, lyrics }}
        />

        <div className="relative hidden min-h-0 flex-1 items-center justify-center gap-10 py-8 lg:flex xl:gap-16">
          <div className="min-w-0 max-w-2xl flex-1">{nowPlaying}</div>
          <aside className="hidden max-h-[min(680px,75vh)] min-h-0 shrink-0 flex-col gap-4 overflow-hidden xl:flex xl:w-[340px]">
            <LyricsPanel track={track} currentTime={currentTime} />
            <MetadataPanel track={track} />
          </aside>
        </div>
      </div>
    </motion.section>
  )
}
