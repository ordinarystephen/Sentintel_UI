/** Resolved-via badge (`Tier 1 · section`, `Tier 2 · vector`, `image value · OCR`, `static data`, amber `unresolved`). */
import type { Via } from '@/api/types'
import { cx } from '@/lib/cx'

export function ViaBadge({ via, label }: { via: Via; label: string }) {
  return (
    <span
      className={cx(
        'rounded border px-[7px] text-[10px]',
        via === 'unresolved'
          ? 'border-warn-line bg-warn-bg text-warn'
          : via === 'tier2' || via === 'ocr'
            ? 'border-indigo-line bg-indigo-bg text-indigo'
            : 'border-rule-strong bg-bg-subtle text-muted',
      )}
    >
      {label}
    </span>
  )
}
