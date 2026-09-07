export function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
  return `${m}:${s.toString().padStart(2, '0')}`
}

export function formatDurationLong(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '00h 00m 00s'
  const pad = (n: number) => n.toString().padStart(2, '0')
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  return `${pad(h)}h ${pad(m)}m ${pad(s)}s`
}
