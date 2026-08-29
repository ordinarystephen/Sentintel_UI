/** Reviews (`/reviews`, `/reviews/all`, build-spec §5.4). Tab state lives in the URL. */
import { Link } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { strings } from '@/strings'

export type ReviewsTab = 'my' | 'all'

const TABS: ReadonlyArray<{ id: ReviewsTab; to: string; label: string }> = [
  { id: 'my', to: '/reviews', label: strings.reviews.tabs.my },
  { id: 'all', to: '/reviews/all', label: strings.reviews.tabs.all },
]

export function ReviewsScreen({ tab }: { tab: ReviewsTab }) {
  return (
    <div>
      <div className="mb-[14px] flex items-center gap-3">
        <h1 className="font-display text-screen-title font-semibold tracking-display">
          {strings.reviews.title}
        </h1>
        <div role="tablist" className="inline-flex gap-0.5 rounded-lg bg-bg-subtle p-0.5">
          {TABS.map((t) => (
            <Link
              key={t.id}
              to={t.to}
              role="tab"
              aria-selected={tab === t.id}
              className={cx(
                'rounded-md px-[13px] py-[5px] text-[12px] text-muted',
                tab === t.id && 'bg-bg font-medium text-ink shadow-sm',
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      <p className="text-ui-sm text-muted">
        {tab === 'my' ? strings.reviews.myIntro : strings.reviews.allIntro}
      </p>
    </div>
  )
}
