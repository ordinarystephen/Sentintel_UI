/** Section status pill: `populated` (green) or `not yet populated` / `reasoning stubbed` (todo). */
import { cx } from '@/lib/cx'

export function Pill({ tone, children }: { tone: 'pop' | 'todo'; children: string }) {
  return (
    <span
      className={cx(
        'rounded-full border px-[9px] py-0.5 text-[10px] font-semibold tracking-[0.04em]',
        tone === 'pop'
          ? 'border-success-line bg-success-bg text-success'
          : 'border-rule-strong bg-bg text-muted',
      )}
    >
      {children}
    </span>
  )
}
