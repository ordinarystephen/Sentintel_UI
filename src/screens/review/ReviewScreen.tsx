/**
 * `/review/:id` (build-spec §5.2–5.3). One URL, three states from one query:
 * processing (polls until ready), failed/cancelled (loud, specific), ready.
 * Refresh or leave-and-return always lands correctly because the record is
 * durable from upload.
 */
import { useParams } from 'react-router-dom'
import { useReview } from '@/api/hooks'
import { ErrorBanner } from '@/components/Banner'
import { strings } from '@/strings'
import { ProcessingView } from './ProcessingView'
import { ReviewView } from './ReviewView'

export function ReviewScreen() {
  const { id = '' } = useParams()
  const q = useReview(id)

  if (q.isError) return <ErrorBanner message={(q.error as Error).message} />
  if (!q.data) return <p className="text-ui-sm text-faint">{strings.review.loading}</p>
  if (q.data.status !== 'ready') return <ProcessingView record={q.data} />
  return <ReviewView review={q.data} />
}
