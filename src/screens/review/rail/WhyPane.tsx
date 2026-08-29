/** Why — "How this got here" (resolution chain) + "Applied policies & standards" (build-spec §5.3). */
import { Link } from 'react-router-dom'
import { usePolicies } from '@/api/hooks'
import type { WorkItem } from '@/api/types'
import { cx } from '@/lib/cx'
import { strings } from '@/strings'
import { PaneHeading } from './PaneHeading'

export function WhyPane({ reviewId, item }: { reviewId: string; item: WorkItem }) {
  const s = strings.rail
  const policies = usePolicies(reviewId)
  const applied = (policies.data ?? []).filter((p) => p.itemIds.includes(item.id))
  return (
    <div>
      <PaneHeading first>{s.howHeading}</PaneHeading>
      <ol>
        {item.resolution.map((step, i) => (
          <li key={i} className="flex gap-[9px] py-[5px] text-[12px] leading-[1.5] text-ink-soft">
            <span
              aria-hidden="true"
              className={cx(
                'mt-1.5 h-1.5 w-1.5 flex-none rounded-full',
                step.warn ? 'bg-warn' : 'bg-rule-strong',
              )}
            />
            <span>{step.text}</span>
          </li>
        ))}
      </ol>
      <PaneHeading>{s.policiesHeading}</PaneHeading>
      {applied.length === 0 && policies.isSuccess && (
        <p className="text-dense text-faint">{s.noPolicies}</p>
      )}
      {applied.map((p) => (
        <div key={p.id} className="mb-2 rounded-lg border border-rule bg-bg px-[11px] py-[9px]">
          <div className="font-mono text-[10.5px] text-indigo">{p.id}</div>
          <p className="mt-0.5 text-dense leading-[1.5] text-ink-soft">{p.text}</p>
          <Link
            to="/policy"
            className="mt-1 inline-block text-micro text-ink underline underline-offset-2"
          >
            {p.kind === 'standard' ? s.viewStandard : s.viewPolicy}
          </Link>
        </div>
      ))}
      <p className="mt-[10px] text-micro leading-[1.55] text-faint">{s.whyNote}</p>
    </div>
  )
}
