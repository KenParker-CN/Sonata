import {useEffect, useState} from 'react'
import {BookOpen, ExternalLink} from 'lucide-react'
import {Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle,} from '@/components/ui/Dialog'

interface WikiSummary {
  extract?: string
  description?: string
  content_urls?: {
    desktop?: { page?: string }
  }
}

interface WikiShortIntroProps {
  name: string
  subject: 'artist' | 'composer'
}

export default function WikiShortIntro({ name, subject }: WikiShortIntroProps) {
  const [summary, setSummary] = useState<WikiSummary | null>(null)
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    setLoading(true)
    setSummary(null)

    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(name)}`, {
      signal: controller.signal,
      headers: { Accept: 'application/json' },
    })
      .then(response => response.ok ? response.json() as Promise<WikiSummary> : null)
      .then(value => {
        if (!controller.signal.aborted) {
          setSummary(value)
          setLoading(false)
        }
      })
      .catch(() => {
        if (!controller.signal.aborted) {
          setSummary(null)
          setLoading(false)
        }
      })

    return () => controller.abort()
  }, [name])

  const extract = summary?.extract?.trim()
  const page = summary?.content_urls?.desktop?.page

  return (
    <>
        <section
            className="h-36 cursor-pointer overflow-hidden rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm transition-colors hover:bg-accent/30 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            role="button"
            tabIndex={0}
        aria-label={`Open full introduction for ${name}`}
        onClick={() => setDialogOpen(true)}
            onKeyDown={event => {
                if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault()
                    setDialogOpen(true)
                }
            }}
      >
        <div className="flex items-center gap-2 text-sm font-semibold tracking-tight">
          <BookOpen size={16} className="text-primary" aria-hidden="true" />
          <span>About this {subject}</span>
        </div>
        {loading ? (
          <div className="mt-4 space-y-2" aria-label="Loading introduction">
            <div className="h-3 w-5/6 animate-pulse rounded bg-muted" />
            <div className="h-3 w-full animate-pulse rounded bg-muted" />
            <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
          </div>
        ) : extract ? (
          <>
            {summary?.description && (
              <p className="mt-3 truncate text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {summary.description}
              </p>
            )}
            <p
              className="mt-3 overflow-hidden text-sm leading-6 text-muted-foreground"
              style={{display: '-webkit-box', WebkitBoxOrient: 'vertical', WebkitLineClamp: 3}}
            >
              {extract}
            </p>
          </>
        ) : (
          <p className="mt-3 text-sm leading-6 text-muted-foreground">
            No short introduction is available for this {subject}.
          </p>
        )}
        </section>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{name}</DialogTitle>
            {summary?.description && <DialogDescription>{summary.description}</DialogDescription>}
          </DialogHeader>
          <div className="mt-5 max-h-[60vh] overflow-y-auto text-sm leading-7 text-muted-foreground">
            {extract || `No short introduction is available for this ${subject}.`}
          </div>
          {page && (
            <a
              href={page}
              target="_blank"
              rel="noreferrer"
              className="mt-5 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Read more on Wikipedia
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
