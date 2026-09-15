import type { Composer } from '@/utils/groupComposers'
import type { SortOption } from '@/hooks/useSort'
import { applySort, useSort } from '@/hooks/useSort'
import { compareNames } from '@/utils/collate'
import { groupComposers } from '@/utils/groupComposers'
import { useMemo } from 'react'
import { groupByInitial, sectionLetters } from '@/utils/alphabet'
import AlphabetIndex from '@/components/navigation/AlphabetIndex'
import ComposerListRow from '@/components/data/ComposerListRow'
import EmptyState from '@/components/feedback/EmptyState'
import LetterSection from '@/components/navigation/LetterSection'
import PageHeader from '@/components/layout/PageHeader'
import SearchInput from '@/components/navigation/SearchInput'
import SearchEmptyState from '@/components/feedback/SearchEmptyState'
import SortSelect from '@/components/navigation/SortSelect'
import { matchesSearch } from '@/utils/search'
import { useSearch } from '@/hooks/useSearch'
import { useApp } from '@/contexts/app'

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

export default function ComposersPage() {
  const { tracks } = useApp()
  const sort = useSort('composers', COMPOSER_SORT_OPTIONS, 'name')
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

  // A-Z sections over the visible rows: A-Z, reversed for Z-A, '#' last either way
  const groups = useMemo(() => groupByInitial(visible, NAME_OF), [visible])
  const letters = sectionLetters(groups, sort.direction === 'desc')
  const letterSet = new Set(letters)

  return (
    <>
      <PageHeader title="Composers" />

      {/* Content */}
      <div className="page-gutter pb-8">
        {tracks.length === 0 ? (
          <EmptyState
            title="No composers in your library yet."
            hint="Click “Add Music — to import your library"
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
                <SearchInput label="Search composers" value={search.query} onChange={search.setQuery} />
              </div>
            </div>

            {visible.length === 0 ? (
              <SearchEmptyState query={search.query} onClear={() => search.setQuery('')} />
            ) : (
              <>
                {alphabetized && <AlphabetIndex available={letterSet} />}

                {alphabetized ? (
                  <div>
                    {letters.map(letter => (
                      <LetterSection key={letter} letter={letter}>
                        <div className="flex flex-col">
                          {(groups.get(letter) ?? []).map(composer => (
                            <ComposerListRow key={composer.name} composer={composer} />
                          ))}
                        </div>
                      </LetterSection>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col">
                    {visible.map(composer => (
                      <ComposerListRow key={composer.name} composer={composer} />
                    ))}
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </>
  )
}

