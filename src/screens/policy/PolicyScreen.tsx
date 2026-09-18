/**
 * Policy search (`/crr/policy`, refinement round 2026-09-18): one searchbar
 * that takes a plain question OR a search term, primary Ask. A question
 * comes back as an answer card marked CAPABILITY PREVIEW (the answering
 * engine is future work — the seam is visible, the machinery arrives
 * later) with the governing clause quoted and cited. A term filters the
 * browse rows live. Browse: newest revision first. No family filter, no
 * standard-questions zone.
 */
import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { api } from '@/api'
import { usePolicyDocs } from '@/api/hooks'
import type { PolicyAnswer } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { useToast } from '@/components/toastContext'
import { fmt } from '@/lib/fmt'
import { strings } from '@/strings'
import { filterPolicies } from './policyFilter'

const s = strings.policy

export function PolicyScreen() {
  const docs = usePolicyDocs()
  const { toast } = useToast()
  const [term, setTerm] = useState('')
  const [answer, setAnswer] = useState<PolicyAnswer | null>(null)
  const ask = useMutation({
    mutationFn: (q: string) => api.askPolicies(q),
    onSuccess: setAnswer,
    onError: (e) => toast({ message: (e as Error).message, tone: 'error' }),
  })
  const rows = useMemo(() => filterPolicies(docs.data ?? [], term), [docs.data, term])

  return (
    <div className="settle mx-auto max-w-[680px]">
      <div>
        <p className="micro text-faint">{s.eyebrow}</p>
        <h1 className="mt-1 mb-1 font-display text-[1.25rem] font-semibold tracking-display">
          {s.title}
        </h1>
        <p className="mb-3.5 max-w-[56ch] text-ui-sm text-muted">{s.sub}</p>
      </div>

      <form
        className="mb-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault()
          if (term.trim()) ask.mutate(term)
        }}
      >
        <input
          type="search"
          aria-label={s.searchAria}
          placeholder={s.searchPlaceholder}
          value={term}
          onChange={(e) => setTerm(e.target.value)}
          className="min-w-0 flex-1 rounded-lg border border-rule-strong bg-bg px-3 py-[9px] text-[0.8125rem]"
        />
        <Button type="submit" variant="primary" small disabled={ask.isPending}>
          {s.ask}
        </Button>
      </form>

      {answer && (
        <div className="mb-4 rounded-xl border border-rule bg-bg px-4 py-3.5 shadow-sm">
          <div className="mb-2 flex items-center gap-2">
            <span className="micro">{s.answerLabel}</span>
            <Badge tone="neutral">{s.capabilityPreview}</Badge>
          </div>
          <p className="mb-2.5 text-[0.84375rem]">{answer.answer}</p>
          <blockquote className="mb-2 border-l-2 border-rule-strong pl-3 font-display text-[0.8125rem] text-ink italic">
            “{answer.quote}”
          </blockquote>
          <div className="flex items-center gap-2.5 text-dense text-muted">
            <span className="font-mono text-indigo">{answer.citation}</span>
            <span>{fmt(s.revised, { date: answer.revisedOn })}</span>
            <Button variant="link" onClick={() => toast({ message: s.viewNotReady })}>
              {s.viewPolicy}
            </Button>
          </div>
        </div>
      )}

      <div className="mb-2.5 flex items-baseline gap-2.5">
        <h3 className="font-display text-[1rem] font-semibold">{s.browseHeading}</h3>
        <span className="text-dense text-faint">{s.browseAside}</span>
      </div>
      {rows.length === 0 && <p className="text-ui-sm text-faint">{s.empty}</p>}
      {rows.map((d) => (
        <div
          key={d.id}
          className="mb-2 flex flex-wrap items-baseline gap-3 rounded-[10px] border border-rule bg-bg px-3.5 py-[11px]"
        >
          <span className="flex-none font-mono text-[0.75rem] text-indigo">{d.id}</span>
          <span className="min-w-[200px] flex-1 text-[0.8125rem] font-semibold">{d.title}</span>
          <span className="font-mono text-micro normal-case tracking-normal text-faint">
            {fmt(s.revised, { date: d.revisedOn })}
          </span>
          <Button variant="link" onClick={() => toast({ message: s.viewNotReady })}>
            {s.view}
          </Button>
        </div>
      ))}
      <p className="mt-[30px] border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
        {s.disclaimer}
      </p>
    </div>
  )
}
