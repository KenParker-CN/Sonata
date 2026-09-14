import type { ReactNode } from 'react'

interface LetterSectionProps {
  /** The bucket letter, '#' included — it becomes the section's anchor id. */
  letter: string
  /** The rows under this letter. */
  children: ReactNode
}

/**
 * One A-Z directory section: the letter heading and the rows under it,
 * anchor-targeted by the alphabet index above the list.
 */
export default function LetterSection({ letter, children }: LetterSectionProps) {
  return (
    <section id={`letter-${letter === '#' ? '%23' : letter}`} className="scroll-mt-16">
      <h2 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-2 mt-6 first:mt-2">
        {letter}
      </h2>
      {children}
    </section>
  )
}
