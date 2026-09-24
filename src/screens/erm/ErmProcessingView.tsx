/**
 * The staged processing readout: population resolved → index current →
 * running N questions across M documents (progress) → computing. Crawl
 * bar, leave-and-it-lands-in-Runs, Cancel run (the run becomes
 * `cancelled` and stays in this application's Runs). A one-question run
 * (prompt-only; every Inquiry run) says so: "One-off question · …",
 * "Running the question across N documents". A borrower-scoped run names
 * the borrower as its scope.
 */
import { useNavigate } from 'react-router-dom'
import { usePortfolioMutations, useQuestionSets } from '@/api/hooks'
import type { ErmRun } from '@/api/types'
import { Button } from '@/components/Button'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { shelfOf, usePortfolioApp } from './portfolioApp'
import { scopeShort } from './runModel'

function Step({
  state,
  label,
  meta,
}: {
  state: 'done' | 'now' | 'todo'
  label: string
  meta?: string
}) {
  return (
    <div
      className={cx(
        'flex items-center gap-3 border-b border-rule py-[11px] text-[0.84375rem] last:border-b-0',
        state === 'todo' && 'text-faint',
      )}
    >
      <span
        className={cx(
          'grid h-[18px] w-[18px] flex-none place-items-center',
          state === 'done' && 'text-success',
        )}
      >
        {state === 'done' ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.4"
            aria-hidden="true"
          >
            <path d="m4 12.5 5 5L20 6.5" />
          </svg>
        ) : state === 'now' ? (
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            aria-hidden="true"
          >
            <circle cx="12" cy="12" r="9" strokeDasharray="14 8" />
          </svg>
        ) : (
          '○'
        )}
      </span>
      {label}
      {meta && <span className="ml-auto font-mono text-[0.75rem] text-faint">{meta}</span>}
    </div>
  )
}

export function ErmProcessingView({ run }: { run: ErmRun }) {
  const app = usePortfolioApp()
  const s = app.copy.processing
  const d = app.copy.documents
  const navigate = useNavigate()
  const m = usePortfolioMutations(app.id)
  const sets = useQuestionSets(run.questionSetId ? shelfOf(app) : null)
  const set = sets.data?.find((q) => q.id === run.questionSetId)
  // a prompt-only run asks exactly one question
  const single = !run.questionSetId
  const qTotal = single ? 1 : (set?.fields.length ?? 17)
  const p = run.progress
  const scope = scopeShort(run.criteria, app.copy.start.borrowerScope)
  const borrowers = plural(
    run.population.included.length,
    app.copy.start.borrowersOne,
    app.copy.start.borrowersOther,
  )
  const documents = plural(run.documents.length, d.docsOne, d.docsOther)

  async function cancel() {
    await m.cancelRun.mutateAsync(run.runId)
    navigate(`${app.base}/runs`)
  }

  return (
    <div className="settle mx-auto mt-10 max-w-[640px]">
      <div>
        <h1 className="font-display text-[1.375rem] font-semibold tracking-display">{s.title}</h1>
        <p className="mb-4 text-ui-sm text-muted">
          {single
            ? fmt(s.subSingle, { scope, borrowers, documents })
            : fmt(s.sub, {
                set: set?.name ?? run.questionSetId ?? '',
                questions: qTotal,
                scope,
                borrowers,
                documents,
              })}
        </p>
      </div>
      <div className="mb-1.5 h-[5px] overflow-hidden rounded-full bg-rule">
        <i className="block h-full w-[58%] animate-[crawl_8s_ease_forwards] rounded-full bg-ink-soft" />
      </div>
      <div className="mb-4 flex items-center gap-3.5">
        <p className="flex-1 text-dense text-faint">{s.leave}</p>
        <Button variant="outline" small disabled={m.cancelRun.isPending} onClick={cancel}>
          {s.cancel}
        </Button>
      </div>
      <div>
        <Step
          state={p?.populationResolved ? 'done' : 'now'}
          label={s.stepPopulation}
          meta={fmt(s.stepPopulationMeta, { borrowers, documents })}
        />
        <Step
          state={p?.indexCurrent ? 'done' : p?.populationResolved ? 'now' : 'todo'}
          label={s.stepIndex}
          meta={s.stepIndexMeta}
        />
        <Step
          state={p?.computing ? 'done' : p?.indexCurrent ? 'now' : 'todo'}
          label={
            single
              ? fmt(s.stepQuestionSingle, { documents })
              : fmt(s.stepQuestions, { questions: qTotal, documents: run.documents.length })
          }
          meta={fmt(s.stepQuestionsMeta, {
            done: p?.documentsDone ?? 0,
            total: run.documents.length,
          })}
        />
        <Step state={p?.computing ? 'now' : 'todo'} label={s.stepComputing} />
      </div>
    </div>
  )
}
