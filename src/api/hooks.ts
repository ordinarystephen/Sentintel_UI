/**
 * TanStack Query bindings over the seam. Query keys are centralised here so
 * mutations can invalidate precisely. Screens use these; nothing else calls
 * `api` directly.
 */
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './index'
import type { ClearReason, DocumentFilters, ExtractionSettings, ReviewFilters } from './types'

export const queryKeys = {
  me: ['me'] as const,
  myReviews: ['reviews', 'my'] as const,
  allReviews: (filters: ReviewFilters) => ['reviews', 'all', filters] as const,
  review: (id: string) => ['review', id] as const,
  reviewStatus: (id: string) => ['review', id, 'status'] as const,
  debate: (itemId: string) => ['debate', itemId] as const,
  prior: (reviewId: string) => ['prior', reviewId] as const,
  policies: (reviewId: string) => ['policies', reviewId] as const,
  documents: (query: string, filters: DocumentFilters) => ['documents', query, filters] as const,
}

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: () => api.me() })

export const useMyReviews = () =>
  useQuery({ queryKey: queryKeys.myReviews, queryFn: () => api.listMyReviews() })

export const useAllReviews = (filters: ReviewFilters) =>
  useQuery({ queryKey: queryKeys.allReviews(filters), queryFn: () => api.listAllReviews(filters) })

/** Polls every second while the record is still processing, so `/review/:id` flips to the review on its own. */
export const useReview = (id: string) =>
  useQuery({
    queryKey: queryKeys.review(id),
    queryFn: () => api.getReview(id),
    enabled: !!id,
    refetchInterval: (q) => (q.state.data?.status === 'processing' ? 1000 : false),
  })

/** Polls while the review is processing; the caller flips `enabled` off once ready. */
export const useReviewStatus = (id: string, enabled: boolean, intervalMs = 1000) =>
  useQuery({
    queryKey: queryKeys.reviewStatus(id),
    queryFn: () => api.getReviewStatus(id),
    enabled: enabled && !!id,
    refetchInterval: enabled ? intervalMs : false,
  })

export const useDebate = (itemId: string | null) =>
  useQuery({
    queryKey: queryKeys.debate(itemId ?? ''),
    queryFn: () => api.getDebate(itemId!),
    enabled: !!itemId,
  })

export const usePriorDeltas = (reviewId: string) =>
  useQuery({ queryKey: queryKeys.prior(reviewId), queryFn: () => api.getPriorDeltas(reviewId) })

export const usePolicies = (reviewId: string) =>
  useQuery({ queryKey: queryKeys.policies(reviewId), queryFn: () => api.getPolicies(reviewId) })

export const useDocumentSearch = (query: string, filters: DocumentFilters) =>
  useQuery({
    queryKey: queryKeys.documents(query, filters),
    queryFn: () => api.searchDocuments(query, filters),
  })

/** Every mutation on a review invalidates that review (and the lists, whose counts may change). */
export function useReviewMutations(reviewId: string) {
  const qc = useQueryClient()
  const invalidate = () =>
    Promise.all([
      qc.invalidateQueries({ queryKey: queryKeys.review(reviewId) }),
      qc.invalidateQueries({ queryKey: ['reviews'] }),
    ])
  const opts = { onSuccess: () => invalidate() }
  return {
    respond: useMutation({
      mutationFn: (v: { itemId: string; text: string }) => api.respond(v.itemId, v.text),
      ...opts,
    }),
    verify: useMutation({ mutationFn: (itemId: string) => api.verify(itemId), ...opts }),
    clear: useMutation({
      mutationFn: (v: { itemId: string; reason: ClearReason }) => api.clear(v.itemId, v.reason),
      ...opts,
    }),
    undoClear: useMutation({ mutationFn: (itemId: string) => api.undoClear(itemId), ...opts }),
    dismissFlag: useMutation({
      mutationFn: (attentionId: string) => api.dismissFlag(attentionId),
      ...opts,
    }),
    markReviewed: useMutation({
      mutationFn: (v: { attentionId: string; note: string }) =>
        api.markReviewed(v.attentionId, v.note),
      ...opts,
    }),
    unreview: useMutation({
      mutationFn: (attentionId: string) => api.unreview(attentionId),
      ...opts,
    }),
    editNote: useMutation({
      mutationFn: (v: { attentionId: string; note: string }) => api.editNote(v.attentionId, v.note),
      ...opts,
    }),
    cancel: useMutation({ mutationFn: () => api.cancelReview(reviewId), ...opts }),
    exportReview: useMutation({ mutationFn: () => api.exportReview(reviewId) }),
  }
}

export function useCreateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: { files: File[]; contextText: string; settings?: ExtractionSettings }) =>
      api.createReview(v.files, v.contextText, v.settings),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  })
}
