/**
 * One review row (landing Recent, My reviews, All reviews). `all` adds the
 * owner ("you" or name), the read-only badge on others' reviews, the repeat
 * chip ("2nd in 12 mo"), the LOB tag and the absolute mono timestamp.
 */
import { Link } from 'react-router-dom'
import type { ReviewSummary } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Spinner } from '@/components/Spinner'
import { cx } from '@/lib/cx'
import { formatDate, formatRelative, ordinal } from '@/lib/format'
import { strings } from '@/strings'
import { fmt } from '@/lib/fmt'

export function ReviewRow({
  review: r,
  variant,
  meId,
}: {
  review: ReviewSummary
  variant: 'my' | 'all'
  meId?: string
}) {
  const s = strings.reviews
  const processing = r.status === 'processing'
  const mine = variant === 'my' || r.ownerId === meId
  return (
    <Link
      to={`/review/${r.id}`}
      className="mb-2 flex w-full items-center gap-3 rounded-[10px] border border-rule bg-bg px-3.5 py-[11px] text-left hover:border-rule-strong hover:bg-bg-subtle"
    >
      <span
        className={cx(
          'min-w-0 flex-1 truncate text-ui font-semibold',
          processing && !r.borrowerName && 'font-normal text-muted',
        )}
      >
        {r.borrowerName ?? strings.landing.newReview}
      </span>
      {variant === 'all' && (
        <span className="flex-none text-dense text-muted">
          {r.ownerId === meId ? s.you : r.ownerName}
        </span>
      )}
      <span className="flex flex-none items-center gap-[10px] text-dense text-faint">
        {processing ? (
          <Spinner label={s.processingAria} />
        ) : mine && r.openItems > 0 ? (
          <Badge tone="amber">{fmt(strings.landing.openBadge, { n: r.openItems })}</Badge>
        ) : mine ? (
          <span>{fmt(strings.landing.sectionsComplete, { n: r.sectionsPopulated })}</span>
        ) : (
          <Badge tone="slate">{s.readOnly}</Badge>
        )}
        {variant === 'all' && r.repeatIndex !== undefined && r.repeatIndex > 1 && (
          <Badge tone="slate">{fmt(s.repeat, { ordinal: ordinal(r.repeatIndex) })}</Badge>
        )}
        {variant === 'all' && <span>{strings.lobShort[r.lob] ?? r.lob}</span>}
        {variant === 'all' ? (
          <span className="font-mono text-micro">{formatDate(r.createdAt)}</span>
        ) : (
          <span>{formatRelative(r.createdAt)}</span>
        )}
      </span>
    </Link>
  )
}
