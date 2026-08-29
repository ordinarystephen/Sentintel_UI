/**
 * Review page (`/review/:id`, build-spec §5.3). Phase 1 lands the frame that
 * the shell depends on: the sticky borrower bar (name · ID · Export Review ·
 * context-rail toggle), six section anchors (`#sec-N`) that the left rail and
 * deep links target, and registration of the current review with the shell.
 * Phase 2/3 replace the placeholder record with the API and real content.
 */
import { useMemo } from 'react'
import { useParams } from 'react-router-dom'
import { PanelRightIcon } from '@/app/icons'
import { useRegisterCurrentReview, useShell, type CurrentReview } from '@/app/ShellContext'
import { SECTIONS, sectionAnchor } from '@/lib/sections'
import { useHashTarget } from '@/lib/useHashTarget'
import { strings } from '@/strings'

// Placeholder record (fictional borrower from the mockup) until the API seam lands.
const PLACEHOLDER = {
  name: 'Meridian US Holdco LLC',
  clId: 'CL6430',
  openItems: 4,
  sections: [
    { n: 1, status: 'attention' },
    { n: 2, status: 'attention' },
    { n: 3, status: 'pending' },
    { n: 4, status: 'pending' },
    { n: 5, status: 'pending' },
    { n: 6, status: 'pending' },
  ],
} satisfies Omit<CurrentReview, 'id'> & { clId: string }

export function ReviewScreen() {
  const { id = '' } = useParams()
  const { ctxCollapsed, setCtxCollapsed } = useShell()

  const current = useMemo<CurrentReview>(
    () => ({
      id,
      name: PLACEHOLDER.name,
      openItems: PLACEHOLDER.openItems,
      sections: PLACEHOLDER.sections,
    }),
    [id],
  )
  useRegisterCurrentReview(current)
  useHashTarget()

  return (
    <div>
      {/* Sticky borrower bar: escapes the canvas padding so it sits flush at the canvas top. */}
      <div className="sticky -top-[26px] z-20 -mx-9 -mt-[26px] flex flex-wrap items-center gap-3 border-b border-rule bg-bg px-9 pt-[38px] pb-[10px] max-[760px]:-mx-[18px] max-[760px]:px-[18px]">
        <h1 className="font-display text-borrower font-semibold tracking-display">
          {PLACEHOLDER.name}
        </h1>
        <span className="font-mono text-micro text-faint">{PLACEHOLDER.clId}</span>
        <div className="ml-auto flex gap-2">
          <button
            type="button"
            className="inline-flex items-center rounded-md border border-transparent bg-primary px-[11px] py-[5px] text-[12px] font-medium text-on-ink hover:brightness-115"
          >
            {strings.review.exportReview}
          </button>
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

      <div className="mt-5 flex items-baseline gap-[10px]">
        <h3 className="text-[14px] font-semibold tracking-tight">
          {strings.review.workpaperHeading}
        </h3>
        <span className="text-[12px] text-faint">6 sections</span>
      </div>

      <div className="mt-[10px] border-t border-rule">
        {SECTIONS.map((s) => (
          <section
            key={s.n}
            id={sectionAnchor(s.n)}
            aria-labelledby={`${sectionAnchor(s.n)}-title`}
            className="min-h-[220px] scroll-mt-16 border-b border-rule py-[13px]"
          >
            <div className="flex items-center gap-[11px] px-0.5">
              <span className="w-[18px] flex-none text-center font-mono text-[12px] text-faint">
                {s.n}
              </span>
              <h2
                id={`${sectionAnchor(s.n)}-title`}
                className="font-display text-section-title font-semibold"
              >
                {s.title}
              </h2>
            </div>
            <p className="mt-2 pl-[31px] text-dense text-faint">{strings.review.sectionPending}</p>
          </section>
        ))}
      </div>

      <p className="mt-[30px] border-t border-rule pt-3 text-micro text-faint">
        {strings.review.disclaimer}
      </p>
    </div>
  )
}
