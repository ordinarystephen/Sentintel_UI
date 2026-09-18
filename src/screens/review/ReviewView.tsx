/**
 * The ready review (build-spec §5.3): sticky borrower bar, sub line, the story,
 * NEEDS YOUR ATTENTION, the inline work paper, disclaimer. Deep links
 * (`#sec-N`) expand the target section and scroll to it with the neutral flash.
 */
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation } from 'react-router-dom'
import type { Evidence, Review } from '@/api/types'
import { PanelRightIcon } from '@/app/icons'
import { useRegisterCurrentReview, useShell, type CurrentReview } from '@/app/ShellContext'
import { ReviewScreenContext } from './reviewContext'
import { useReviewActions } from './useReviewActions'
import { Badge } from '@/components/Badge'
import { shortOutlook } from '@/lib/format'
import { useHashTarget } from '@/lib/useHashTarget'
import { strings } from '@/strings'
import { AddDocumentModal } from './AddDocumentModal'
import { AssessmentAreas } from './AssessmentAreas'
import { Button } from '@/components/Button'
import { EvidenceManifest } from './EvidenceManifest'
import { AttentionBlock } from './AttentionBlock'
import { ExportButton } from './ExportButton'
import { ReferenceDataBlock } from './ReferenceDataBlock'
import { SourceModal } from '@/components/viewers/SourceModal'
import { StoryCard } from './StoryCard'
import { isFlagged } from './itemState'
import { useExport } from './useExport'
import { Workpaper } from './Workpaper'
import { fmt } from '@/lib/fmt'

function hashSection(hash: string): number | null {
  const m = /^#sec-(\d)$/.exec(hash)
  return m ? Number(m[1]) : null
}

export function ReviewView({ review }: { review: Review }) {
  const s = strings.review
  const { hash } = useLocation()
  const { ctxCollapsed, setCtxCollapsed, selectedItemId, setSelectedItemId } = useShell()
  const [source, setSource] = useState<Evidence | null>(null)
  const [addDoc, setAddDoc] = useState(false)
  const exp = useExport(review.id)
  const actions = useReviewActions(review.id)
  const screenCtx = useMemo(
    () => ({ reviewId: review.id, canEdit: !review.readOnly, actions }),
    [review.id, review.readOnly, actions],
  )

  // Default selection: the first flagged item (else the first item); exactly one selected.
  const allItems = useMemo(() => review.sections.flatMap((sec) => sec.items), [review])
  useEffect(() => {
    if (selectedItemId && allItems.some((i) => i.id === selectedItemId)) return
    const first = allItems.find(isFlagged) ?? allItems[0]
    setSelectedItemId(first?.id ?? null)
  }, [allItems, selectedItemId, setSelectedItemId])

  // Default-open: the section holding the first flagged item (the mockup opens Financials).
  const [open, setOpen] = useState<Set<number>>(() => {
    const first =
      review.sections.find((sec) => sec.items.some(isFlagged))?.n ??
      review.sections.find((x) => x.status === 'populated')?.n
    const target = hashSection(hash)
    return new Set([first, target].filter((n): n is number => n !== undefined && n !== null))
  })
  useEffect(() => {
    const n = hashSection(hash)
    if (n !== null) setOpen((prev) => (prev.has(n) ? prev : new Set(prev).add(n)))
  }, [hash])
  const toggle = useCallback((n: number) => {
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(n)) next.delete(n)
      else next.add(n)
      return next
    })
  }, [])
  useHashTarget(true)

  const current = useMemo<CurrentReview>(
    () => ({
      id: review.id,
      name: review.borrowerName,
      openItems: review.openItems,
      sections: review.sections.map((sec) => ({
        n: sec.n,
        status:
          sec.status === 'pending'
            ? 'pending'
            : review.attention.some((a) => a.sectionN === sec.n && a.state === 'open')
              ? 'attention'
              : 'populated',
      })),
    }),
    [review],
  )
  useRegisterCurrentReview(current)

  return (
    <ReviewScreenContext.Provider value={screenCtx}>
      <div className="settle">
        <div className="sticky -top-[26px] z-20 -mx-9 -mt-[26px] flex flex-wrap items-center gap-3 border-b border-rule bg-bg px-9 pt-[38px] pb-[10px] max-[760px]:-mx-[18px] max-[760px]:px-[18px]">
          <h1 className="font-display text-borrower font-semibold tracking-display">
            {review.borrowerName}
          </h1>
          <span className="font-mono text-micro text-faint">{review.rxm}</span>
          <div className="ml-auto flex items-center gap-2">
            {!review.readOnly && (
              <Button variant="outline" small onClick={() => setAddDoc(true)}>
                {s.addDocument}
              </Button>
            )}
            <ExportButton onClick={exp.run} pending={exp.pending} />
            <button
              type="button"
              aria-label={strings.contextRail.toggle}
              aria-pressed={!ctxCollapsed}
              title={strings.contextRail.header}
              onClick={() => setCtxCollapsed(!ctxCollapsed)}
              className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-bg-hover [&>svg]:h-[15px] [&>svg]:w-[15px]"
            >
              <PanelRightIcon />
            </button>
          </div>
        </div>
        {review.readOnly && (
          <p className="mt-3 text-dense text-faint">
            {fmt(strings.rail.readOnly, { owner: review.ownerName })}
          </p>
        )}
        {exp.error && (
          <p
            role="alert"
            className="mt-3 rounded-md border border-error/40 bg-error-bg px-3 py-2 text-ui-sm text-error"
          >
            {exp.error}
          </p>
        )}

        <div className="my-3.5 mb-5 flex flex-wrap items-center gap-3 text-ui-sm text-muted">
          <span>
            {review.sector} · {review.ownership}
            {review.ratings.map((r) => (
              <span key={r.agency}>
                {' '}
                ·{' '}
                <b className="font-semibold text-ink-soft">
                  {r.agency} {r.rating}
                </b>{' '}
                /{shortOutlook(r.outlook)}
              </span>
            ))}
          </span>
          {review.dealTypeChips.map((c) => (
            <Badge key={c} tone="indigo">
              {c}
            </Badge>
          ))}
        </div>

        <EvidenceManifest review={review} />

        <ReferenceDataBlock review={review} />
        <StoryCard review={review} />
        <AttentionBlock review={review} />
        <AssessmentAreas review={review} />
        <Workpaper review={review} open={open} onToggle={toggle} onViewSource={setSource} />

        <p className="mt-[30px] border-t border-rule pt-3 text-micro text-faint">{s.disclaimer}</p>

        {source && <SourceModal evidence={source} onClose={() => setSource(null)} />}
        {addDoc && (
          <AddDocumentModal review={review} actions={actions} onClose={() => setAddDoc(false)} />
        )}
      </div>
    </ReviewScreenContext.Provider>
  )
}
