/**
 * Entity reference data — the upstream credit-system snapshot plus
 * CRR-internal designations, behind one quiet disclosure under the sub line
 * (collapsed by default; the facts must not compete with the story). Every
 * value carries an origin chip. When a review has no reference data, nothing
 * renders at all.
 */
import { useState } from 'react'
import type { Review } from '@/api/types'
import { ChevronIcon } from '@/app/icons'
import { Chip } from '@/components/Chip'
import { Collapsible } from '@/components/Collapsible'
import { cx } from '@/lib/cx'
import { fmt } from '@/lib/fmt'
import { strings } from '@/strings'

export function ReferenceDataBlock({ review }: { review: Review }) {
  const s = strings.review
  const [open, setOpen] = useState(false)
  const rd = review.referenceData
  if (!rd) return null
  return (
    <div className="-mt-1.5 mb-[22px]">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="refdata-body"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-[7px] text-dense text-muted"
      >
        <ChevronIcon
          className={cx(
            'h-[9px] w-[9px] flex-none text-faint transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
        {s.refData}
        <span className="font-mono text-micro text-faint">
          {fmt(s.refDataMeta, { date: rd.asOf })}
        </span>
      </button>
      <Collapsible open={open} id="refdata-body">
        <dl className="mt-[9px] grid grid-cols-3 gap-x-5 gap-y-3 rounded-[10px] border border-rule bg-bg-subtle px-[15px] py-[13px] max-[900px]:grid-cols-2">
          {rd.fields.map((f) => (
            <div key={f.label}>
              <dt className="text-[0.65625rem] font-semibold tracking-[0.08em] text-faint uppercase">
                {f.label}
              </dt>
              <dd className="mt-0.5 text-ui-sm text-ink">
                {f.value}{' '}
                <Chip tone="neutral">{f.source === 'crr' ? s.refCrr : s.refUpstream}</Chip>
              </dd>
            </div>
          ))}
        </dl>
      </Collapsible>
    </div>
  )
}
