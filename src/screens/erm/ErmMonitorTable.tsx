/**
 * The by-borrower monitor table (concept pins E2/E12/E13): identity
 * columns pinned (Borrower · RXM · Flags), then the question set's
 * `visible` fields. Cell grades — derived: dotted underline with title;
 * unsupported: amber em-dash. Flags cell: amber count badge or quiet
 * em-dash. Default sort most-flags-first; header sorting is PAIR-AWARE
 * (the expansion row travels with its data row). The inline expansion
 * shows every answer with grade + conf chips; its footer states the
 * decision table and links Detail & evidence → the verification modal.
 */
import { Fragment, useMemo, useState } from 'react'
import type { ErmAnswer, ErmRun, QuestionSet } from '@/api/types'
import { AnswerDetailModal, GradeChip } from '@/components/viewers/AnswerDetailModal'
import { flagCount } from '@/lib/ermModel'
import { fmt } from '@/lib/fmt'
import { ERM_RATIONALE_LABELS } from './config'
import { usePortfolioApp } from './portfolioApp'

interface Row {
  rxm: string
  name: string
  flags: number
  answers: Map<string, ErmAnswer>
}

type SortKey = 'name' | 'rxm' | 'flags' | string

export function ErmMonitorTable({ run, set }: { run: ErmRun; set: QuestionSet }) {
  const { copy } = usePortfolioApp()
  const s = copy.results
  const visible = set.fields.filter((f) => f.visible)
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'flags', desc: true })
  const [openRxm, setOpenRxm] = useState<string | null>(null)
  const [detail, setDetail] = useState<{ answer: ErmAnswer; borrower: string } | null>(null)

  const rows = useMemo<Row[]>(() => {
    const out = run.population.included.map((b) => ({
      rxm: b.rxm,
      name: b.name,
      flags: flagCount(run.answers, b.rxm),
      answers: new Map(run.answers.filter((a) => a.rxm === b.rxm).map((a) => [a.questionId, a])),
    }))
    const val = (r: Row): string | number =>
      sort.key === 'name'
        ? r.name
        : sort.key === 'rxm'
          ? r.rxm
          : sort.key === 'flags'
            ? r.flags
            : (r.answers.get(sort.key)?.value ?? '')
    out.sort((a, b) => {
      let av = val(a)
      let bv = val(b)
      if (typeof av === 'string' && typeof bv === 'string') {
        const an = parseFloat(av.replace(/[^0-9.-]/g, ''))
        const bn = parseFloat(bv.replace(/[^0-9.-]/g, ''))
        if (!Number.isNaN(an) && !Number.isNaN(bn)) {
          av = an
          bv = bn
        }
      }
      return (av < bv ? -1 : av > bv ? 1 : 0) * (sort.desc ? -1 : 1)
    })
    return out
  }, [run.answers, run.population.included, sort])

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

  function cell(a: ErmAnswer | undefined) {
    if (!a) return <td className="border-b border-rule px-3 py-2.5">—</td>
    if (a.grade === 'unsupported')
      return (
        <td className="border-b border-rule px-3 py-2.5">
          <span className="font-semibold text-warn">—</span>
        </td>
      )
    if (a.grade === 'derived')
      return (
        <td className="border-b border-rule px-3 py-2.5">
          <span className="cursor-help border-b border-dotted border-faint" title={s.derivedTitle}>
            {a.value}
          </span>
        </td>
      )
    return <td className="border-b border-rule px-3 py-2.5">{a.value}</td>
  }

  return (
    <>
      <div className="overflow-x-auto rounded-xl border border-rule bg-bg">
        <table className="w-full border-collapse text-[0.8125rem]" data-testid="erm-monitor">
          <thead>
            <tr>
              {header('name', s.colBorrower)}
              {header('rxm', s.colRxm)}
              {header('flags', s.colFlags)}
              {visible.map((f) => header(f.id, f.label))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <Fragment key={r.rxm}>
                <tr
                  className="cursor-pointer whitespace-nowrap transition-colors hover:bg-bg-hover"
                  data-rxm={r.rxm}
                  onClick={() => setOpenRxm((o) => (o === r.rxm ? null : r.rxm))}
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
                  {visible.map((f) =>
                    f.id === 'summary' ? (
                      <td
                        key={f.id}
                        className="max-w-[320px] overflow-hidden border-b border-rule px-3 py-2.5 text-ellipsis"
                      >
                        {r.answers.get('summary')?.value ?? '—'}
                      </td>
                    ) : (
                      <Fragment key={f.id}>{cell(r.answers.get(f.id))}</Fragment>
                    ),
                  )}
                </tr>
                {openRxm === r.rxm && (
                  <tr data-expansion={r.rxm}>
                    <td
                      colSpan={3 + visible.length}
                      className="border-b border-rule bg-bg-subtle px-3 pb-3.5"
                    >
                      <div className="grid grid-cols-2 gap-x-7 pt-3 max-[900px]:grid-cols-1">
                        {set.fields.map((f) => {
                          const a = r.answers.get(f.id)
                          return (
                            <div
                              key={f.id}
                              className="flex items-baseline gap-2.5 border-b border-rule py-1.5 text-[0.78125rem]"
                            >
                              <span className="w-[170px] flex-none text-dense text-muted">
                                {f.label}
                              </span>
                              <span className="min-w-0 flex-1">{a?.value ?? '—'}</span>
                              <span className="flex flex-none gap-1">
                                {a && <GradeChip grade={a.grade} />}
                                {a && a.grade !== 'unsupported' && (
                                  <span className="rounded border border-rule-strong bg-bg px-[5px] text-[0.625rem] text-muted">
                                    {fmt(s.confChip, { level: a.conf })}
                                  </span>
                                )}
                              </span>
                            </div>
                          )
                        })}
                      </div>
                      <div className="flex flex-wrap gap-3.5 pt-2.5 text-dense text-faint">
                        <span>{s.expansionFooter}</span>
                        <button
                          type="button"
                          className="text-muted underline underline-offset-2"
                          onClick={(e) => {
                            e.stopPropagation()
                            const a =
                              r.answers.get('hd') ??
                              [...r.answers.values()].find((x) => x.grade !== 'unsupported') ??
                              [...r.answers.values()][0]
                            if (a) setDetail({ answer: a, borrower: r.name })
                          }}
                        >
                          {s.detailLink}
                        </button>
                      </div>
                    </td>
                  </tr>
                )}
              </Fragment>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-2 text-dense text-faint">
        {fmt(s.tableNote, { shown: 3 + visible.length, total: set.fields.length })}
      </p>
      {detail && (
        <AnswerDetailModal
          title={fmt(copy.detail.titleAnswer, {
            borrower: detail.borrower,
            label:
              set.fields.find((f) => f.id === detail.answer.questionId)?.label.toLowerCase() ?? '',
            value: detail.answer.value,
          })}
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
