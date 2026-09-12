import { useEffect, useState } from 'react'

/**
 * Tailwind breakpoint classes tell CSS which layout to show; this tells React.
 * Needed where an element is not merely restyled but semantically different per
 * viewport — the sidebar is static content on desktop and a modal drawer below
 * `lg`, and only one of those can carry `aria-modal`.
 */
export function useMediaQuery(query: string): boolean {
  const [matches, setMatches] = useState(() => window.matchMedia(query).matches)

  useEffect(() => {
    const list = window.matchMedia(query)
    const sync = () => setMatches(list.matches)
    sync()
    list.addEventListener('change', sync)
    return () => list.removeEventListener('change', sync)
  }, [query])

  return matches
}
