/**
 * The single-question results shape (born in Inquiry r1 and ratified for
 * both applications — pin I3, "one question, one column"): identity
 * columns, the flag, and the answer — Borrower · RXM · Flags · Answer. No
 * group-by toggle: with one question the two cuts are the same cut. This
 * is what CPEA renders for its own Prompt-only runs and what every
 * Inquiry run renders.
 *
 * Cells: unsupported → amber em-dash (the answer text waits in the
 * expansion); derived → dotted underline with the derivation title;
 * stated → plain; the answer truncates at 560px. Rows expand
 * independently (not an accordion) to the full answer with grade + conf
 * chips, the decision-table footer, and Detail & evidence → the shared
 * verification modal. Default sort most-flags-first (stable); header
 * sorting is pair-aware — the expansion row travels with its data row.
 */
import { Fragment, useMemo, useState } from 'react'
import type { ErmAnswer, ErmRun, QuestionField } from '@/api/types'
import { AnswerDetailModal, GradeChip } from '@/components/viewers/AnswerDetailModal'
import { flagCount } from '@/lib/ermModel'
import { cx } from '@/lib/cx'
import { fmt } from '@/lib/fmt'
import { strings } from '@/strings'
import { ERM_RATIONALE_LABELS } from './config'
import { usePortfolioApp } from './portfolioApp'

interface Row {
  rxm: string
  name: string
  flags: number
  answer: ErmAnswer | undefined
}

type SortKey = 'name' | 'rxm' | 'flags' | 'answer'

export function SingleQuestionTable({ run, field }: { run: ErmRun; field: QuestionField }) {
  const s = usePortfolioApp().copy.results
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'flags', desc: true })
  const [open, setOpen] = useState<ReadonlySet<string>>(new Set())
  const [detail, setDetail] = useState<{ answer: ErmAnswer; borrower: string } | null>(null)

  const rows = useMemo<Row[]>(() => {
    const out = run.population.included.map((b) => ({
      rxm: b.rxm,
      name: b.name,
      flags: flagCount(run.answers, b.rxm),
      answer: run.answers.find((a) => a.rxm === b.rxm && a.questionId === field.id),
    }))
    const text = (r: Row) =>
      sort.key === 'name' ? r.name : sort.key === 'rxm' ? r.rxm : (r.answer?.value ?? '')
    // Array.prototype.sort is stable: ties keep population order
    out.sort((a, b) => {
      const c = sort.key === 'flags' ? a.flags - b.flags : text(a).localeCompare(text(b))
      return c * (sort.desc ? -1 : 1)
    })
    return out
  }, [run.answers, run.population.included, field.id, sort])

  function header(key: SortKey, label: string) {
    const active = sort.key === key
    return (
      <th
        key={key}
        onClick={() => setSort((p) => ({ key, desc: p.key === key ? !p.desc : true }))}
        aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : undefined}
        className="cursor-pointer border-b border-rule-strong bg-bg-subtle px-3 py-[9px] text-left text-micro font-semibold whitespace-nowrap text-muted hover:text-ink"
      >
        {label}
        {active && <span className="text-ink">{sort.desc ? ' ↓' : ' ↑'}</span>}
      </th>
    )
  }

  function answerCell(a: ErmAnswer | undefined) {
    if (!a || a.grade === 'unsupported')
      return <span className={cx('font-semibold', a && 'text-warn')}>—</span>
    if (a.grade === 'derived')
      return (
        <span className="cursor-help border-b border-dotted border-faint" title={s.derivedTitle}>
          {a.value}
        </span>
      )
    return a.value
  }

  const toggle = (rxm: string) =>
    setOpen((prev) => {
      const next = new Set(prev)
      if (next.has(rxm)) next.delete(rxm)
      else next.add(rxm)
      return next
    })

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-rule bg-bg">
        <table
          className="w-full border-collapse text-[0.8125rem]"
          data-testid="single-question-table"
        >
          <thead>
            <tr>
              {header('name', s.colBorrower)}
              {header('rxm', s.colRxm)}
              {header('flags', s.colFlags)}
              {header('answer', s.colAnswer)}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.rxm}>
                <tr
                  className="cursor-pointer whitespace-nowrap transition-colors hover:bg-bg-hover"
                  data-rxm={r.rxm}
                  aria-expanded={open.has(r.rxm)}
                  onClick={() => toggle(r.rxm)}
                >
                  <td className="border-b border-rule px-3 py-2.5 font-semibold">{r.name}</td>
                  <td className="border-b border-rule px-3 py-2.5 font-mono text-[0.75rem]">
                    {r.rxm}
                  </td>
                  <td className="border-b border-rule px-3 py-2.5">
                    {r.flags > 0 ? (
                      <span className="rounded-full border border-warn-line bg-warn-bg px-[7px] text-[0.625rem] font-semibold text-warn">
                        {fmt(s.flagsBadge, { n: r.flags })}
                      </span>
                    ) : (
                      <span className="text-faint">—</span>
                    )}
                  </td>
                  <td className="max-w-[560px] overflow-hidden border-b border-rule px-3 py-2.5 text-ellipsis">
                    {answerCell(r.answer)}
                  </td>
                </tr>
                {open.has(r.rxm) && (
                  <tr data-expansion={r.rxm}>
                    <td colSpan={4} className="border-b border-rule bg-bg-subtle px-3 pb-3.5">
                      {/* one field: the full answer gets the row's full width */}
                      <div className="pt-3">
                        <div className="flex items-baseline gap-2.5 border-b border-rule py-1.5 text-[0.78125rem]">
                          <span className="w-[170px] flex-none text-dense text-muted">
                            {s.colAnswer}
                          </span>
                          <span className="min-w-0 flex-1">{r.answer?.value ?? '—'}</span>
                          <span className="flex flex-none gap-1">
                            {r.answer && <GradeChip grade={r.answer.grade} />}
                            {r.answer && r.answer.grade !== 'unsupported' && (
                              <span className="rounded border border-rule-strong bg-bg px-[5px] text-[0.625rem] text-muted">
                                {fmt(s.confChip, { level: r.answer.conf })}
                              </span>
                            )}
                          </span>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-3.5 pt-2.5 text-dense text-faint">
                        <span>{s.expansionFooter}</span>
                        {r.answer && (
                          <button
                            type="button"
                            className="text-muted underline underline-offset-2"
                            onClick={(e) => {
                              e.stopPropagation()
                              setDetail({ answer: r.answer!, borrower: r.name })
                            }}
                          >
                            {s.detailLink}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-dense text-faint">{s.tableNoteSingle}</p>
      {detail && (
        <AnswerDetailModal
          title={fmt(strings.erm.detail.titleSingle, { borrower: detail.borrower })}
          answer={detail.answer}
          rationaleCards={
            detail.answer.rationale
              ? [
                  {
                    label: ERM_RATIONALE_LABELS.memoFacts,
                    text: detail.answer.rationale.memoFacts,
                  },
                  { label: ERM_RATIONALE_LABELS.basis, text: detail.answer.rationale.basis },
                ]
              : []
          }
          onClose={() => setDetail(null)}
        />
      )}
    </>
  )
}
