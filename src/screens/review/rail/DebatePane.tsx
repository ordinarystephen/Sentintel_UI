/** Debate — advocate and dissent cards (stance-colored headers), citations, the advisory footnote. */
import { useDebate } from '@/api/hooks'
import { cx } from '@/lib/cx'
import { strings } from '@/strings'
import { fmt } from '@/lib/fmt'

export function DebatePane({ itemId }: { itemId: string }) {
  const s = strings.rail
  const q = useDebate(itemId)
  if (!q.data) return null
  if (q.data.length === 0)
    return <p className="text-dense leading-[1.55] text-faint">{s.debateEmpty}</p>
  return (
    <div>
      {q.data.map((p) => (
        <div
          key={p.stance}
          className="mb-[10px] rounded-[10px] border border-rule bg-bg px-3 py-[11px]"
        >
          <div
            className={cx(
              'mb-1.5 flex items-center gap-[7px] text-micro font-bold tracking-[0.1em] uppercase',
              p.stance === 'advocate' ? 'text-success' : 'text-error',
            )}
          >
            ◆ {p.stance === 'advocate' ? s.advocate : s.dissent}
          </div>
          <p className="text-[12px] leading-[1.55] text-ink-soft">{p.text}</p>
          <div className="mt-1.5 font-mono text-[10.5px] text-faint">
            {fmt(s.cites, { citations: p.citations.join(' · ') })}
          </div>
        </div>
      ))}
      <p className="mt-[10px] text-micro leading-[1.55] text-faint">{s.debateNote}</p>
    </div>
  )
}
