/**
 * The per-answer verification modal — the platform's shared verification
 * surface (concept pin E4: "same evidence, everywhere"; built shared for
 * ERM now, Vantage and CRR next). Provenance strip (mono doc name, conf,
 * context chip), the answer, rationale cards (the LABEL set is
 * per-application config, passed in), evidence quotes with View source
 * chaining the source-image modal (three-tier honest fallback lives
 * there), and a limitations strip. Escape closes the top-most modal only
 * (Modal's dialog stack).
 */
import { useState } from 'react'
import type { AnswerEvidenceRef, ErmAnswer, Evidence } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { SourceModal } from '@/components/viewers/SourceModal'
import { cx } from '@/lib/cx'
import { fmt } from '@/lib/fmt'
import { strings } from '@/strings'

const s = strings.erm.detail

function toEvidence(ref: AnswerEvidenceRef): Evidence {
  return {
    quote: ref.quote,
    sourceDoc: ref.fileName,
    sectionName: ref.sectionName,
    page: ref.page,
    imageKind: ref.imageKind === 'page' ? 'page' : 'section',
    imageRef: ref.imageKind === 'none' ? undefined : ref.imageRef,
  }
}

export function GradeChip({ grade }: { grade: ErmAnswer['grade'] }) {
  return (
    <span
      className={cx(
        'rounded border px-[5px] text-[0.625rem]',
        grade === 'unsupported'
          ? 'border-warn-line bg-warn-bg text-warn'
          : 'border-rule-strong bg-bg text-muted',
      )}
    >
      {grade}
    </span>
  )
}

export function AnswerDetailModal({
  title,
  answer,
  rationaleCards,
  onClose,
}: {
  title: string
  answer: ErmAnswer
  /** Per-application card labels + per-answer texts, in render order. */
  rationaleCards: Array<{ label: string; text: string }>
  onClose: () => void
}) {
  const [source, setSource] = useState<Evidence | null>(null)
  const primary = answer.evidenceRefs[0]
  return (
    <Modal title={title} closeLabel={s.close} onClose={onClose}>
      <div className="mb-3.5 flex flex-wrap items-center gap-2 text-dense text-muted">
        {primary && <span className="font-mono text-[0.75rem]">{primary.fileName}</span>}
        <Badge tone={answer.conf === 'high' ? 'neutral' : 'amber'}>
          {fmt(s.confidence, {
            level:
              strings.erm.results[
                answer.conf === 'high'
                  ? 'confHigh'
                  : answer.conf === 'medium'
                    ? 'confMedium'
                    : 'confLow'
              ],
          })}
        </Badge>
        <span title={s.contextTitle}>
          <Badge tone="neutral">{s.context}</Badge>
        </span>
        <GradeChip grade={answer.grade} />
      </div>

      <p className="micro mb-1.5">{s.answer}</p>
      <p className="mb-3.5 text-[0.875rem]">{answer.value}</p>

      {rationaleCards.length > 0 && (
        <>
          <p className="micro mb-1.5">{s.rationale}</p>
          {rationaleCards.map((c) => (
            <div
              key={c.label}
              className="mb-2 rounded-lg border border-rule bg-bg-subtle px-[13px] py-[11px]"
            >
              <div className="text-micro font-bold text-ink">{c.label}</div>
              <p className="mt-0.5 text-ui-sm text-ink-soft normal-case">{c.text}</p>
            </div>
          ))}
        </>
      )}

      {answer.evidenceRefs.length > 0 && (
        <>
          <p className="micro mb-1.5">{fmt(s.evidence, { n: answer.evidenceRefs.length })}</p>
          {answer.evidenceRefs.map((ev, i) => (
            <div
              key={i}
              className="mb-2 rounded-lg border border-rule bg-bg-subtle px-[13px] py-[11px]"
            >
              <div className="mb-1.5 flex items-center gap-2 text-dense">
                <span className="rounded bg-bg px-[7px] font-semibold">{ev.sectionName}</span>
                <span className="font-mono text-micro normal-case tracking-normal text-muted">
                  p. {ev.page}
                </span>
              </div>
              <blockquote className="max-h-24 overflow-y-auto border-l-2 border-rule-strong pl-3 font-display text-[0.8125rem] text-ink italic">
                “{ev.quote}”
              </blockquote>
              <div className="mt-2 flex items-center text-dense text-muted">
                <span className="ml-auto">
                  <Button variant="link" onClick={() => setSource(toEvidence(ev))}>
                    {s.viewSource}
                  </Button>
                </span>
              </div>
            </div>
          ))}
        </>
      )}

      {answer.limitations && (
        <p className="mt-3 text-dense text-muted">
          <b className="text-micro font-bold text-warn">{s.limitations}</b> — {answer.limitations}
        </p>
      )}

      {source && <SourceModal evidence={source} onClose={() => setSource(null)} />}
    </Modal>
  )
}
