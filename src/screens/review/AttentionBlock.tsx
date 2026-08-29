/**
 * NEEDS YOUR ATTENTION (build-spec §5.3 #4): collapsible block with an indigo
 * left edge. Header always visible (title, amber "N open", "M reviewed",
 * chevron). Every row deep-links to its section. Phase 3 renders the rows and
 * their states; Phase 4 adds dismiss / mark reviewed / edit note.
 */
import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { AttentionItem, Review } from '@/api/types'
import { ChevronIcon } from '@/app/icons'
import { Badge } from '@/components/Badge'
import { Chip } from '@/components/Chip'
import { Collapsible } from '@/components/Collapsible'
import { ViaBadge } from '@/components/ViaBadge'
import { cx } from '@/lib/cx'
import { formatFlagConfidence } from '@/lib/format'
import { sectionAnchor } from '@/lib/sections'
import { strings } from '@/strings'

function Tag({ a }: { a: AttentionItem }) {
  const s = strings.review
  if (a.state === 'reviewed') return <span className="text-[12px] text-success">✓</span>
  if (a.state === 'dismissed') return <span className="text-[12px] text-faint">—</span>
  switch (a.kind) {
    case 'review_required':
      return <Chip>{s.reviewRequired}</Chip>
    case 'flag':
      return (
        <Badge tone="amber">
          ⚑ {a.confidence !== undefined ? formatFlagConfidence(a.confidence) : ''}
        </Badge>
      )
    case 'unresolved':
      return <ViaBadge via="unresolved" label={s.unresolved} />
    case 'question':
      return <Badge tone="slate">{s.question}</Badge>
  }
}

export function AttentionBlock({ review }: { review: Review }) {
  const s = strings.review
  const [open, setOpen] = useState(true)
  const openCount = review.attention.filter((a) => a.state === 'open').length
  const reviewedCount = review.attention.filter((a) => a.state === 'reviewed').length
  const rows = [...review.attention].sort(
    (a, b) => Number(a.state !== 'open') - Number(b.state !== 'open'),
  )

  return (
    <div className="mb-7 rounded-[10px] border border-rule border-l-2 border-l-indigo bg-bg">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="attention-body"
        onClick={() => setOpen((o) => !o)}
        className={cx(
          'flex w-full items-center gap-[10px] px-4 py-3 text-left',
          open && 'border-b border-rule',
        )}
      >
        <h3 className="text-micro font-semibold tracking-[0.1em] text-indigo uppercase">
          {s.attentionHeading}
        </h3>
        <Badge tone="amber">{s.openBadge(openCount)}</Badge>
        <span className="text-dense text-faint">{s.reviewedTally(reviewedCount)}</span>
        <ChevronIcon
          className={cx(
            'ml-auto h-[13px] w-[13px] flex-none text-faint transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
      </button>
      <Collapsible open={open} id="attention-body">
        <ul>
          {rows.map((a) => (
            <li
              key={a.id}
              className={cx(
                'border-b border-rule last:border-b-0',
                a.state !== 'open' && 'bg-bg-subtle',
              )}
            >
              <Link
                to={`/review/${review.id}#${sectionAnchor(a.sectionN)}`}
                className="flex w-full items-start gap-[11px] px-4 py-[11px] text-left hover:bg-bg-subtle"
              >
                <span className="mt-px flex-none">
                  <Tag a={a} />
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={cx(
                      'block text-ui leading-[1.45]',
                      a.state === 'open' ? 'font-medium' : 'font-normal text-muted',
                    )}
                  >
                    {a.title}
                  </span>
                  <span
                    className={cx(
                      'mt-0.5 block text-[12px] leading-[1.5]',
                      a.state === 'reviewed' ? 'text-success' : 'text-muted',
                    )}
                  >
                    {a.state === 'reviewed'
                      ? a.note
                        ? s.reviewedNote(a.note)
                        : s.reviewedPlain
                      : a.state === 'dismissed'
                        ? s.dismissed
                        : a.detail}
                  </span>
                </span>
                <span className="mt-0.5 flex-none text-dense whitespace-nowrap text-indigo">
                  {s.sectionLink(a.sectionN)}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </Collapsible>
    </div>
  )
}
