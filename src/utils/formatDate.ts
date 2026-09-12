const dateFormatter = new Intl.DateTimeFormat(undefined, {
  day: 'numeric',
  month: 'short',
  year: 'numeric',
})

/** Locale-aware calendar date, e.g. "12 Sept 2026". */
export function formatDate(timestamp: number): string {
  return dateFormatter.format(timestamp)
}
