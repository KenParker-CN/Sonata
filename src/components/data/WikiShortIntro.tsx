import { useEffect, useState } from 'react'
import { ExternalLink, BookOpen } from 'lucide-react'

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
    <section className="rounded-2xl border border-border/70 bg-card/60 p-5 shadow-sm">
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
            <p className="mt-3 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {summary.description}
            </p>
          )}
          <p className="mt-3 text-sm leading-6 text-muted-foreground">{extract}</p>
          {page && (
            <a
              href={page}
              target="_blank"
              rel="noreferrer"
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-medium text-primary hover:underline"
            >
              Read more on Wikipedia
              <ExternalLink size={13} aria-hidden="true" />
            </a>
          )}
        </>
      ) : (
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          No short introduction is available for this {subject}.
        </p>
      )}
    </section>
  )
}
