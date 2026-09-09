/**
 * Areas of assessment — the management-summary verdicts the exported review
 * OPENS with (screen = deliverable). Sits between NEEDS YOUR ATTENTION and
 * the work paper. The whole zone folds like the attention block, and the
 * pending badge + tally stay on the collapsed header and update live, so a
 * folded summary never goes stale. Each area is its own collapsible row:
 * rating pill, reason narrative, supporting-section deep links; a pending
 * area names its blocker, links to it, and takes the analyst's verdict.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AreaRating, AssessmentArea, Review } from '@/api/types'
import { ChevronIcon } from '@/app/icons'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Collapsible } from '@/components/Collapsible'
import { cx } from '@/lib/cx'
import { fmt } from '@/lib/fmt'
import { sectionAnchor } from '@/lib/sections'
import { strings } from '@/strings'
import { useReviewScreen } from './reviewContext'

const s = strings.review

const PILL: Record<AreaRating, string> = {
  satisfactory: 'border-success-line bg-success-bg text-success',
  unsatisfactory: 'border-error bg-error-bg text-error',
  na: 'border-rule-strong bg-bg-subtle text-muted',
  pending: 'border-warn-line bg-warn-bg text-warn',
}
const PILL_LABEL: Record<AreaRating, string> = {
  satisfactory: s.ratingSatisfactory,
  unsatisfactory: s.ratingUnsatisfactory,
  na: s.ratingNa,
  pending: s.ratingPending,
}

function RatingPill({ rating }: { rating: AreaRating }) {
  return (
    <span
      className={cx(
        'rounded-full border px-[9px] py-0.5 text-[0.625rem] font-semibold tracking-[0.04em]',
        PILL[rating],
      )}
    >
      {PILL_LABEL[rating]}
    </span>
  )
}

function tally(areas: readonly AssessmentArea[]): string {
  const count = (r: AreaRating) => areas.filter((a) => a.rating === r).length
  const parts = [fmt(s.areasCount, { n: areas.length })]
  if (count('satisfactory') > 0) parts.push(fmt(s.areasTallySat, { n: count('satisfactory') }))
  if (count('unsatisfactory') > 0)
    parts.push(fmt(s.areasTallyUnsat, { n: count('unsatisfactory') }))
  if (count('na') > 0) parts.push(fmt(s.areasTallyNa, { n: count('na') }))
  return parts.join(' · ')
}

function AreaRow({ area, reviewId }: { area: AssessmentArea; reviewId: string }) {
  const { canEdit, actions } = useReviewScreen()
  const [open, setOpen] = useState(area.rating === 'pending')
  const bodyId = `${area.id}-body`
  return (
    <section className="mb-2 rounded-[10px] border border-rule bg-bg">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setOpen((o) => !o)}
        className="flex w-full items-center gap-[10px] px-3.5 py-[10px] text-left"
      >
        <ChevronIcon
          className={cx(
            'h-3 w-3 flex-none text-faint transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
        <span className="min-w-0 flex-1 text-ui font-semibold">{area.name}</span>
        <RatingPill rating={area.rating} />
      </button>
      <Collapsible open={open} id={bodyId}>
        <div className="border-t border-rule px-3.5 pt-[10px] pb-3 text-ui-sm leading-[1.55] text-ink-soft">
          {area.reason}
          <div className="mt-[9px] flex flex-wrap items-center gap-3">
            {area.rating === 'pending' ? (
              <>
                {area.sectionRefs[0] !== undefined && (
                  <Link
                    to={`/review/${reviewId}#${sectionAnchor(area.sectionRefs[0])}`}
                    className="text-[0.75rem] text-ink underline underline-offset-2"
                  >
                    {fmt(s.resolveLink, { n: area.sectionRefs[0] })}
                  </Link>
                )}
                {canEdit && (
                  <>
                    <span className="text-micro text-faint">{s.thenSet}</span>
                    <Button
                      variant="outline"
                      small
                      disabled={actions.pending}
                      onClick={() => actions.setAreaRating(area.id, 'satisfactory')}
                    >
                      {s.setSatisfactory}
                    </Button>
                    <Button
                      variant="outline"
                      small
                      disabled={actions.pending}
                      onClick={() => actions.setAreaRating(area.id, 'unsatisfactory')}
                    >
                      {s.setUnsatisfactory}
                    </Button>
                  </>
                )}
              </>
            ) : (
              area.sectionRefs.map((n) => (
                <Link
                  key={n}
                  to={`/review/${reviewId}#${sectionAnchor(n)}`}
                  className="text-[0.75rem] text-ink underline underline-offset-2"
                >
                  {fmt(s.supportingLink, { n })}
                </Link>
              ))
            )}
          </div>
        </div>
      </Collapsible>
    </section>
  )
}

export function AssessmentAreas({ review }: { review: Review }) {
  const [open, setOpen] = useState(true)
  // Data-integrity guard ONLY: a well-formed review always carries areas
  // (they are structural to every review). Missing/empty means a malformed
  // or legacy record slipped through — render no zone rather than crash.
  const areas = review.areas ?? []
  const pending = areas.filter((a) => a.rating === 'pending').length
  if (areas.length === 0) return null
  return (
    <div className="mb-7">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="areas-body"
        onClick={() => setOpen((o) => !o)}
        className="mb-[10px] flex w-full items-center gap-[10px] text-left"
      >
        <ChevronIcon
          className={cx(
            'h-3 w-3 flex-none text-faint transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
        <h3 className="text-[0.875rem] font-semibold tracking-tight">{s.areasHeading}</h3>
        {pending > 0 && <Badge tone="amber">{fmt(s.areasPendingBadge, { n: pending })}</Badge>}
        <span className="text-[0.75rem] text-faint">{tally(areas)}</span>
      </button>
      <Collapsible open={open} id="areas-body">
        <div>
          {areas.map((a) => (
            <AreaRow key={a.id} area={a} reviewId={review.id} />
          ))}
        </div>
      </Collapsible>
    </div>
  )
}
