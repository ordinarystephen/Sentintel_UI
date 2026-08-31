/**
 * Respond — free-text direction + "Send & re-run" (scope: the selected item —
 * §9 Q1 open), "Mark verified"; then "Clear from workpaper": Not applicable /
 * Incorrect, with the cleared chip + undo (build-spec §5.3).
 */
import { useState } from 'react'
import type { ClearReason, WorkItem } from '@/api/types'
import { Button } from '@/components/Button'
import { strings } from '@/strings'
import type { ReviewActions } from '../useReviewActions'
import { PaneHeading } from './PaneHeading'
import { fmt } from '@/lib/fmt'

export function RespondPane({
  item,
  canEdit,
  ownerName,
  actions,
}: {
  item: WorkItem
  canEdit: boolean
  ownerName: string
  actions: ReviewActions
}) {
  const s = strings.rail
  const [text, setText] = useState('')
  const [clearReason, setClearReason] = useState<ClearReason | null>(null)
  const [clearNoteText, setClearNoteText] = useState('')
  const [noteError, setNoteError] = useState(false)
  const last = item.disposition

  if (!canEdit)
    return (
      <p className="text-dense leading-[1.55] text-faint">
        {fmt(s.readOnly, { owner: ownerName })}
      </p>
    )

  return (
    <div>
      <PaneHeading first>{s.respondHeading}</PaneHeading>
      <textarea
        aria-label={s.respondHeading}
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder={s.respondPlaceholder}
        className="min-h-16 w-full resize-y rounded-lg border border-rule-strong bg-bg px-[11px] py-[9px] text-[12px]"
      />
      <div className="mt-[10px] flex flex-wrap gap-2">
        <Button
          variant="primary"
          small
          disabled={actions.pending || item.reRunning}
          onClick={async () => {
            const r = await actions.respond(item.id, text)
            if (r) setText('')
          }}
        >
          {s.sendRerun}
        </Button>
        {!item.verifiedAt && (
          <Button
            variant="outline"
            small
            disabled={actions.pending}
            onClick={() => actions.verify(item.id)}
          >
            {s.markVerified}
          </Button>
        )}
      </div>
      {last?.action === 'responded' && last.note && (
        <p className="mt-2 text-micro text-faint">{fmt(s.respondedNote, { note: last.note })}</p>
      )}

      <PaneHeading>{s.clearHeading}</PaneHeading>
      {item.cleared ? (
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-rule-strong bg-bg px-2 text-[10.5px] text-muted">
            ✓ {s.cleared} —{' '}
            {item.cleared.reason === 'not_applicable'
              ? strings.review.notApplicable
              : strings.review.incorrect}
          </span>
          <span className="text-micro text-muted italic">“{item.cleared.note}”</span>
          <Button
            variant="quiet"
            disabled={actions.pending}
            onClick={() => actions.undoClear(item.id)}
          >
            {s.undo}
          </Button>
        </div>
      ) : clearReason === null ? (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            small
            disabled={actions.pending}
            onClick={() => setClearReason('not_applicable')}
          >
            {s.notApplicable}
          </Button>
          <Button
            variant="outline"
            small
            disabled={actions.pending}
            onClick={() => setClearReason('incorrect')}
          >
            {s.incorrect}
          </Button>
        </div>
      ) : (
        <form
          onSubmit={async (e) => {
            e.preventDefault()
            if (!clearNoteText.trim()) {
              setNoteError(true)
              return
            }
            const ok = await actions.clear(item.id, clearReason, clearNoteText.trim())
            if (ok) {
              setClearReason(null)
              setClearNoteText('')
              setNoteError(false)
            }
          }}
        >
          <input
            autoFocus
            aria-label={s.rationaleLabel}
            value={clearNoteText}
            onChange={(e) => {
              setClearNoteText(e.target.value)
              setNoteError(false)
            }}
            placeholder={s.rationalePlaceholder}
            className="w-full rounded-md border border-rule-strong bg-bg px-2 py-1.5 text-[12px]"
          />
          {noteError && (
            <p role="alert" className="mt-1 text-micro text-error">
              {s.rationaleRequired}
            </p>
          )}
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="submit" variant="primary" small disabled={actions.pending}>
              {fmt(s.confirmClear, {
                reason: clearReason === 'not_applicable' ? s.notApplicable : s.incorrect,
              })}
            </Button>
            <Button
              variant="quiet"
              onClick={() => {
                setClearReason(null)
                setNoteError(false)
              }}
            >
              {s.cancel}
            </Button>
          </div>
        </form>
      )}
      <p className="mt-[10px] text-micro leading-[1.55] text-faint">{s.clearNote}</p>
    </div>
  )
}
