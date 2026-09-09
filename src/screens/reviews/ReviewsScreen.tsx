/**
 * Reviews (`/reviews`, `/reviews/all`, build-spec §5.4). Tab state lives in
 * the URL; so do the All-tab filters (`?q=&lob=&owner=&period=`), so refresh
 * never loses them. Search and filters execute against the seam — the UI
 * never assumes it holds the full list.
 */
import { Link, useSearchParams } from 'react-router-dom'
import { useAllReviews, useMe, useMyReviews } from '@/api/hooks'
import { LOBS, type Lob, type ReviewFilters } from '@/api/types'
import { SearchInput } from '@/components/SearchInput'
import { Select } from '@/components/Select'
import { cx } from '@/lib/cx'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { strings } from '@/strings'
import { ReviewRow } from './ReviewRow'
import { plural } from '@/lib/fmt'

export type ReviewsTab = 'my' | 'all'

const TABS: ReadonlyArray<{ id: ReviewsTab; to: string; label: string }> = [
  { id: 'my', to: '/reviews', label: strings.reviews.tabs.my },
  { id: 'all', to: '/reviews/all', label: strings.reviews.tabs.all },
]

export function ReviewsScreen({ tab }: { tab: ReviewsTab }) {
  return (
    <div className="settle">
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
                'rounded-md px-[13px] py-[5px] text-[0.75rem] text-muted',
                tab === t.id && 'bg-bg font-medium text-ink shadow-sm',
              )}
            >
              {t.label}
            </Link>
          ))}
        </div>
      </div>
      {tab === 'my' ? <MyList /> : <AllList />}
    </div>
  )
}

function MyList() {
  const q = useMyReviews()
  if (!q.data) return null
  if (q.data.length === 0) return <p className="text-ui-sm text-faint">{strings.reviews.emptyMy}</p>
  return (
    <div>
      {q.data.map((r) => (
        <ReviewRow key={r.id} review={r} variant="my" />
      ))}
    </div>
  )
}

const isLob = (v: string | null): v is Lob => LOBS.includes(v as Lob)

function AllList() {
  const s = strings.reviews
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const lob: Lob | 'all' = isLob(params.get('lob')) ? (params.get('lob') as Lob) : 'all'
  const ownerId = params.get('owner') ?? 'all'
  const period: ReviewFilters['period'] = params.get('period') === 'all' ? 'all' : '12m'
  const debounced = useDebouncedValue(query, 300)
  const filters: ReviewFilters = { query: debounced, lob, ownerId, period }
  const list = useAllReviews(filters)
  const me = useMe()

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    const isDefault = key === 'period' ? value === '12m' : value === '' || value === 'all'
    if (isDefault) next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  return (
    <div>
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <SearchInput
          aria-label={s.searchAria}
          placeholder={s.searchPlaceholder}
          value={query}
          onChange={(e) => set('q', e.target.value)}
          className="min-w-[180px]"
        />
        <Select aria-label={s.lobAria} value={lob} onChange={(e) => set('lob', e.target.value)}>
          <option value="all">{s.allLobs}</option>
          {LOBS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <Select
          aria-label={s.ownerAria}
          value={ownerId}
          onChange={(e) => set('owner', e.target.value)}
        >
          <option value="all">{s.allOwners}</option>
          {(list.data?.owners ?? []).map((o) => (
            <option key={o.id} value={o.id}>
              {o.id === me.data?.id ? s.you : o.name}
            </option>
          ))}
        </Select>
        <Select
          aria-label={s.periodAria}
          value={period}
          onChange={(e) => set('period', e.target.value)}
        >
          <option value="12m">{s.period12m}</option>
          <option value="all">{s.periodAll}</option>
        </Select>
      </div>
      {list.data && (
        <>
          <p className="text-dense text-faint" aria-live="polite">
            {plural(list.data.total, s.countOne, s.countOther)}
          </p>
          <p className="mt-0.5 mb-3 text-dense text-faint">{s.readOnlyNote}</p>
          {list.data.reviews.length === 0 && <p className="text-ui-sm text-faint">{s.emptyAll}</p>}
          {list.data.reviews.map((r) => (
            <ReviewRow key={r.id} review={r} variant="all" meId={me.data?.id} />
          ))}
        </>
      )}
    </div>
  )
}
