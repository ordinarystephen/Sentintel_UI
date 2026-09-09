/**
 * Confidence chip: `conf NN%` in mono; amber `low` variant below the floor.
 * The floor comes from the review (`confidenceFloor`) — the one threshold the
 * export also flags against (§8).
 */
import { cx } from '@/lib/cx'
import { formatConfidence } from '@/lib/format'

export function ConfChip({ confidence, floor }: { confidence: number; floor: number }) {
  const low = confidence < floor
  return (
    <span
      className={cx(
        'rounded border px-1.5 font-mono text-[0.625rem]',
        low ? 'border-warn-line bg-warn-bg text-warn' : 'border-rule-strong bg-bg text-muted',
      )}
      title={low ? `Below the ${Math.round(floor * 100)}% confidence floor` : undefined}
    >
      {formatConfidence(confidence)}
      {low && ' · low'}
    </span>
  )
}
