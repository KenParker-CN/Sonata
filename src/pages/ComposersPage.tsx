import type { Composer } from '@/utils/groupComposers'
import type { SortOption } from '@/hooks/useSort'
import { applySort, useSort } from '@/hooks/useSort'
import { compareNames } from '@/utils/collate'
import { groupComposers } from '@/utils/groupComposers'
import { useMemo } from 'react'
import { cn } from '@/lib/utils'
import { useViewMode } from '@/hooks/useViewMode'
import ComposerCard from '@/components/ComposerCard'
import ComposerListRow from '@/components/ComposerListRow'
import CardGrid from '@/components/CardGrid'
import EmptyState from '@/components/EmptyState'
import PageHeader from '@/components/PageHeader'
import SearchInput from '@/components/SearchInput'
import SearchEmptyState from '@/components/SearchEmptyState'
import SortSelect from '@/components/SortSelect'
import ViewModeToggle from '@/components/ViewModeToggle'
import { matchesSearch } from '@/utils/search'
import { useSearch } from '@/hooks/useSearch'
import { useApp } from '@/contexts/app'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')

type ComposerKey = 'name' | 'tracks' | 'albums' | 'duration'

const COMPOSER_SORT_OPTIONS: SortOption<ComposerKey>[] = [
  { value: 'name', label: 'Name', natural: 'asc' },
  { value: 'tracks', label: 'Tracks', natural: 'desc' },
  { value: 'albums', label: 'Albums', natural: 'desc' },
  { value: 'duration', label: 'Duration', natural: 'desc' },
]

const COMPOSER_COMPARATORS: Record<ComposerKey, (a: Composer, b: Composer) => number> = {
  name: (a, b) => compareNames(a.name, b.name),
  tracks: (a, b) => a.trackCount - b.trackCount,
  albums: (a, b) => a.albumCount - b.albumCount,
  duration: (a, b) => a.duration - b.duration,
}

const NAME_OF = (composer: Composer) => composer.name

// First letter bucket for A-Z indexing; anything else falls into '#'
function getInitial(name: string): string {
  const ch = name.trim().charAt(0).toUpperCase()
  return ch >= 'A' && ch <= 'Z' ? ch : '#'
}

export default function ComposersPage() {
  const { tracks } = useApp()
  const sort = useSort('composers', COMPOSER_SORT_OPTIONS, 'name')
  const [view, setView] = useViewMode('composers', 'list')
  const composers = useMemo(
    () => applySort(groupComposers(tracks), sort, COMPOSER_COMPARATORS, NAME_OF),
    [tracks, sort],
  )
  // An A-Z index only describes the list while it is alphabetical in practice;
  // any other key drops the sections and shows one ranked list instead.
  const alphabetized = sort.key === 'name'

  // Filtering happens after the sort, so a query keeps the order on screen.
  const search = useSearch()
  const visible = useMemo(
    () =>
      search.terms.length === 0
        ? composers
        : composers.filter(composer => matchesSearch(search.terms, composer.name)),
    [composers, search.terms],
  )

  // Group composers by initial letter for the A-Z sections
  const groups = useMemo(() => {
    const map = new Map<string, Composer[]>()
    for (const composer of visible) {
      const letter = getInitial(composer.name)
      if (!map.has(letter)) map.set(letter, [])
      map.get(letter)!.push(composer)
    }
    return map
  }, [visible])

  // Letter order: A-Z sections, reversed for a Z-A sort, then '#' last either way
  const sectionLetters = useMemo(() => {
    const letters = ALPHABET.filter(letter => groups.has(letter))
    if (sort.direction === 'desc') letters.reverse()
    if (groups.has('#')) letters.push('#')
    return letters
  }, [groups, sort.direction])

  const availableLetterSet = useMemo(
    () => new Set(sectionLetters),
    [sectionLetters],
  )

  // A plain function rather than a nested component: wrapping the rows in a new
  // component type each render would remount them.
  const renderCollection = (rows: Composer[]) =>
    view === 'grid' ? (
      <CardGrid>
        {rows.map(composer => (
          <ComposerCard key={composer.name} composer={composer} />
        ))}
      </CardGrid>
    ) : (
      <div className="flex flex-col">
        {rows.map(composer => (
          <ComposerListRow key={composer.name} composer={composer} />
        ))}
      </div>
    )

  return (
    <>
      <PageHeader title="Composers" />

      {/* Content */}
      <div className="page-gutter pb-8">
        {tracks.length === 0 ? (
          <EmptyState
            title="No composers in your library yet."
            hint="Click “Add Music” to import your library"
          />
        ) : composers.length === 0 ? (
          <EmptyState
            title="No tagged composers found."
            hint="Classical works appear here when tracks carry a composer tag"
          />
        ) : (
          <>
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-border/70 pb-3">
              <h2 className="text-sm font-semibold tracking-tight text-foreground">
                All Composers
              </h2>
              <div className="flex flex-1 flex-wrap items-center justify-end gap-2 sm:gap-3">
                <p className="text-xs text-muted-foreground">{visible.length} {visible.length === 1 ? 'composer' : 'composers'}</p>
                <SortSelect label="Sort composers by" sort={sort} />
                <ViewModeToggle label="Composers view" value={view} onChange={setView} />
                <SearchInput label="Search composers" value={search.query} onChange={search.setQuery} />
              </div>
            </div>

            {visible.length === 0 ? (
              <SearchEmptyState query={search.query} onClear={() => search.setQuery('')} />
            ) : (
              <>
                {/* Sticky A-Z index */}
                {alphabetized && (
                  <nav
                    aria-label="Alphabetical index"
                    className="sticky top-0 z-10 -mx-[var(--page-gutter)] px-[var(--page-gutter)] py-2 mb-2 bg-background/95 backdrop-blur border-b border-border/70"
                  >
                    <div className="flex flex-wrap items-center gap-x-1.5 gap-y-1 text-xs">
                      {ALPHABET.map(letter => {
                        const available = availableLetterSet.has(letter)
                        return available ? (
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
                      {availableLetterSet.has('#') && (
                        <a
                          href="#letter-%23"
                          className="rounded px-1.5 py-0.5 font-medium text-foreground hover:bg-accent transition-colors"
                        >
                          #
                        </a>
                      )}
                    </div>
                  </nav>
                )}

                {alphabetized ? (
                  <div>
                    {sectionLetters.map(letter => (
                      <section
                        key={letter}
                        id={`letter-${letter === '#' ? '%23' : letter}`}
                        className="scroll-mt-16"
                      >
                        <h2
                          className={cn(
                            'text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-6',
                            'first:mt-2',
                          )}
                        >
                          {letter}
                        </h2>
                        {renderCollection(groups.get(letter) ?? [])}
                      </section>
                    ))}
                  </div>
                ) : (
                  renderCollection(visible)
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}
