import { ALPHABET } from '@/utils/alphabet'

interface AlphabetIndexProps {
  /** Letters that carry at least one row; the rest render inert. */
  available: ReadonlySet<string>
}

/**
 * The sticky A-Z anchor bar above an alphabetized directory. Letters with
 * content jump to their section; empty ones render as quiet placeholders so
 * the bar's shape doesn't jump between pages.
 */
export default function AlphabetIndex({ available }: AlphabetIndexProps) {
  return (
    <nav
      aria-label="Alphabetical index"
      className="sticky top-0 z-10 -mx-[var(--page-gutter)] px-[var(--page-gutter)] py-2 mb-2 bg-background/95 backdrop-blur border-b border-border/70"
    >
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
        {ALPHABET.map(letter => {
          const isAvailable = available.has(letter)
          return isAvailable ? (
            <a
              key={letter}
              href={`#letter-${letter}`}
              className="rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-accent transition-colors"
            >
              {letter}
            </a>
          ) : (
            <span
              key={letter}
              aria-hidden="true"
              className="rounded px-1.5 py-0.5 text-muted-foreground/40 select-none"
            >
              {letter}
            </span>
          )
        })}
        {available.has('#') && (
          <a
            href="#letter-%23"
            className="rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-accent transition-colors"
          >
            #
          </a>
        )}
      </div>
    </nav>
  )
}
