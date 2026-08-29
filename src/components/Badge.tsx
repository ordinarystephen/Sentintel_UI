/**
 * Badge — the mockup's `.badge` atom. Pill outline, 11px, optional status dot.
 * Tone is status-only (§3.1 color discipline): green / amber / indigo / slate.
 */
import type { ReactNode } from 'react'

export type BadgeTone = 'neutral' | 'green' | 'amber' | 'indigo' | 'slate'

const TONE: Record<BadgeTone, string> = {
  neutral: 'border-rule-strong text-ink-soft bg-bg',
  green: 'border-success-line text-success bg-success-bg',
  amber: 'border-warn-line text-warn bg-warn-bg',
  indigo: 'border-indigo-line text-indigo bg-indigo-bg',
  slate: 'border-rule-strong text-muted bg-bg-subtle',
}

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: BadgeTone
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span
      className={`inline-flex items-center gap-[5px] rounded-full border px-[9px] py-px text-micro ${TONE[tone]}`}
    >
      {dot && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-success" />}
      {children}
    </span>
  )
}
