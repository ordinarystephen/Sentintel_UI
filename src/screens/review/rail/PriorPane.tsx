/** Prior — "Since the [date] review": deltas BETWEEN reviews (worsening in warn) + link to the prior review. */
import { Link } from 'react-router-dom'
import type { PriorComparison } from '@/api/types'
import { cx } from '@/lib/cx'
import { monthYear } from '@/lib/format'
import { strings } from '@/strings'
import { PaneHeading } from './PaneHeading'

export function PriorPane({ prior }: { prior: PriorComparison }) {
  const s = strings.rail
  const label = monthYear(prior.priorDate)
  return (
    <div>
      <PaneHeading first>{s.sinceHeading(label)}</PaneHeading>
      <dl>
        {prior.deltas.map((d, i) => (
          <div key={d.label} className={cx('py-2 text-[12px]', i > 0 && 'border-t border-rule')}>
            <dt className="text-micro text-muted">{d.label}</dt>
            <dd className="mt-px font-mono text-[12px] tabular-nums">
              {d.prior} →{' '}
              <span
                className={cx(
                  d.direction === 'worse' && 'text-warn',
                  d.direction === 'better' && 'text-success',
                )}
              >
                {d.current}
              </span>
            </dd>
          </div>
        ))}
      </dl>
      <Link
        to={`/review/${prior.priorReviewId}`}
        className="mt-[10px] inline-block text-[12px] text-ink underline underline-offset-2"
      >
        {s.openPrior(label)}
      </Link>
      <p className="mt-[10px] text-micro leading-[1.55] text-faint">{s.priorNote}</p>
    </div>
  )
}
