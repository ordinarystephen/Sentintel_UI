/**
 * The shared borrower-group anatomy (refinement round: "one repository,
 * mirrored lenses"): serif group header (name · RXM · doc count),
 * collapsible, first group open by default until the user takes over,
 * and a 3-documents-visible-then-scroll body. Row rendering is the
 * caller's (CPEA rows differ from CRR rows); the shell is identical.
 * `headerAction` (demo feedback round) renders at the header's right end
 * — CPEA/Inquiry's "Ask about this borrower →". It sits BESIDE the
 * toggle button (never inside it), and its clicks never toggle the group.
 */
import { useState, type ReactNode } from 'react'
import type { BorrowerRef } from '@/api/types'
import { Badge } from '@/components/Badge'
import { plural } from '@/lib/fmt'
import { strings } from '@/strings'

export interface BorrowerGroup<T> {
  borrower: BorrowerRef
  docs: T[]
}

export function BorrowerGroups<T>({
  groups,
  renderDoc,
  maxVisible = 3,
  headerAction,
}: {
  groups: Array<BorrowerGroup<T>>
  renderDoc: (doc: T) => ReactNode
  maxVisible?: number
  headerAction?: (borrower: BorrowerRef, docCount: number) => ReactNode
}) {
  // null = the default state (first group open); a Set is explicit user state
  const [open, setOpen] = useState<Set<string> | null>(null)
  const isOpen = (rxm: string, i: number) => (open === null ? i === 0 : open.has(rxm))
  // 3 rows ≈ 176px in both concepts; scale for other maxVisible values
  const maxH = Math.round((176 / 3) * maxVisible)
  return (
    <div>
      {groups.map((g, gi) => {
        const expanded = isOpen(g.borrower.rxm, gi)
        const toggle = () =>
          setOpen((prev) => {
            const next =
              prev === null
                ? new Set(groups.filter((_, i) => i === 0).map((x) => x.borrower.rxm))
                : new Set(prev)
            if (next.has(g.borrower.rxm)) next.delete(g.borrower.rxm)
            else next.add(g.borrower.rxm)
            return next
          })
        const button = (
          <button
            type="button"
            aria-expanded={expanded}
            onClick={toggle}
            className={
              headerAction
                ? 'flex min-w-0 flex-1 items-baseline gap-2.5 py-1 text-left select-none'
                : 'mt-3.5 mb-2 flex w-full items-baseline gap-2.5 rounded-lg px-1.5 py-1 text-left select-none hover:bg-bg-hover'
            }
          >
            <span className="self-center text-[0.6875rem] text-faint">{expanded ? '▾' : '▸'}</span>
            <h3 className="font-display text-[0.96875rem] font-semibold">{g.borrower.name}</h3>
            <span className="font-mono text-[0.75rem] text-muted">{g.borrower.rxm}</span>
            <Badge tone="neutral">
              {plural(g.docs.length, strings.docGroups.docsOne, strings.docGroups.docsOther)}
            </Badge>
          </button>
        )
        return (
          <div key={g.borrower.rxm}>
            {headerAction ? (
              <div className="mt-3.5 mb-2 flex items-baseline gap-2.5 rounded-lg px-1.5 hover:bg-bg-hover">
                {button}
                <span className="flex-none" onClick={(e) => e.stopPropagation()}>
                  {headerAction(g.borrower, g.docs.length)}
                </span>
              </div>
            ) : (
              button
            )}
            {expanded && (
              <div
                data-testid="group-docs"
                className="overflow-y-auto px-1.5"
                style={{ maxHeight: maxH }}
              >
                {g.docs.map((d) => renderDoc(d))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
