/**
 * The inline collapsible work paper (build-spec §5.3 #5) — one document flow,
 * NOT cards: hairline-ruled rows with mono number, serif title, status pill,
 * attention chip, chevron. Expanded rows show items separated by hairlines;
 * "not yet populated" rows show their feeder note.
 */
import type { Evidence, Review } from '@/api/types'
import { ChevronIcon } from '@/app/icons'
import { Chip } from '@/components/Chip'
import { Collapsible } from '@/components/Collapsible'
import { Pill } from '@/components/Pill'
import { ViaBadge } from '@/components/ViaBadge'
import { cx } from '@/lib/cx'
import { sectionAnchor } from '@/lib/sections'
import { strings } from '@/strings'
import { sectionCounts } from './itemState'
import { WorkItemView } from './WorkItemView'
import { fmt } from '@/lib/fmt'

export function Workpaper({
  review,
  open,
  onToggle,
  onViewSource,
}: {
  review: Review
  open: ReadonlySet<number>
  onToggle: (n: number) => void
  onViewSource: (e: Evidence) => void
}) {
  const s = strings.review
  return (
    <>
      <div className="mt-7 mb-[10px] flex items-baseline gap-[10px]">
        <h3 className="text-[0.875rem] font-semibold tracking-tight">{s.workpaperHeading}</h3>
        <span className="text-[0.75rem] text-faint">
          {fmt(s.workpaperAside, { n: review.sectionsPopulated })}
        </span>
      </div>
      <div className="border-t border-rule">
        {review.sections.map((sec) => {
          const isOpen = open.has(sec.n)
          const counts = sectionCounts(sec)
          const pending = sec.status === 'pending'
          const bodyId = `${sectionAnchor(sec.n)}-body`
          return (
            <section
              key={sec.n}
              id={sectionAnchor(sec.n)}
              aria-labelledby={`${sectionAnchor(sec.n)}-title`}
              className="scroll-mt-16 border-b border-rule"
            >
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={bodyId}
                onClick={() => onToggle(sec.n)}
                className="flex w-full items-center gap-[11px] px-0.5 py-[13px] text-left hover:bg-bg-subtle"
              >
                <span className="w-[18px] flex-none text-center font-mono text-[0.75rem] text-faint">
                  {sec.n}
                </span>
                <h2
                  id={`${sectionAnchor(sec.n)}-title`}
                  className={cx(
                    'flex-1 font-display text-section-title',
                    pending ? 'font-normal text-muted' : 'font-semibold text-ink',
                  )}
                >
                  {sec.title}
                </h2>
                <Pill tone={pending ? 'todo' : 'pop'}>
                  {pending ? s.notPopulated : s.populated}
                </Pill>
                {counts.reviewRequired > 0 && (
                  <Chip>{fmt(s.reviewReqChip, { n: counts.reviewRequired })}</Chip>
                )}
                {counts.unresolved > 0 && (
                  <ViaBadge
                    via="unresolved"
                    label={fmt(s.unresolvedChip, { n: counts.unresolved })}
                  />
                )}
                <ChevronIcon
                  className={cx(
                    'h-[13px] w-[13px] flex-none text-faint transition-transform duration-200',
                    isOpen && 'rotate-90',
                  )}
                />
              </button>
              <Collapsible open={isOpen} id={bodyId}>
                {pending ? (
                  <p className="pb-4 pl-[31px] text-dense text-faint">{sec.feederNote}</p>
                ) : (
                  <div className="pt-0.5 pb-[18px] pl-[31px] [&>*+*]:border-t [&>*+*]:border-rule">
                    {sec.items.map((item) => (
                      <WorkItemView
                        key={item.id}
                        item={item}
                        floor={review.confidenceFloor}
                        onViewSource={onViewSource}
                      />
                    ))}
                  </div>
                )}
              </Collapsible>
            </section>
          )
        })}
      </div>
    </>
  )
}
