/** True while an amended review's impacted checks are still re-running. */
import type { Review } from '@/api/types'

export function amendReRunning(review: Review, at = Date.now()): boolean {
  return !!review.amendSettlesAt && Date.parse(review.amendSettlesAt) > at
}
