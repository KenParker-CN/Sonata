import { useRef } from 'react'
import { Search, X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface SearchInputProps {
  /** Names the field for both the placeholder and the accessible name. */
  label: string
  value: string
  onChange: (value: string) => void
  className?: string
}

/**
 * Keyword filter for a page's collection. It joins the toolbar's other controls
 * and takes a row of its own on narrow screens, where the toolbar wraps.
 */
export default function SearchInput({ label, value, onChange, className }: SearchInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className={cn(
        'order-last flex w-full items-center gap-1.5 rounded-md border border-border bg-card',
        'px-2.5 py-1.5 text-xs transition focus-within:ring-2 focus-within:ring-ring',
        'sm:order-none sm:w-44',
        className,
      )}
    >
      <Search size={14} aria-hidden="true" className="shrink-0 text-muted-foreground" />
      <label className="sr-only">{label}</label>
      <input
        ref={inputRef}
        type="search"
        value={value}
        placeholder={label}
        onChange={event => onChange(event.target.value)}
        className="w-full min-w-0 bg-transparent text-foreground outline-none placeholder:text-muted-foreground [&::-webkit-search-cancel-button]:appearance-none"
      />
      {value && (
        <button
          type="button"
          aria-label={`Clear ${label}`}
          onClick={() => {
            onChange('')
            inputRef.current?.focus()
          }}
          className="touch-target shrink-0 rounded text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <X size={14} />
        </button>
      )}
    </div>
  )
}
