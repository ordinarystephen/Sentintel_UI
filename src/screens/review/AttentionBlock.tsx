/**
 * NEEDS YOUR ATTENTION (build-spec §5.3 #4): collapsible block with an indigo
 * left edge. Header always visible (title, amber "N open", "M reviewed",
 * chevron). Every row deep-links to its section. Dispositions — mark reviewed
 * with a note, un-review, edit note, dismiss (flags only) — record to the
 * review record; they are hidden on read-only reviews.
 */
import { useState, type FormEvent } from 'react'
import { Link } from 'react-router-dom'
import type { AttentionItem, Review } from '@/api/types'
import { ChevronIcon } from '@/app/icons'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Chip } from '@/components/Chip'
import { Collapsible } from '@/components/Collapsible'
import { ViaBadge } from '@/components/ViaBadge'
import { cx } from '@/lib/cx'
import { formatFlagConfidence } from '@/lib/format'
import { sectionAnchor } from '@/lib/sections'
import { strings } from '@/strings'
import { useReviewScreen } from './reviewContext'

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

function NoteForm({
  initial,
  onSave,
  onCancel,
}: {
  initial: string
  onSave: (note: string) => void
  onCancel: () => void
}) {
  const a = strings.attention
  const [note, setNote] = useState(initial)
  function submit(e: FormEvent) {
    e.preventDefault()
    onSave(note.trim())
  }
  return (
    <form onSubmit={submit} className="mt-2 flex flex-wrap items-center gap-2">
      <input
        autoFocus
        aria-label={a.noteLabel}
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder={a.notePlaceholder}
        className="min-w-[240px] flex-1 rounded-md border border-rule-strong bg-bg px-2 py-1 text-[12px]"
      />
      <Button type="submit" variant="primary" small>
        {a.save}
      </Button>
      <Button variant="quiet" onClick={onCancel}>
        {a.cancel}
      </Button>
    </form>
  )
}

function Row({ a, reviewId }: { a: AttentionItem; reviewId: string }) {
  const s = strings.review
  const t = strings.attention
  const { canEdit, actions } = useReviewScreen()
  const [editing, setEditing] = useState(false)
  const done = a.state !== 'open'

  return (
    <li className={cx('border-b border-rule last:border-b-0', done && 'bg-bg-subtle')}>
      <div className="flex items-start gap-[11px] px-4 py-[11px]">
        <span className="mt-px flex-none">
          <Tag a={a} />
        </span>
        <div className="min-w-0 flex-1">
          <Link
            to={`/review/${reviewId}#${sectionAnchor(a.sectionN)}`}
            className="block hover:underline"
          >
            <span
              className={cx(
                'block text-ui leading-[1.45]',
                done ? 'font-normal text-muted' : 'font-medium',
              )}
            >
              {a.title}
            </span>
          </Link>
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
          {editing && (
            <NoteForm
              initial={a.note ?? ''}
              onCancel={() => setEditing(false)}
              onSave={async (note) => {
                const ok =
                  a.state === 'reviewed'
                    ? await actions.editNote(a.id, note)
                    : await actions.markReviewed(a.id, note)
                if (ok) setEditing(false)
              }}
            />
          )}
        </div>
        <Link
          to={`/review/${reviewId}#${sectionAnchor(a.sectionN)}`}
          className="mt-0.5 flex-none text-dense whitespace-nowrap text-indigo"
        >
          {s.sectionLink(a.sectionN)}
        </Link>
        {canEdit && !editing && (
          <span className="mt-0.5 flex flex-none items-center gap-2 text-micro">
            {a.state === 'open' && (
              <Button
                variant="quiet"
                aria-label={t.markReviewedAria(a.title)}
                onClick={() => setEditing(true)}
              >
                {t.markReviewed}
              </Button>
            )}
            {a.state === 'open' && a.kind === 'flag' && (
              <Button
                variant="quiet"
                aria-label={t.dismissAria(a.title)}
                disabled={actions.pending}
                onClick={() => actions.dismissFlag(a.id)}
              >
                {t.dismiss}
              </Button>
            )}
            {a.state === 'reviewed' && (
              <>
                <Button
                  variant="quiet"
                  aria-label={t.editAria(a.title)}
                  onClick={() => setEditing(true)}
                >
                  {t.edit}
                </Button>
                <Button
                  variant="quiet"
                  aria-label={t.unreviewAria(a.title)}
                  disabled={actions.pending}
                  onClick={() => actions.unreview(a.id)}
                >
                  {t.unreview}
                </Button>
              </>
            )}
          </span>
        )}
      </div>
    </li>
  )
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
        {rows.length === 0 ? (
          <p className="px-4 py-3 text-ui-sm text-muted">{s.attentionEmpty}</p>
        ) : (
          <ul>
            {rows.map((a) => (
              <Row key={a.id} a={a} reviewId={review.id} />
            ))}
          </ul>
        )}
      </Collapsible>
    </div>
  )
}
