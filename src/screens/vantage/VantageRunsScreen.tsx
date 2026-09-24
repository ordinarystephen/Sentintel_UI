/**
 * Runs — every question asked, frozen (concept pin V10): serif question
 * (a many-question run leads with its first), when, question-count and
 * document-count chips, honest state badge; row click revisits.
 */
import { useNavigate } from 'react-router-dom'
import { useVantageRuns } from '@/api/hooks'
import { Badge } from '@/components/Badge'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'

const s = strings.vantage.runs

const formatWhen = (iso: string) => {
  const t = new Date(iso)
  const today = new Date()
  const hm = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  if (t.toDateString() === today.toDateString()) return fmt(s.today, { time: hm })
  const yesterday = new Date(today.getTime() - 86_400_000)
  if (t.toDateString() === yesterday.toDateString()) return s.yesterday
  return iso.slice(0, 10)
}

export function VantageRunsScreen() {
  const navigate = useNavigate()
  const runs = useVantageRuns()
  return (
    <div className="settle">
      <div>
        <h1 className="font-display text-[1.375rem] font-semibold tracking-display">{s.title}</h1>
        <p className="mb-5 max-w-[56ch] text-ui-sm text-muted">{s.sub}</p>
      </div>
      <div>
        {(runs.data ?? []).map((r) => (
          <button
            key={r.runId}
            type="button"
            onClick={() => navigate(`/vantage/runs/${r.runId}`)}
            className="mb-2 flex w-full flex-wrap items-center gap-3.5 rounded-[10px] border border-rule bg-bg px-4 py-[13px] text-left transition-colors hover:bg-bg-hover"
          >
            <span className="min-w-[260px] flex-1 font-display text-[0.90625rem] font-semibold">
              {r.questions[0]}
            </span>
            <span className="flex flex-none flex-wrap items-center gap-2.5 text-dense text-muted">
              <span>{formatWhen(r.startedAt)}</span>
              <Badge tone="neutral">
                {plural(r.questions.length, s.questionsChipOne, s.questionsChipOther)}
              </Badge>
              <Badge tone="neutral">
                {plural(r.documents.length, s.docsChipOne, s.docsChipOther)}
              </Badge>
              {r.state === 'completed' ? (
                <Badge tone="green">{s.answered}</Badge>
              ) : r.state === 'cancelled' ? (
                <Badge tone="neutral">{s.cancelled}</Badge>
              ) : r.state === 'failed' ? (
                <Badge tone="amber">{s.failed}</Badge>
              ) : (
                <Badge tone="neutral">{s.running}</Badge>
              )}
            </span>
          </button>
        ))}
        {runs.data?.length === 0 && <p className="text-ui-sm text-faint">{s.empty}</p>}
      </div>
      <p className="mt-[30px] border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
        {strings.suite.fictionalNote}
      </p>
    </div>
  )
}
