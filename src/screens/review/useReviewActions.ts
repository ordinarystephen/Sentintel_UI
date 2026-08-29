/**
 * Every analyst action on a review, with the API's error message surfaced as
 * a toast (§6: failures are loud and specific). Mutations invalidate the
 * review query so re-fetches reflect the recorded disposition.
 */
import { useReviewMutations } from '@/api/hooks'
import type { ClearReason } from '@/api/types'
import { useToast } from '@/components/toastContext'

export function useReviewActions(reviewId: string) {
  const m = useReviewMutations(reviewId)
  const { toast } = useToast()
  /** Resolves true on success; false (after toasting the message) on failure. */
  const guard = async (p: Promise<unknown>): Promise<boolean> => {
    try {
      await p
      return true
    } catch (e) {
      toast({ message: (e as Error).message, tone: 'error' })
      return false
    }
  }
  return {
    pending:
      m.respond.isPending ||
      m.verify.isPending ||
      m.clear.isPending ||
      m.undoClear.isPending ||
      m.dismissFlag.isPending ||
      m.markReviewed.isPending ||
      m.unreview.isPending ||
      m.editNote.isPending,
    respond: (itemId: string, text: string) => guard(m.respond.mutateAsync({ itemId, text })),
    verify: (itemId: string) => guard(m.verify.mutateAsync(itemId)),
    clear: (itemId: string, reason: ClearReason) => guard(m.clear.mutateAsync({ itemId, reason })),
    undoClear: (itemId: string) => guard(m.undoClear.mutateAsync(itemId)),
    dismissFlag: (attentionId: string) => guard(m.dismissFlag.mutateAsync(attentionId)),
    markReviewed: (attentionId: string, note: string) =>
      guard(m.markReviewed.mutateAsync({ attentionId, note })),
    unreview: (attentionId: string) => guard(m.unreview.mutateAsync(attentionId)),
    editNote: (attentionId: string, note: string) =>
      guard(m.editNote.mutateAsync({ attentionId, note })),
  }
}

export type ReviewActions = ReturnType<typeof useReviewActions>
