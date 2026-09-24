/**
 * Results — CPEA's Portfolio monitor and Inquiry's Results, ONE screen
 * (concept pins E1/E8/E9/E12/E13; I3). Summary card (grade counts computed
 * from the answer store — grades live only on answers), the population
 * disclosure ("why these borrowers" — a borrower-scoped run names the
 * borrower as its criterion), exports (contract open — quiet notice), and
 * the sticky scroll-to-top. THE SHAPE SWITCH (v1.8): a run with exactly
 * one question renders the single-question shape (SingleQuestionTable, no
 * group-by toggle); more than one renders the group-by toggle (two cuts
 * of ONE answer store) over the monitor table — untouched.
 */
import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuestionSets } from '@/api/hooks'
import type { ErmAnswer, ErmRun, QuestionSet } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { useToast } from '@/components/toastContext'
import { flagCount, gradeCounts } from '@/lib/ermModel'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'
import { ErmMonitorTable } from './ErmMonitorTable'
import { shelfOf, usePortfolioApp } from './portfolioApp'
import { isSingleQuestion, runQuestions, scopeShort } from './runModel'
import { SingleQuestionTable } from './SingleQuestionTable'

const s = strings.erm.results

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

export function GradeCountChips({ answers }: { answers: readonly ErmAnswer[] }) {
  const c = gradeCounts(answers)
  // every answer grounded by a quote: say so once, rather than "N stated"
  if (answers.length > 0 && c.stated === answers.length)
    return <Badge tone="neutral">{s.allStated}</Badge>
  return (
    <>
      {c.stated > 0 && <Badge tone="neutral">{fmt(s.chipStated, { n: c.stated })}</Badge>}
      {c.derived > 0 && <Badge tone="neutral">{fmt(s.chipDerived, { n: c.derived })}</Badge>}
      {c.unsupported > 0 && (
        <Badge tone="amber">{fmt(s.chipUnsupported, { n: c.unsupported })}</Badge>
      )}
    </>
  )
}

function QuestionView({ run, set }: { run: ErmRun; set: QuestionSet }) {
  const names = new Map(run.population.included.map((b) => [b.rxm, b.name]))
  return (
    <div>
      {set.fields.map((f, i) => (
        <div key={f.id} className="mb-3 overflow-hidden rounded-xl border border-rule bg-bg">
          <div className="flex items-baseline gap-2.5 border-b border-rule px-4 py-3 font-display text-[0.90625rem] font-semibold">
            {f.question}
            <span className="font-body font-normal">
              <span className="font-mono text-[0.75rem] text-faint">
                {fmt(s.qBlockIndex, { n: i + 1, total: set.fields.length })}
              </span>
            </span>
          </div>
          {run.answers
            .filter((a) => a.questionId === f.id)
            .map((a) => (
              <div
                key={a.rxm}
                className="flex items-center gap-3 border-b border-rule px-4 py-[9px] text-[0.8125rem] last:border-b-0"
              >
                <span
                  className={cx(
                    'rounded border px-[5px] text-[0.625rem]',
                    a.grade === 'unsupported'
                      ? 'border-warn-line bg-warn-bg text-warn'
                      : 'border-rule-strong bg-bg text-muted',
                  )}
                >
                  {a.grade}
                </span>
                <span className="w-[220px] flex-none font-semibold">{names.get(a.rxm)}</span>
                <span className="min-w-0 flex-1 truncate text-ink-soft">{a.value}</span>
              </div>
            ))}
        </div>
      ))}
      <p className="text-dense text-faint">{s.qMoreNote}</p>
    </div>
  )
}

export function ErmResultsView({ run }: { run: ErmRun }) {
  const app = usePortfolioApp()
  const copy = app.copy.results
  const navigate = useNavigate()
  const { toast } = useToast()
  const sets = useQuestionSets(run.questionSetId ? shelfOf(app) : null)
  const set = sets.data?.find((q) => q.id === run.questionSetId)
  const questions = runQuestions(run, set, s.colAnswer)
  const [view, setView] = useState<'borrower' | 'question'>('borrower')
  const pop = run.population
  const cancelled = run.state === 'cancelled' || run.state === 'failed'

  const attention = useMemo(() => {
    if (!questions || run.answers.length === 0) return null
    let worst: { name: string; flags: number } | null = null
    for (const b of pop.included) {
      const f = flagCount(run.answers, b.rxm)
      if (f > 0 && (!worst || f > worst.flags)) worst = { name: b.name, flags: f }
    }
    return worst
  }, [run.answers, pop.included, questions])

  if (!questions) return null
  const single = isSingleQuestion(questions)
  const scope = scopeShort(run.criteria, app.copy.start.borrowerScope)
  const questionCount = plural(questions.length, s.questionsOne, s.questionsOther)
  const stateLabel =
    run.state === 'cancelled'
      ? s.stateCancelled
      : run.state === 'failed'
        ? s.stateFailed
        : s.stateCompleted

  return (
    <div className="settle">
      <div>
        <h1 className="font-display text-[1.375rem] font-semibold tracking-display">
          {copy.title}
        </h1>
        <p className="mb-3.5 max-w-[70ch] text-ui-sm text-muted">
          {single
            ? fmt(s.subSingle, {
                state: stateLabel,
                time: formatTime(run.cancelledAt ?? run.startedAt),
                scope,
              })
            : fmt(s.sub, {
                state: stateLabel,
                time: formatTime(run.cancelledAt ?? run.startedAt),
                set: set?.name ?? '',
                portfolio: scope,
              })}
        </p>
      </div>

      <div className="mb-3.5 flex flex-wrap items-center gap-2">
        <Button variant="outline" small onClick={() => navigate(app.base)}>
          {s.newAnalysis}
        </Button>
        <span className="flex-1" />
        <Button variant="outline" small onClick={() => toast({ message: s.exportNotReady })}>
          {s.exportExcel}
        </Button>
        <Button variant="outline" small onClick={() => toast({ message: s.exportNotReady })}>
          {s.exportWord}
        </Button>
      </div>

      <div className="mb-4 rounded-xl border border-rule bg-bg-subtle px-[18px] py-4">
        <div className="mb-2.5 flex flex-wrap items-center gap-3.5 text-[0.8125rem]">
          <b className="font-display text-[0.9375rem]">{s.summary}</b>
          {set ? (
            <Badge tone="indigo">
              {fmt(s.setChip, { name: set.name, questions: questionCount })}
            </Badge>
          ) : (
            <>
              <Badge tone="indigo">{s.oneOffChip}</Badge>
              <span className="font-display text-[0.8125rem] text-ink-soft italic">
                {fmt(s.quotedQuestion, { question: questions[0].question })}
              </span>
            </>
          )}
          <span className="font-mono text-micro normal-case tracking-normal text-faint">
            {fmt(s.runLine, {
              time: formatTime(run.startedAt),
              portfolio: scope,
              asOf: run.criteria.borrower ? s.borrowerAsOf : run.criteria.asOf.toLowerCase(),
            })}
          </span>
        </div>
        {cancelled ? (
          <p className="text-ui-sm text-muted">{s.cancelledNote}</p>
        ) : (
          <div className="flex flex-wrap items-center gap-2 text-[0.78125rem]">
            <span>
              {fmt(s.countsLine, {
                borrowers: plural(
                  pop.included.length,
                  strings.erm.start.borrowersOne,
                  strings.erm.start.borrowersOther,
                ),
                documents: plural(
                  run.documents.length,
                  strings.erm.documents.docsOne,
                  strings.erm.documents.docsOther,
                ),
                questions: questionCount,
                answers: plural(run.answers.length, s.answersOne, s.answersOther),
              })}
            </span>
            <GradeCountChips answers={run.answers} />
            {attention && (
              <span className="text-muted">
                {s.attention}
                <b>{attention.name}</b>
                {' — '}
                {(single
                  ? fmt(s.attentionSingle, { name: '' })
                  : fmt(s.attentionLine, {
                      name: '',
                      flags: attention.flags,
                      total: questions.length,
                    })
                ).replace(/^ — /, '')}
              </span>
            )}
          </div>
        )}
        <PopulationDisclosure run={run} />
      </div>

      {!cancelled && single && <SingleQuestionTable run={run} field={questions[0]} />}

      {!cancelled && !single && set && (
        <>
          <div className="mb-2.5 flex items-center gap-2">
            <div
              role="tablist"
              aria-label={s.groupByAria}
              className="inline-flex gap-0.5 rounded-lg bg-bg-subtle p-0.5"
            >
              {(
                [
                  ['borrower', s.byBorrower],
                  ['question', s.byQuestion],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={view === id}
                  onClick={() => setView(id)}
                  className={cx(
                    'rounded-md px-[13px] py-[5px] text-[0.75rem] text-muted',
                    view === id && 'bg-bg font-medium text-ink shadow-sm',
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          {view === 'borrower' ? (
            <ErmMonitorTable run={run} set={set} />
          ) : (
            <QuestionView run={run} set={set} />
          )}
        </>
      )}

      <div className="pointer-events-none sticky bottom-3.5 flex justify-end">
        <button
          type="button"
          onClick={() =>
            document.getElementById('canvas')?.scrollTo({ top: 0, behavior: 'smooth' })
          }
          className="pointer-events-auto inline-flex items-center gap-1.5 rounded-full border border-rule-strong bg-bg px-3.5 py-1.5 text-[0.75rem] text-muted shadow-sm hover:bg-bg-hover hover:text-ink"
        >
          <svg
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
          >
            <path d="M12 19V5m0 0-6 6m6-6 6 6" />
          </svg>
          {s.toTop}
        </button>
      </div>
      <p className="mt-[30px] border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
        {strings.suite.fictionalNote}
      </p>
    </div>
  )
}

function PopulationDisclosure({ run }: { run: ErmRun }) {
  const [open, setOpen] = useState(false)
  const pop = run.population
  return (
    <div className="mt-3 border-t border-rule pt-2.5">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="flex items-baseline gap-2.5 text-[0.78125rem] font-semibold"
      >
        <span className="text-[0.625rem] text-faint">{open ? '▾' : '▸'}</span>
        {s.popSummary}
        <span className="font-mono text-micro font-normal normal-case tracking-normal text-faint">
          {fmt(s.popCounts, {
            included: pop.included.length,
            excluded: pop.excluded.length,
            indeterminate: pop.indeterminate.length,
          })}
        </span>
      </button>
      {open && (
        <div className="mt-2">
          <div className="text-[0.78125rem] text-muted">
            {pop.criteria.borrower
              ? fmt(s.popCriteriaBorrower, {
                  name: pop.criteria.borrower.name,
                  rxm: pop.criteria.borrower.rxm,
                })
              : fmt(s.popCriteria, {
                  portfolio: pop.criteria.portfolio,
                  sub: pop.criteria.subPortfolio.toLowerCase(),
                  region: pop.criteria.region.toLowerCase(),
                  asOf: pop.criteria.asOf.toLowerCase(),
                })}
          </div>
          <div className="mt-1.5">
            {pop.excluded.map((e) => (
              <div
                key={e.ref.rxm}
                className="flex flex-wrap items-baseline gap-2.5 border-t border-rule py-[7px] text-[0.78125rem] first:border-t-0"
              >
                <span className="font-semibold">{e.ref.name}</span>
                <span className="font-mono text-[0.75rem]">{e.ref.rxm}</span>
                <span className="text-muted">{e.reason}</span>
              </div>
            ))}
            {pop.indeterminate.map((e) => (
              <div
                key={e.ref.rxm}
                className="flex flex-wrap items-baseline gap-2.5 border-t border-rule py-[7px] text-[0.78125rem]"
              >
                <span className="font-semibold">{e.ref.name}</span>
                <span className="font-mono text-[0.75rem]">{e.ref.rxm}</span>
                <span className="text-warn">{e.reason}</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
