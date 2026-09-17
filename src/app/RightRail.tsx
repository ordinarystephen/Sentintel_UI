/**
 * Right context rail (build-spec §5.3) — review route only, ~312px, collapsible
 * from the sticky borrower bar. Follows the selected work-paper item (exactly
 * one; the review screen selects the first flagged item by default). Four
 * tabs from strings.ts: Why, Respond, Debate, Prior (Prior only when the
 * borrower has a prior review). Reads the review from the same query the
 * screen uses, so nothing is passed through props.
 */
import { useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent } from 'react'
import { useDebate, usePriorDeltas, useReview } from '@/api/hooks'
import type { Review, WorkItem } from '@/api/types'
import { cx } from '@/lib/cx'
import { usePersistedState } from '@/lib/usePersistedState'
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

/* Drag-resize contract (suite round, 2026-09-17; mirrors the mockup's
   .ctx-resizer): min 260 / max 560 / default 312, dbl-click resets, width
   persists as sentinel.ctxWidth, ≥420 turns the rail into a reading pane
   (`ctx-wide`: type steps up one size, Debate goes side-by-side — base.css). */
export const CTX_MIN = 260
export const CTX_MAX = 560
export const CTX_DEFAULT = 312
export const CTX_WIDE = 420
const KEY_STEP = 16
const clamp = (w: number) => Math.max(CTX_MIN, Math.min(CTX_MAX, w))
const isCtxWidth = (v: unknown): v is number =>
  typeof v === 'number' && Number.isFinite(v) && clamp(v) === v

function ResizeHandle({ width, onResize }: { width: number; onResize: (w: number) => void }) {
  const drag = useRef<{ startX: number; startW: number } | null>(null)
  const [dragging, setDragging] = useState(false)

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    // The selection guard must land synchronously, before the browser's
    // native selection gesture starts — a state/effect-driven style is a
    // frame too late. preventDefault suppresses the compatibility
    // mousedown that begins native selection; the direct DOM style (not
    // React state) is deliberate.
    e.preventDefault()
    window.getSelection()?.removeAllRanges()
    drag.current = { startX: e.clientX, startW: width }
    e.currentTarget.setPointerCapture(e.pointerId)
    setDragging(true)
    document.body.style.userSelect = 'none'
  }
  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    if (!drag.current) return
    // The rail sits right of the handle: dragging left grows it.
    onResize(clamp(drag.current.startW + (drag.current.startX - e.clientX)))
  }
  function endDrag() {
    drag.current = null
    setDragging(false)
    document.body.style.userSelect = ''
  }
  function onKeyDown(e: KeyboardEvent<HTMLDivElement>) {
    if (e.key === 'ArrowLeft') onResize(clamp(width + KEY_STEP))
    else if (e.key === 'ArrowRight') onResize(clamp(width - KEY_STEP))
    else if (e.key === 'Home') onResize(CTX_MIN)
    else if (e.key === 'End') onResize(CTX_MAX)
    else return
    e.preventDefault()
  }

  return (
    <div
      role="separator"
      aria-orientation="vertical"
      aria-label={strings.contextRail.resizeHandle}
      aria-valuemin={CTX_MIN}
      aria-valuemax={CTX_MAX}
      aria-valuenow={width}
      tabIndex={0}
      title={strings.contextRail.resizeHint}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={() => onResize(CTX_DEFAULT)}
      onKeyDown={onKeyDown}
      className={cx(
        'absolute top-0 bottom-0 -left-[3px] z-10 w-[6px] cursor-col-resize',
        (dragging || undefined) && 'ctx-resizing',
        'hover:[background:linear-gradient(to_right,transparent_2px,var(--rule-strong)_2px,var(--rule-strong)_4px,transparent_4px)]',
        dragging &&
          '[background:linear-gradient(to_right,transparent_2px,var(--rule-strong)_2px,var(--rule-strong)_4px,transparent_4px)]',
      )}
    />
  )
}

export function RightRail() {
  const { currentReview, selectedItemId } = useShell()
  const reviewId = currentReview?.id ?? ''
  const q = useReview(reviewId)
  const review = q.data?.status === 'ready' ? q.data : null
  const [ctxWidth, setCtxWidth] = usePersistedState('ctxWidth', CTX_DEFAULT, isCtxWidth)
  return (
    <aside
      aria-label={strings.contextRail.header}
      style={{ width: ctxWidth }}
      className={cx(
        'relative flex min-h-0 flex-none flex-col border-l border-rule bg-bg-subtle max-[1120px]:hidden',
        ctxWidth >= CTX_WIDE && 'ctx-wide',
      )}
    >
      <ResizeHandle width={ctxWidth} onResize={setCtxWidth} />
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
              <span className="ml-[3px] inline-block min-w-[15px] rounded-full border border-rule-strong px-1 text-[0.59375rem] text-muted">
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
        ) : (
          <div key={`${tab}:${item.id}`} className="settle">
            {tab === 'why' ? (
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
        )}
      </div>
    </>
  )
}
