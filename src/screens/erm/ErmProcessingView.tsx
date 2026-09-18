/**
 * The staged processing readout: population resolved → index current →
 * running N questions across M documents (progress) → computing. Crawl
 * bar, leave-and-it-lands-in-Runs, Cancel run (the run becomes
 * `cancelled` and stays in Runs).
 */
import { useNavigate } from 'react-router-dom'
import { useQuestionSets, useErmMutations } from '@/api/hooks'
import type { ErmRun } from '@/api/types'
import { Button } from '@/components/Button'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'

const s = strings.erm.processing
const d = strings.erm.documents

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
  const navigate = useNavigate()
  const m = useErmMutations()
  const sets = useQuestionSets()
  const set = sets.data?.find((q) => q.id === run.questionSetId)
  const qTotal = set?.fields.length ?? 17
  const p = run.progress
  const borrowers = plural(
    run.population.included.length,
    strings.erm.start.borrowersOne,
    strings.erm.start.borrowersOther,
  )
  const documents = plural(run.documents.length, d.docsOne, d.docsOther)

  async function cancel() {
    await m.cancelRun.mutateAsync(run.runId)
    navigate('/erm/runs')
  }

  return (
    <div className="settle mx-auto mt-10 max-w-[640px]">
      <div>
        <h1 className="font-display text-[1.375rem] font-semibold tracking-display">{s.title}</h1>
        <p className="mb-4 text-ui-sm text-muted">
          {fmt(s.sub, {
            set: set?.name ?? run.questionSetId,
            questions: qTotal,
            scope: run.criteria.portfolio,
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
          label={fmt(s.stepQuestions, { questions: qTotal, documents: run.documents.length })}
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
