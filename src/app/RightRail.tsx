/**
 * Right context rail (build-spec §5.3) — review route only, ~312px, collapsible
 * from the sticky borrower bar. Phase 1 lands the frame: header, the four tabs
 * (names from strings.ts) and an empty body. Phase 4 wires selection and panes.
 */
import { useState } from 'react'
import { cx } from '@/lib/cx'
import { strings } from '@/strings'

type TabId = keyof typeof strings.contextRail.tabs
const TABS = Object.keys(strings.contextRail.tabs) as TabId[]

export function RightRail() {
  const [tab, setTab] = useState<TabId>('why')
  return (
    <aside
      aria-label={strings.contextRail.header}
      className="flex min-h-0 w-[312px] flex-none flex-col border-l border-rule bg-bg-subtle max-[1120px]:hidden"
    >
      <div className="border-b border-rule px-4 pt-[14px] pb-[10px]">
        <span className="micro text-faint">{strings.contextRail.header}</span>
        <div className="mt-[3px] text-ui leading-[1.35] font-semibold">
          <span className="mr-1.5 font-mono text-micro font-normal text-faint">§—</span>
          {strings.contextRail.noSelection}
        </div>
      </div>
      <div role="tablist" className="flex gap-0.5 border-b border-rule bg-bg-subtle px-3 py-[10px]">
        {TABS.map((id) => (
          <button
            key={id}
            type="button"
            role="tab"
            id={`ctx-tab-${id}`}
            aria-selected={tab === id}
            aria-controls="ctx-pane"
            onClick={() => setTab(id)}
            className={cx(
              'flex-1 rounded-md px-1 py-[5px] text-center text-dense text-muted',
              tab === id && 'bg-bg font-semibold text-ink shadow-sm',
            )}
          >
            {strings.contextRail.tabs[id]}
          </button>
        ))}
      </div>
      <div
        id="ctx-pane"
        role="tabpanel"
        aria-labelledby={`ctx-tab-${tab}`}
        className="min-h-0 flex-1 overflow-y-auto px-4 pt-[14px] pb-5 text-ui-sm leading-[1.55] text-muted"
      >
        {strings.contextRail.emptyBody}
      </div>
    </aside>
  )
}
