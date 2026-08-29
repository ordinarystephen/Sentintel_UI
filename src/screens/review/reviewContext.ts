/** What the work paper and attention block need from the review screen: edit permission + actions. */
import { createContext, useContext } from 'react'
import type { ReviewActions } from './useReviewActions'

export interface ReviewScreenContextValue {
  reviewId: string
  /** False for another owner's review: no dispositions, no clearing (§5.4). */
  canEdit: boolean
  actions: ReviewActions
}

export const ReviewScreenContext = createContext<ReviewScreenContextValue | null>(null)

export function useReviewScreen(): ReviewScreenContextValue {
  const ctx = useContext(ReviewScreenContext)
  if (!ctx) throw new Error('useReviewScreen must be used inside the review screen')
  return ctx
}
