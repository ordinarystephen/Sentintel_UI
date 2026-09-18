/**
 * The answer surface: restated serif question, docset chips, the block
 * renderer, and the follow-up bar — which starts a NEW run against the
 * same docset; no context carried, and the note says so.
 */
import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useVantageMutations } from '@/api/hooks'
import type { VantageRun } from '@/api/types'
import { Button } from '@/components/Button'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'
import { BlockRenderer } from './BlockRenderer'

const s = strings.vantage.answer

const formatWhen = (iso: string) => {
  const t = new Date(iso)
  const hm = t.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })
  return t.toDateString() === new Date().toDateString()
    ? fmt(strings.vantage.runs.today, { time: hm })
    : `${iso.slice(0, 10)} ${hm}`
}

export function VantageAnswerView({ run }: { run: VantageRun }) {
  const navigate = useNavigate()
  const m = useVantageMutations()
  const [followup, setFollowup] = useState('')

  async function askFollowup() {
    if (!followup.trim()) return
    const { runId } = await m.ask.mutateAsync({ question: followup, documents: run.documents })
    setFollowup('')
    navigate(`/vantage/runs/${runId}`)
  }

  return (
    <div className="settle">
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <Button variant="outline" small onClick={() => navigate('/vantage')}>
          {s.newQuestion}
        </Button>
        <span className="ml-auto text-[0.75rem] text-faint">
          {fmt(s.runLine, { when: formatWhen(run.startedAt) })}{' '}
          <Link to="/vantage/runs" className="text-muted underline underline-offset-2">
            {s.viewInRuns}
          </Link>
        </span>
      </div>

      <div>
        <p className="micro mb-1.5">{s.eyebrow}</p>
        <h1 className="mb-2.5 max-w-[44ch] font-display text-[1.25rem] leading-[1.35] font-semibold tracking-[-0.01em]">
          {run.question}
        </h1>
      </div>
      <div className="mb-[26px] flex flex-wrap gap-1.5">
        {run.documents.map((d) => (
          <span
            key={d.name}
            className="inline-flex items-center gap-1.5 rounded-full border border-rule bg-bg-subtle px-2.5 py-0.5 font-mono text-[0.6875rem] text-ink-soft"
          >
            <span className="font-body text-[0.625rem] font-bold tracking-[0.08em] text-faint uppercase">
              {d.kind}
            </span>
            {d.name}
          </span>
        ))}
      </div>

      {run.state === 'cancelled' || run.state === 'failed' ? (
        <p className="max-w-[62ch] rounded-[10px] border border-rule bg-bg-subtle px-4 py-3 text-ui-sm text-muted">
          {s.cancelledNote}
        </p>
      ) : (
        <BlockRenderer blocks={run.blocks} />
      )}

      <div className="mt-[30px] max-w-[640px]">
        <form
          className="flex items-center gap-2 rounded-[10px] border border-rule-strong bg-bg py-2 pr-2 pl-3.5"
          onSubmit={(e) => {
            e.preventDefault()
            void askFollowup()
          }}
        >
          <input
            type="text"
            aria-label={s.followupAria}
            placeholder={s.followupPlaceholder}
            value={followup}
            onChange={(e) => setFollowup(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[0.8125rem] outline-none"
          />
          <Button type="submit" variant="primary" small disabled={m.ask.isPending}>
            {s.followupAsk}
          </Button>
        </form>
        <p className="mt-2 text-dense text-faint">
          {fmt(s.followupNote, {
            documents: plural(run.documents.length, s.docOne, s.docOther),
          })}
        </p>
      </div>
      <p className="mt-[30px] border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
        {strings.suite.fictionalNote}
      </p>
    </div>
  )
}
