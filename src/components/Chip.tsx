/** Small square chip — warn tone for `review required` / `1 review req.`. */
import { cx } from '@/lib/cx'

export function Chip({
  tone = 'warn',
  children,
  className,
}: {
  tone?: 'warn' | 'neutral'
  children: string
  className?: string
}) {
  return (
    <span
      className={cx(
        'rounded border px-[7px] text-[0.625rem]',
        tone === 'warn'
          ? 'border-warn-line bg-warn-bg text-warn'
          : 'border-rule-strong bg-bg-subtle text-muted',
        className,
      )}
    >
      {children}
    </span>
  )
}
