/**
 * One workpaper item (build-spec §5.3 #5): name, resolved-via badge, mono page
 * ref, confidence chip, then content — prose (~64ch), key-values in tabular
 * numerals, evidence quotes with the page ON the quote line + "View source".
 * The low-confidence item carries the amber stripe, the "⚠ review required"
 * chip and the explanation line — exactly what the export will flag, from the
 * same floor. Assessment factors render inline with the honesty pattern.
 *
 * Click (or Enter/Space) selects the item for the right rail: subtle fill +
 * accent inset stripe, exactly one selected. Cleared items are struck in
 * place with the rationale chip and an undo; the export omits them.
 */
import type { KeyboardEvent, MouseEvent } from 'react'
import type { Evidence, WorkItem } from '@/api/types'
import { useShell } from '@/app/ShellContext'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { ConfChip } from '@/components/ConfChip'
import { Pill } from '@/components/Pill'
import { Spinner } from '@/components/Spinner'
import { ViaBadge } from '@/components/ViaBadge'
import { cx } from '@/lib/cx'
import { strings } from '@/strings'
import { isFlagged } from './itemState'
import { useReviewScreen } from './reviewContext'

export function WorkItemView({
  item,
  floor,
  onViewSource,
}: {
  item: WorkItem
  floor: number
  onViewSource: (e: Evidence) => void
}) {
  const s = strings.review
  const { selectedItemId, setSelectedItemId } = useShell()
  const { canEdit, actions } = useReviewScreen()
  const flagged = isFlagged(item)
  const struck = !!item.cleared
  const factor = item.factor
  const selected = selectedItemId === item.id

  function select(e: MouseEvent | KeyboardEvent) {
    // Controls inside the item keep their own behaviour; anything else selects.
    if ((e.target as HTMLElement).closest('button, a, summary, details')) return
    setSelectedItemId(item.id)
  }

  return (
    <div
      id={item.id}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={`${strings.rail.selectItem}: ${item.name}`}
      onClick={select}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          if ((e.target as HTMLElement) !== e.currentTarget) return
          e.preventDefault()
          setSelectedItemId(item.id)
        }
      }}
      className={cx(
        'cursor-default py-[11px] outline-offset-0',
        (flagged || selected) && 'pl-[13px]',
        selected && 'rounded-r-lg bg-bg-subtle',
        selected && !flagged && 'shadow-[inset_2px_0_0_var(--indigo)]',
        flagged && 'shadow-[inset_2px_0_0_var(--warn)]',
        struck && 'opacity-45',
      )}
    >
      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <span className={cx('text-ui-sm font-semibold', factor && 'font-mono text-ui')}>
          {item.name}
        </span>
        {factor ? (
          factor.verdictState === 'stubbed' && <Pill tone="todo">{s.reasoningStubbed}</Pill>
        ) : (
          <ViaBadge via={item.via} label={item.viaLabel} />
        )}
        {item.page !== undefined && (
          <span className="font-mono text-micro text-faint">p. {item.page}</span>
        )}
        {item.confidence !== undefined && !factor && (
          <ConfChip confidence={item.confidence} floor={floor} />
        )}
        {flagged && <Chip>{s.reviewRequiredMark}</Chip>}
        {item.verifiedAt && <Chip tone="neutral">{s.verified}</Chip>}
        {item.reRunning && (
          <span className="inline-flex items-center gap-1.5 text-micro text-muted">
            <Spinner /> {s.reRunning}
          </span>
        )}
      </div>

      <div className={cx(struck && 'line-through')}>
        {factor ? (
          <>
            <p className="text-[12px] text-muted">{factor.question}</p>
            <div className="my-1 mb-1.5 text-ui-sm text-ink-soft">{s.verdict(factor.verdict)}</div>
            <details className="group">
              <summary className="inline-flex cursor-pointer list-none items-center gap-1.5 text-dense text-indigo before:text-[9px] before:content-['▸'] group-open:before:rotate-90">
                {s.snippets(factor.snippets.length)}
              </summary>
              <ol className="mt-2 ml-[18px] flex max-h-[180px] list-decimal flex-col gap-1.5 overflow-auto font-mono text-micro whitespace-pre-wrap text-ink-soft">
                {factor.snippets.map((sn, i) => (
                  <li key={i}>{sn}</li>
                ))}
              </ol>
            </details>
          </>
        ) : item.via === 'unresolved' ? (
          <p className="text-ui-sm text-warn">{s.unresolvedText}</p>
        ) : item.content.kind === 'prose' ? (
          <p className="max-w-[64ch] text-ui-sm leading-[1.6] text-ink-soft">{item.content.text}</p>
        ) : item.content.kind === 'quote' ? (
          <p className="font-display text-ui text-ink-soft italic">
            “{item.content.text}”
            {item.content.page !== undefined && (
              <span className="ml-2 font-mono text-micro not-italic text-faint">
                p. {item.content.page}
              </span>
            )}
          </p>
        ) : (
          <div className="text-ui-sm text-ink-soft">
            {item.content.entries.map((e, i) => (
              <span key={i}>
                {i > 0 && <span className="mx-2 text-faint">·</span>}
                {e.label && <b className="font-semibold text-ink">{e.label}: </b>}
                <b className="font-semibold text-ink tabular-nums">{e.value}</b>
                {e.note && <span className="text-muted"> — {e.note}</span>}
              </span>
            ))}
          </div>
        )}
      </div>

      {flagged && (
        <div className="mt-2 flex flex-wrap items-center gap-2 text-dense text-warn">
          {s.flagLine}
          {item.evidence[0] && (
            <Button variant="link" onClick={() => onViewSource(item.evidence[0])}>
              {s.viewSource}
            </Button>
          )}
          {canEdit && (
            <Button
              variant="quiet"
              disabled={actions.pending}
              onClick={() => actions.verify(item.id)}
            >
              {strings.rail.markVerified}
            </Button>
          )}
        </div>
      )}

      {item.evidence.length > 0 && !flagged && (
        <ul className="mt-[10px] flex flex-col gap-2 border-l-2 border-rule-strong pl-3">
          {item.evidence.map((ev, i) => (
            <li key={i}>
              <div className="font-display text-ui text-ink-soft italic">“{ev.quote}”</div>
              <div className="mt-0.5 flex flex-wrap items-center gap-2 text-micro text-faint">
                <span>
                  {ev.sectionName} · <span className="font-mono">p. {ev.page}</span>
                </span>
                <Button variant="link" onClick={() => onViewSource(ev)}>
                  {s.viewSource}
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}

      {item.cleared && (
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rule-strong bg-bg px-2 text-[10.5px] text-muted">
            ✓{' '}
            {s.clearedChip(
              item.cleared.reason === 'not_applicable' ? s.notApplicable : s.incorrect,
            )}
          </span>
          <span className="text-micro text-muted italic">“{item.cleared.note}”</span>
          {canEdit && (
            <Button
              variant="quiet"
              disabled={actions.pending}
              onClick={() => actions.undoClear(item.id)}
            >
              {strings.rail.undo}
            </Button>
          )}
        </div>
      )}
    </div>
  )
}
