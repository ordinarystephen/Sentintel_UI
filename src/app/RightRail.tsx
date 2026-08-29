/**
 * Right context rail (build-spec §5.3) — review route only, ~312px, collapsible
 * from the sticky borrower bar. Follows the selected work-paper item (exactly
 * one; the review screen selects the first flagged item by default). Four
 * tabs from strings.ts: Why, Respond, Debate, Prior (Prior only when the
 * borrower has a prior review). Reads the review from the same query the
 * screen uses, so nothing is passed through props.
 */
import { useEffect, useMemo, useState, type KeyboardEvent } from 'react'
import { useDebate, usePriorDeltas, useReview } from '@/api/hooks'
import type { Review, WorkItem } from '@/api/types'
import { cx } from '@/lib/cx'
import { DebatePane } from '@/screens/review/rail/DebatePane'
import { PriorPane } from '@/screens/review/rail/PriorPane'
import { RespondPane } from '@/screens/review/rail/RespondPane'
import { WhyPane } from '@/screens/review/rail/WhyPane'
import { useReviewActions } from '@/screens/review/useReviewActions'
import { strings } from '@/strings'
import { useShell } from './ShellContext'

type TabId = keyof typeof strings.contextRail.tabs

function findItem(review: Review, id: string | null): WorkItem | null {
  if (!id) return null
  for (const s of review.sections) for (const it of s.items) if (it.id === id) return it
  return null
}

export function RightRail() {
  const { currentReview, selectedItemId } = useShell()
  const reviewId = currentReview?.id ?? ''
  const q = useReview(reviewId)
  const review = q.data?.status === 'ready' ? q.data : null
  return (
    <aside
      aria-label={strings.contextRail.header}
      className="flex min-h-0 w-[312px] flex-none flex-col border-l border-rule bg-bg-subtle max-[1120px]:hidden"
    >
      {review ? (
        <RailBody review={review} item={findItem(review, selectedItemId)} />
      ) : (
        <RailHeader />
      )}
    </aside>
  )
}

function RailHeader({ item }: { item?: WorkItem | null }) {
  return (
    <div className="border-b border-rule px-4 pt-[14px] pb-[10px]">
      <span className="micro text-faint">{strings.contextRail.header}</span>
      <div className="mt-[3px] text-ui leading-[1.35] font-semibold">
        <span className="mr-1.5 font-mono text-micro font-normal text-faint">
          {item ? `§${item.sectionN}` : '§—'}
        </span>
        {item ? item.name : strings.contextRail.noSelection}
      </div>
    </div>
  )
}

function RailBody({ review, item }: { review: Review; item: WorkItem | null }) {
  const [tab, setTab] = useState<TabId>('why')
  const prior = usePriorDeltas(review.id)
  const debate = useDebate(item?.id ?? null)
  const actions = useReviewActions(review.id)
  const tabs = useMemo<TabId[]>(() => {
    const all = Object.keys(strings.contextRail.tabs) as TabId[]
    return prior.data ? all : all.filter((t) => t !== 'prior')
  }, [prior.data])
  useEffect(() => {
    if (!tabs.includes(tab)) setTab('why')
  }, [tabs, tab])

  function onKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = tabs.indexOf(tab)
    if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') {
      e.preventDefault()
      const next = tabs[(i + (e.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length]
      setTab(next)
      document.getElementById(`ctx-tab-${next}`)?.focus()
    }
  }

  return (
    <>
      <RailHeader item={item} />
      <div
        role="tablist"
        aria-label={strings.contextRail.header}
        onKeyDown={onKey}
        className="flex gap-0.5 border-b border-rule bg-bg-subtle px-3 py-[10px]"
      >
        {tabs.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`ctx-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="ctx-pane"
            tabIndex={tab === id ? 0 : -1}
            onClick={() => setTab(id)}
            className={cx(
              'flex-1 rounded-md px-1 py-[5px] text-center text-dense text-muted',
              tab === id && 'bg-bg font-semibold text-ink shadow-sm',
            )}
          >
            {strings.contextRail.tabs[id]}
            {id === 'debate' && debate.data && debate.data.length > 0 && (
              <span className="ml-[3px] inline-block min-w-[15px] rounded-full border border-rule-strong px-1 text-[9.5px] text-muted">
                {debate.data.length}
              </span>
            )}
          </button>
        ))}
      </div>
      <div
        id="ctx-pane"
        role="tabpanel"
        aria-labelledby={`ctx-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto px-4 pt-[14px] pb-5 text-ui-sm leading-[1.55] text-muted"
      >
        {!item ? (
          strings.rail.noSelectionBody
        ) : tab === 'why' ? (
          <WhyPane reviewId={review.id} item={item} />
        ) : tab === 'respond' ? (
          <RespondPane
            item={item}
            canEdit={!review.readOnly}
            ownerName={review.ownerName}
            actions={actions}
          />
        ) : tab === 'debate' ? (
          <DebatePane itemId={item.id} />
        ) : prior.data ? (
          <PriorPane prior={prior.data} />
        ) : null}
      </div>
    </>
  )
}
