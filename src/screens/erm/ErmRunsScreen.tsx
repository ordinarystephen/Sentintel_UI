/**
 * Runs — every analysis, kept (concept pin E10): newest first, each a
 * frozen revisitable record — when, question set + count, scope line,
 * grade-count chips, honest state, View results.
 */
import { Link } from 'react-router-dom'
import { useQuestionSets, useRuns } from '@/api/hooks'
import { Badge } from '@/components/Badge'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'
import { GradeCountChips } from './ErmResultsView'

const s = strings.erm.runs
const d = strings.erm.documents

const sameDay = (iso: string) => new Date(iso).toDateString() === new Date().toDateString()
const formatWhen = (iso: string) => {
  const t = new Date(iso)
  const hm = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  return sameDay(iso) ? fmt(s.today, { time: hm }) : `${iso.slice(0, 10)} ${hm}`
}

export function ErmRunsScreen() {
  const runs = useRuns()
  const sets = useQuestionSets()
  const setOf = (id: string) => sets.data?.find((q) => q.id === id)
  return (
    <div className="settle">
      <div>
        <h1 className="font-display text-[1.375rem] font-semibold tracking-display">{s.title}</h1>
        <p className="mb-5 max-w-[56ch] text-ui-sm text-muted">{s.sub}</p>
      </div>
      <div>
        {(runs.data ?? []).map((r) => {
          const set = setOf(r.questionSetId)
          return (
            <div
              key={r.runId}
              className="mb-2.5 flex flex-wrap items-center gap-3.5 rounded-[10px] border border-rule bg-bg px-4 py-3"
            >
              <span className="w-[130px] flex-none font-mono text-[0.75rem] text-muted">
                {formatWhen(r.startedAt)}
              </span>
              <span className="min-w-[200px] flex-1">
                <span className="font-semibold">{set?.name ?? r.questionSetId}</span>
                {set && (
                  <span>
                    {' '}
                    ·{' '}
                    {plural(
                      set.fields.length,
                      strings.erm.results.questionsOne,
                      strings.erm.results.questionsOther,
                    )}
                  </span>
                )}
                <br />
                <span className="text-[0.75rem] text-muted">
                  {fmt(s.scopeLine, {
                    criteria: `${r.criteria.portfolio} · ${r.criteria.subPortfolio.toLowerCase()} · ${r.criteria.region.toLowerCase()}`,
                    borrowers: plural(
                      r.population.included.length,
                      strings.erm.start.borrowersOne,
                      strings.erm.start.borrowersOther,
                    ),
                    documents: plural(r.documents.length, d.docsOne, d.docsOther),
                  })}
                </span>
              </span>
              {r.state === 'cancelled' ? (
                <Badge tone="neutral">{s.stateCancelled}</Badge>
              ) : r.state === 'failed' ? (
                <Badge tone="amber">{s.stateFailed}</Badge>
              ) : r.state === 'completed' ? (
                <GradeCountChips answers={r.answers} />
              ) : (
                <Badge tone="neutral">{s.stateRunning}</Badge>
              )}
              <Link
                to={`/erm/runs/${r.runId}`}
                className="rounded-md border border-rule-strong bg-bg px-[11px] py-[5px] text-[0.75rem] font-medium hover:bg-bg-hover"
              >
                {s.viewResults}
              </Link>
            </div>
          )
        })}
        {runs.data?.length === 0 && <p className="text-ui-sm text-faint">{s.empty}</p>}
      </div>
      <p className="mt-[30px] border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
        {strings.suite.fictionalNote}
      </p>
    </div>
  )
}
