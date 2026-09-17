import { parseArtists } from '@/utils/parseArtists'
import { trackComposers } from '@/utils/groupComposers'
import { formatTime, formatDurationLong } from '@/utils/formatTime'
import { useMemo } from 'react'
import { useParams, Link } from 'react-router-dom'
import { albumPath, artistPath, composerPath } from '@/utils/routes'
import { Music, Disc3, UserRound, PenLine, Calendar, Clock, FileAudio } from 'lucide-react'
import BackLink from '@/components/navigation/BackLink'
import NotFoundState from '@/components/feedback/NotFoundState'
import { useApp } from '@/contexts/app'
import * as React from "react";

function formatSampleRate(sampleRate: number): string {
  if (sampleRate >= 1000) {
    return `${(sampleRate / 1000).toFixed(1)} kHz`
  }
  return `${sampleRate} Hz`
}

function formatBitrate(bitrate: number): string {
  if (bitrate >= 1000) {
    return `${Math.round(bitrate / 1000)} kbps`
  }
  return `${bitrate} bps`
}

export default function TrackDetailPage() {
  const { trackId } = useParams<{ trackId: string }>()
  const { tracks } = useApp()

  const track = useMemo(() => {
    if (!trackId) return null
    const decodedId = decodeURIComponent(trackId)
    return tracks.find(t => t.id === decodedId) ?? null
  }, [trackId, tracks])

  const performers = useMemo(() => {
    if (!track) return []
    return parseArtists(track.artist)
  }, [track])

  const albumArtists = useMemo(() => {
    if (!track) return []
    return parseArtists(track.albumArtist)
  }, [track])

  const composers = useMemo(() => {
    if (!track) return []
    return trackComposers(track)
  }, [track])

  if (!track) {
    return (
      <NotFoundState
        title="Track not found"
        icon={Music}
        to="/library"
        backLabel="Back to library"
      />
    )
  }

  return (
    <div className="page-gutter pt-6 pb-8 flex flex-col">
      <BackLink to="/library" label="Back to library" />

      {/* Header */}
      <div className="order-1 flex flex-col sm:flex-row gap-6 mb-8">
        <div className="w-40 h-40 sm:w-56 sm:h-56 shrink-0 rounded-lg overflow-hidden bg-muted mx-auto sm:mx-0">
          {track.cover ? (
            <img src={track.cover} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-muted">
              <Music size={48} className="text-muted-foreground/30" />
            </div>
          )}
        </div>

        <div className="flex flex-col justify-center text-center sm:text-left">
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight mb-2">
            {track.title}
          </h1>

          <Link
              to={albumPath(track.album, track.albumArtist)}
              className="text-muted-foreground hover:text-foreground transition-colors mb-4"
          >
            {track.album}
          </Link>
        </div>
      </div>

      {/* Basic Info */}
      <section className="order-3 mb-8">
        <h2 className="text-lg font-semibold mb-4">Basic Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem
            icon={UserRound}
            label="Artist"
            value={performers.length > 0 ? (
              <span className="flex flex-wrap gap-2">
                {performers.map(performer => (
                  <Link
                    key={performer}
                    to={artistPath(performer)}
                    className="text-primary hover:underline"
                  >
                    {performer}
                  </Link>
                ))}
              </span>
            ) : 'Unknown'}
          />
          <InfoItem
            icon={Disc3}
            label="Album Artist"
            value={albumArtists.length > 0 ? (
              <span className="flex flex-wrap gap-2">
                {albumArtists.map(albumArtist => (
                  <Link
                    key={albumArtist}
                    to={artistPath(albumArtist)}
                    className="text-primary hover:underline"
                  >
                    {albumArtist}
                  </Link>
                ))}
              </span>
            ) : 'Unknown'}
          />
          <InfoItem
            icon={Disc3}
            label="Album"
            value={
              <Link
                to={albumPath(track.album, track.albumArtist)}
                className="text-primary hover:underline"
              >
                {track.album}
              </Link>
            }
          />
          <InfoItem
            icon={Clock}
            label="Duration"
            value={formatDurationLong(track.duration)}
          />
          <InfoItem
            icon={Calendar}
            label="Release Date"
            value={track.releaseDate ?? 'Unknown'}
          />
          <InfoItem
            icon={Music}
            label="Track Number"
            value={track.trackNumber != null ? String(track.trackNumber) : 'Unknown'}
          />
          <InfoItem
            icon={Disc3}
            label="Disc Number"
            value={track.discNumber != null ? String(track.discNumber) : 'Unknown'}
          />
        </div>
      </section>

      {/* Technical Info */}
      <section className="order-4 mb-8">
        <h2 className="text-lg font-semibold mb-4">Technical Info</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <InfoItem
            icon={FileAudio}
            label="Codec"
            value={track.codec ?? 'Unknown'}
          />
          <InfoItem
            icon={Music}
            label="Bit Depth"
            value={track.bitDepth != null ? `${track.bitDepth}-bit` : 'Unknown'}
          />
          <InfoItem
            icon={Music}
            label="Sample Rate"
            value={track.sampleRate != null ? formatSampleRate(track.sampleRate) : 'Unknown'}
          />
          <InfoItem
            icon={Music}
            label="Bitrate"
            value={track.bitrate != null ? formatBitrate(track.bitrate) : 'Unknown'}
          />
          <InfoItem
            icon={Music}
            label="Lossless"
            value={track.lossless != null ? (track.lossless ? 'Yes' : 'No') : 'Unknown'}
          />
        </div>
      </section>

      {/* Performers & Composers */}
      {(performers.length > 0 || composers.length > 0) && (
        <section className="order-2 mb-8">
          <h2 className="text-lg font-semibold mb-4">Credits</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            {performers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <UserRound size={14} />
                  Performers
                </h3>
                <ul className="space-y-1">
                  {performers.map(performer => (
                    <li key={performer}>
                      <Link
                        to={artistPath(performer)}
                        className="text-sm text-primary hover:underline"
                      >
                        {performer}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
            {composers.length > 0 && (
              <div>
                <h3 className="text-sm font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
                  <PenLine size={14} />
                  Composers
                </h3>
                <ul className="space-y-1">
                  {composers.map(composer => (
                    <li key={composer}>
                      <Link
                        to={composerPath(composer)}
                        className="text-sm text-primary hover:underline"
                      >
                        {composer}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Metadata Table */}
      <section className="order-5">
        <h2 className="text-lg font-semibold mb-4">Metadata</h2>
        <div className="border border-border rounded-lg overflow-hidden">
          <table className="w-full text-sm">
            <tbody>
              <MetadataRow label="Title" value={track.title} />
              <MetadataRow label="Artist" value={track.artist} />
              <MetadataRow label="Album" value={track.album} />
              <MetadataRow label="Album Artist" value={track.albumArtist || 'Unknown'} />
              <MetadataRow label="Composer" value={track.composer ?? 'Unknown'} />
              <MetadataRow label="Track Number" value={track.trackNumber != null ? String(track.trackNumber) : 'Unknown'} />
              <MetadataRow label="Disc Number" value={track.discNumber != null ? String(track.discNumber) : 'Unknown'} />
              <MetadataRow label="Duration" value={formatTime(track.duration)} />
              <MetadataRow label="Release Date" value={track.releaseDate ?? 'Unknown'} />
              <MetadataRow label="Copyright" value={track.copyright ?? 'Unknown'} />
              <MetadataRow label="Codec" value={track.codec ?? 'Unknown'} />
              <MetadataRow label="Bit Depth" value={track.bitDepth != null ? `${track.bitDepth}-bit` : 'Unknown'} />
              <MetadataRow label="Sample Rate" value={track.sampleRate != null ? formatSampleRate(track.sampleRate) : 'Unknown'} />
              <MetadataRow label="Bitrate" value={track.bitrate != null ? formatBitrate(track.bitrate) : 'Unknown'} />
              <MetadataRow label="Lossless" value={track.lossless != null ? (track.lossless ? 'Yes' : 'No') : 'Unknown'} />
              <MetadataRow label="File Path" value={track.filePath} />
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}

function InfoItem({ icon: Icon, label, value }: { icon: React.ComponentType<{ size?: number; className?: string }>; label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-lg bg-muted/50">
      <Icon size={18} className="text-muted-foreground shrink-0 mt-0.5" />
      <div className="min-w-0 flex-1">
        <p className="text-xs text-muted-foreground mb-0.5">{label}</p>
        <div className="text-sm">{value}</div>
      </div>
    </div>
  )
}

function MetadataRow({ label, value }: { label: string; value: string }) {
  return (
    <tr className="border-border last:border-b-0">
      <td className="px-4 py-2 text-muted-foreground font-medium w-1/3 sm:w-1/4">{label}</td>
      <td className="px-4 py-2 break-all">{value}</td>
    </tr>
  )
}
