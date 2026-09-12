import { FolderLock, TriangleAlert } from 'lucide-react'

interface LibraryStatusBannerProps {
  rootNames: string[]
  tracksNeedingAccess: number
  persistenceUnavailable: boolean
  onReconnect: () => void
}

export default function LibraryStatusBanner({
  rootNames,
  tracksNeedingAccess,
  persistenceUnavailable,
  onReconnect,
}: LibraryStatusBannerProps) {
  if (persistenceUnavailable) {
    return (
      <div className="flex items-center gap-2 shrink-0 border-b border-border bg-muted/40 px-6 py-2 text-xs text-muted-foreground">
        <TriangleAlert size={14} className="shrink-0" aria-hidden="true" />
        <p>
          This browser can’t keep imported files between visits, so your library resets when the page reloads.
        </p>
      </div>
    )
  }

  if (rootNames.length === 0) return null

  const folders = rootNames.map(name => `“${name}”`).join(', ')
  return (
    <div className="flex items-center gap-3 shrink-0 border-b border-border bg-muted/40 px-6 py-2 text-xs text-muted-foreground">
      <FolderLock size={14} className="shrink-0" aria-hidden="true" />
      <p className="flex-1 min-w-0">
        {tracksNeedingAccess > 0
          ? `Reconnect ${folders} to bring back ${tracksNeedingAccess} cached ${tracksNeedingAccess === 1 ? 'track' : 'tracks'}.`
          : `Reconnect ${folders} to restore your library.`}
      </p>
      <button
        type="button"
        onClick={onReconnect}
        className="shrink-0 rounded-full border border-border px-3 py-1 font-medium text-foreground transition hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        Reconnect
      </button>
    </div>
  )
}
