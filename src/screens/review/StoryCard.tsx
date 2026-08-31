/** "The story — what the documents say is going on" (build-spec §5.3 #3): narrative + within-run timeline. */
import type { Review } from '@/api/types'
import { Badge } from '@/components/Badge'
import { strings } from '@/strings'
import { fmt } from '@/lib/fmt'

export function StoryCard({ review }: { review: Review }) {
  const s = strings.review
  return (
    <>
      <div className="mb-[10px] flex items-baseline gap-[10px]">
        <h3 className="text-[14px] font-semibold tracking-tight">{s.storyHeading}</h3>
        <span className="text-[12px] text-faint">{s.storyAside}</span>
      </div>
      <div className="mb-7 rounded-xl border border-rule bg-bg-subtle px-[18px] py-4">
        <p className="mb-[10px] font-mono text-micro text-faint">{review.story.docsLine}</p>
        <p className="text-ui leading-[1.6] text-ink-soft">{review.story.narrative}</p>
        {review.story.changes.length > 0 && (
          <ul className="mt-3.5 flex flex-col gap-2">
            {review.story.changes.map((c, i) => (
              <li key={i} className="rounded-lg border border-rule bg-bg px-3 py-[9px] text-[12px]">
                <div className="mb-[3px] flex items-center gap-2">
                  <span className="font-mono text-micro text-muted">{c.date}</span>
                  <Badge tone="slate">{c.factor}</Badge>
                </div>
                <div>{c.summary}</div>
                <div className="mt-0.5 text-muted tabular-nums">
                  {fmt(s.priorArrow, { prior: c.prior, current: c.current })}
                </div>
                <div className="mt-[3px] font-display text-muted italic">“{c.snippet}”</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </>
  )
}
