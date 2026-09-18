/**
 * `/vantage/runs/:runId` — one URL, every state: running renders the
 * processing view AT ITS URL (refresh lands here; the mock advances on
 * elapsed time), completed renders the answer, cancelled says so.
 */
import { useNavigate, useParams } from 'react-router-dom'
import { useVantageMutations, useVantageRun } from '@/api/hooks'
import type { VantageRun } from '@/api/types'
import { Button } from '@/components/Button'
import { strings } from '@/strings'
import { VantageAnswerView } from './VantageAnswerView'

const s = strings.vantage.processing

export function VantageRunScreen() {
  const { runId = '' } = useParams()
  const q = useVantageRun(runId)
  if (!q.data) return null
  const run = q.data
  if (run.state === 'queued' || run.state === 'running') return <ProcessingView run={run} />
  return <VantageAnswerView run={run} />
}

function ProcessingView({ run }: { run: VantageRun }) {
  const navigate = useNavigate()
  const m = useVantageMutations()
  const total = run.documents.length + 1
  const done = (run.progress?.docsRead ?? 0) + (run.progress?.answering ? 0.6 : 0)
  const pct = Math.min(94, Math.round((done / total) * 100) + 6)

  async function cancel() {
    await m.cancel.mutateAsync(run.runId)
    navigate('/vantage/runs')
  }

  return (
    <div className="settle mx-auto mt-20 max-w-[560px] text-center">
      <p className="mb-[18px] font-mono text-dense leading-[1.8] text-faint">
        {run.documents.map((d) => d.name).join(' · ')}
      </p>
      <h2 className="mb-[18px] font-display text-[1.3125rem] font-semibold">{s.title}</h2>
      <div className="mb-3 h-1 overflow-hidden rounded-full bg-rule">
        <span
          className="block h-full rounded-full bg-ink-soft transition-[width] duration-1000 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
      <p className="min-h-5 text-[0.78125rem] text-muted" aria-live="polite">
        {run.progress?.statusLine}
      </p>
      <p className="mt-[26px] text-[0.78125rem] leading-[1.7] text-faint">{s.leave}</p>
      <div className="mt-3.5">
        <Button variant="quiet" disabled={m.cancel.isPending} onClick={cancel}>
          {s.cancel}
        </Button>
      </div>
    </div>
  )
}
