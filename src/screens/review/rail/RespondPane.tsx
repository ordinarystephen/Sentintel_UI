/**
 * Respond — free-text direction + "Send & re-run" (scope: the selected item —
 * §9 Q1 open), "Mark verified"; then "Clear from workpaper": Not applicable /
 * Incorrect, with the cleared chip + undo (build-spec §5.3).
 */
import { useState } from 'react'
import type { WorkItem } from '@/api/types'
import { Button } from '@/components/Button'
import { strings } from '@/strings'
import type { ReviewActions } from '../useReviewActions'
import { PaneHeading } from './PaneHeading'

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
  const last = item.disposition

  if (!canEdit)
    return <p className="text-dense leading-[1.55] text-faint">{s.readOnly(ownerName)}</p>

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
        <p className="mt-2 text-micro text-faint">{s.respondedNote(last.note)}</p>
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
          <Button
            variant="quiet"
            disabled={actions.pending}
            onClick={() => actions.undoClear(item.id)}
          >
            {s.undo}
          </Button>
        </div>
      ) : (
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            small
            disabled={actions.pending}
            onClick={() => actions.clear(item.id, 'not_applicable')}
          >
            {s.notApplicable}
          </Button>
          <Button
            variant="outline"
            small
            disabled={actions.pending}
            onClick={() => actions.clear(item.id, 'incorrect')}
          >
            {s.incorrect}
          </Button>
        </div>
      )}
      <p className="mt-[10px] text-micro leading-[1.55] text-faint">{s.clearNote}</p>
    </div>
  )
}
