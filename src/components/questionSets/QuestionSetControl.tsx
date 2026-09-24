/**
 * The shared question-set control (born in CPEA v1.6; shared v1.8 — CPEA
 * and Vantage, one component): the segmented ask-mode radiogroup, the
 * caller's one-off pane, and the saved-set shelf (Add new + one card per
 * set). The shelf reads ONE application's store: a set saved here never
 * appears in another application. Applications with question sets
 * switched off (Inquiry) never import this module — see the Inquiry
 * route guard test.
 */
import { useRef, useState, type KeyboardEvent, type ReactNode } from 'react'
import { useQuestionSets } from '@/api/hooks'
import type { QuestionSetStore } from '@/api/types'
import { cx } from '@/lib/cx'
import { strings } from '@/strings'
import { AddQuestionSetModal } from './AddQuestionSetModal'

const s = strings.questionSets

/** 'oneoff' = the caller's typed pane (CPEA "Prompt only", Vantage "One-off questions"). */
export type QuestionMode = 'oneoff' | 'set'

export function QuestionSetControl({
  store,
  labels,
  mode,
  onModeChange,
  selectedId,
  onSelect,
  children,
}: {
  store: QuestionSetStore
  /** Per-application mode labels, in segment order. */
  labels: { oneOff: string; set: string }
  mode: QuestionMode
  onModeChange: (mode: QuestionMode) => void
  selectedId: string | null
  onSelect: (setId: string) => void
  /** The one-off pane, shown while `mode === 'oneoff'`. */
  children: ReactNode
}) {
  const sets = useQuestionSets(store)
  const [addOpen, setAddOpen] = useState(false)
  const groupRef = useRef<HTMLDivElement>(null)
  const MODES = ['oneoff', 'set'] as const

  // WAI-ARIA radio group: one Tab stop (the checked radio); arrows and
  // Home/End move the selection AND focus together.
  function onGroupKey(e: KeyboardEvent<HTMLDivElement>) {
    const i = MODES.indexOf(mode)
    const next =
      e.key === 'ArrowRight' || e.key === 'ArrowDown'
        ? MODES[(i + 1) % MODES.length]
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp'
          ? MODES[(i + MODES.length - 1) % MODES.length]
          : e.key === 'Home'
            ? MODES[0]
            : e.key === 'End'
              ? MODES[MODES.length - 1]
              : null
    if (!next) return
    e.preventDefault()
    onModeChange(next)
    groupRef.current?.querySelector<HTMLElement>(`[data-mode="${next}"]`)?.focus()
  }

  return (
    <>
      <div
        ref={groupRef}
        role="radiogroup"
        aria-label={s.modeAria}
        onKeyDown={onGroupKey}
        className="inline-flex gap-[3px] rounded-[9px] border border-rule bg-bg-subtle p-[3px]"
      >
        {(
          [
            ['oneoff', labels.oneOff],
            ['set', labels.set],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={mode === id}
            tabIndex={mode === id ? 0 : -1}
            data-mode={id}
            onClick={() => onModeChange(id)}
            className={cx(
              'rounded-[7px] px-[18px] py-[7px] text-[0.8125rem] font-medium text-muted',
              mode === id && 'bg-bg font-semibold text-ink shadow-sm',
            )}
          >
            {label}
          </button>
        ))}
      </div>
      {mode === 'oneoff' ? (
        children
      ) : (
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5">
          <button
            type="button"
            onClick={() => setAddOpen(true)}
            className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-rule bg-bg-subtle px-3.5 py-[9px] text-muted hover:text-ink"
          >
            <span className="text-[1.25rem] leading-none">＋</span>
            {/* one inline run of text, so a narrow card wraps it as words, not columns */}
            <span className="text-left">
              <span className="text-[0.8125rem] font-semibold">{s.addNew}</span>{' '}
              <span className="text-dense text-faint">{s.addNewHint}</span>
            </span>
          </button>
          {(sets.data ?? []).map((q) => (
            <button
              key={q.id}
              type="button"
              aria-pressed={selectedId === q.id}
              onClick={() => onSelect(q.id)}
              className={cx(
                'rounded-[10px] border border-rule bg-bg px-3.5 py-[9px] text-left transition-[box-shadow,border-color] duration-150 hover:border-rule-strong hover:shadow-md',
                selectedId === q.id && 'border-primary shadow-[0_0_0_1px_var(--primary)]',
              )}
            >
              <h4 className="font-display text-[0.875rem] font-semibold">{q.name}</h4>
              <p className="line-clamp-2 text-dense text-muted">{q.description}</p>
            </button>
          ))}
        </div>
      )}
      {addOpen && <AddQuestionSetModal store={store} onClose={() => setAddOpen(false)} />}
    </>
  )
}
