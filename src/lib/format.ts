/**
 * Formatters. Every timestamp arrives as ISO-8601 from the API and is
 * rendered here — nowhere else parses dates.
 */

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']

const pad = (n: number) => String(n).padStart(2, '0')

/** `2026-08-28` in local time — the absolute mono timestamp on list rows. */
export function formatDate(iso: string): string {
  const d = new Date(iso)
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

/** `09:42` local, 24h. */
export function formatTime(iso: string): string {
  const d = new Date(iso)
  return `${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** `today` · `yesterday` · `Aug 21` · `Nov 3, 2025` — the relative date on recents. */
export function formatRelative(iso: string, now: Date = new Date()): string {
  const d = new Date(iso)
  const startOf = (x: Date) => new Date(x.getFullYear(), x.getMonth(), x.getDate()).getTime()
  const days = Math.round((startOf(now) - startOf(d)) / 86_400_000)
  if (days === 0) return 'today'
  if (days === 1) return 'yesterday'
  const md = `${MONTHS[d.getMonth()]} ${d.getDate()}`
  return d.getFullYear() === now.getFullYear() ? md : `${md}, ${d.getFullYear()}`
}

/** `conf 94%` — the mono confidence chip. */
export function formatConfidence(c: number): string {
  return `conf ${Math.round(c * 100)}%`
}

/** `0.78` — flag confidence inline on attention rows. */
export function formatFlagConfidence(c: number): string {
  return c.toFixed(2)
}

/** `2.4 MB` · `812 KB` */
export function formatBytes(n: number): string {
  if (n >= 1_048_576) return `${(n / 1_048_576).toFixed(1)} MB`
  if (n >= 1024) return `${Math.round(n / 1024)} KB`
  return `${n} B`
}

export function formatPages(n: number): string {
  return `${n} pp`
}

/** Moody's-style outlook shorthand used on the review sub line. */
export function shortOutlook(outlook: string): string {
  const map: Record<string, string> = {
    Negative: 'Neg',
    Positive: 'Pos',
    Stable: 'Stable',
    Developing: 'Dev',
  }
  return map[outlook] ?? outlook
}
