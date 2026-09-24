/**
 * TanStack Query bindings over the seam. Query keys are centralised here so
 * mutations can invalidate precisely. Screens use these; nothing else calls
 * `api` directly.
 */
import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from './index'
import type {
  AddQuestionSetInput,
  AmendSource,
  ClearReason,
  CreateReviewInput,
  DocumentFilters,
  ErmRun,
  PopulationCriteria,
  PortfolioAppId,
  QuestionSetStore,
  ReviewFilters,
  VantageDocument,
  VantageRun,
} from './types'

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
  documentText: (docId: string) => ['documentText', docId] as const,
  /** Per-application shelves (v1.8): one cache entry per store. */
  questionSets: (store: QuestionSetStore) => ['questionSets', store] as const,
  borrowers: (query: string) => ['borrowers', query] as const,
  population: (criteria: PopulationCriteria) => ['population', criteria] as const,
  /** App-scoped run slices (v1.8): CPEA's and Inquiry's never share a key. */
  runs: (app: PortfolioAppId) => ['runs', app] as const,
  run: (app: PortfolioAppId, runId: string) => ['runs', app, 'run', runId] as const,
}

export const useMe = () => useQuery({ queryKey: queryKeys.me, queryFn: () => api.me() })

// ---- Question sets (per-application stores, v1.8) ----

/** One application's shelf; `null` (an application without sets) fetches nothing. */
export const useQuestionSets = (store: QuestionSetStore | null) =>
  useQuery({
    // no shelf → its own inert key, so it can never read another store's cache
    queryKey: store ? queryKeys.questionSets(store) : (['questionSets', 'none'] as const),
    queryFn: () => api.getQuestionSets(store!),
    enabled: store !== null,
  })

export function useQuestionSetMutations(store: QuestionSetStore) {
  const qc = useQueryClient()
  return {
    addQuestionSet: useMutation({
      mutationFn: (input: AddQuestionSetInput) => api.addQuestionSet(store, input),
      onSuccess: () => qc.invalidateQueries({ queryKey: queryKeys.questionSets(store) }),
    }),
  }
}

/** Read a question file back for review (nothing retained server-side). */
export const useParseQuestionFile = () =>
  useMutation({ mutationFn: (file: File) => api.parseQuestionFile(file) })

// ---- The CPEA workflow (v1.5; app-scoped v1.8 — CPEA and Inquiry) ----

export const useBorrowerSearch = (query: string, enabled = true) =>
  useQuery({
    queryKey: queryKeys.borrowers(query),
    queryFn: () => api.searchBorrowers(query),
    placeholderData: keepPreviousData,
    enabled,
  })

export const useResolvePopulation = (criteria: PopulationCriteria) =>
  useQuery({
    queryKey: queryKeys.population(criteria),
    queryFn: () => api.resolvePopulation(criteria),
    placeholderData: keepPreviousData,
  })

/** Polls while the run is queued/running so processing advances live. */
export const useRun = (app: PortfolioAppId, runId: string) =>
  useQuery({
    queryKey: queryKeys.run(app, runId),
    queryFn: () => api.getRun(app, runId),
    refetchInterval: (q) => {
      const state = (q.state.data as ErmRun | undefined)?.state
      return state === 'queued' || state === 'running' ? 400 : false
    },
  })

export const useRuns = (app: PortfolioAppId) =>
  useQuery({ queryKey: queryKeys.runs(app), queryFn: () => api.listRuns(app) })

// ---- Vantage (v1.7) ----

/** Polls while the run is queued/running so processing advances live. */
export const useVantageRun = (runId: string) =>
  useQuery({
    queryKey: ['vantage', 'run', runId],
    queryFn: () => api.getVantageRun(runId),
    refetchInterval: (q) => {
      const state = (q.state.data as VantageRun | undefined)?.state
      return state === 'queued' || state === 'running' ? 350 : false
    },
  })

export const useVantageRuns = () =>
  useQuery({ queryKey: ['vantage', 'runs'], queryFn: () => api.listVantageRuns() })

export function useVantageMutations() {
  const qc = useQueryClient()
  const invalidate = () => qc.invalidateQueries({ queryKey: ['vantage'] })
  return {
    ask: useMutation({
      mutationFn: (v: { questions: string[]; documents: VantageDocument[] }) =>
        api.askDocuments(v.questions, v.documents),
      onSuccess: invalidate,
    }),
    cancel: useMutation({
      mutationFn: (runId: string) => api.cancelVantageRun(runId),
      onSuccess: invalidate,
    }),
  }
}

export const usePolicyDocs = () =>
  useQuery({ queryKey: ['policyDocs'], queryFn: () => api.listPolicyDocs() })

/** Start/cancel runs in ONE application's slice (CPEA = 'erm', Inquiry = 'inquiry'). */
export function usePortfolioMutations(app: PortfolioAppId) {
  const qc = useQueryClient()
  const invalidateRuns = () => qc.invalidateQueries({ queryKey: queryKeys.runs(app) })
  return {
    startRun: useMutation({
      mutationFn: (input: Parameters<typeof api.startRun>[1]) => api.startRun(app, input),
      onSuccess: invalidateRuns,
    }),
    cancelRun: useMutation({
      mutationFn: (runId: string) => api.cancelRun(app, runId),
      onSuccess: invalidateRuns,
    }),
  }
}

export const useMyReviews = () =>
  useQuery({ queryKey: queryKeys.myReviews, queryFn: () => api.listMyReviews() })

export const useAllReviews = (filters: ReviewFilters) =>
  useQuery({
    queryKey: queryKeys.allReviews(filters),
    queryFn: () => api.listAllReviews(filters),
    placeholderData: keepPreviousData,
  })

/** Polls every second while the record is still processing, so `/review/:id` flips to the review on its own. */
export const useReview = (id: string) =>
  useQuery({
    queryKey: queryKeys.review(id),
    queryFn: () => api.getReview(id),
    enabled: !!id,
    refetchInterval: (q) => {
      const d = q.state.data
      if (!d) return false
      if (d.status === 'processing') return 1000
      // an item is re-running after `respond`: poll until its new value lands
      if (d.status === 'ready' && d.sections.some((s) => s.items.some((i) => i.reRunning)))
        return 700
      return false
    },
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
    placeholderData: keepPreviousData,
  })

export const useDocumentText = (docId: string | null) =>
  useQuery({
    queryKey: queryKeys.documentText(docId ?? ''),
    queryFn: () => api.getDocumentText(docId!),
    enabled: !!docId,
  })

export const useDownloadDocument = () =>
  useMutation({ mutationFn: (docId: string) => api.downloadDocument(docId) })

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
      mutationFn: (v: { itemId: string; reason: ClearReason; note: string }) =>
        api.clear(v.itemId, v.reason, v.note),
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
    setAreaRating: useMutation({
      mutationFn: (v: { areaId: string; rating: 'satisfactory' | 'unsatisfactory' }) =>
        api.setAreaRating(v.areaId, v.rating),
      ...opts,
    }),
    editNote: useMutation({
      mutationFn: (v: { attentionId: string; note: string }) => api.editNote(v.attentionId, v.note),
      ...opts,
    }),
    amendEvidence: useMutation({
      mutationFn: (v: { source: AmendSource; why: string }) =>
        api.amendEvidence(reviewId, v.source, v.why),
      ...opts,
    }),
    cancel: useMutation({ mutationFn: () => api.cancelReview(reviewId), ...opts }),
    exportReview: useMutation({ mutationFn: () => api.exportReview(reviewId) }),
  }
}

export function useCreateReview() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (v: CreateReviewInput) => api.createReview(v),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['reviews'] }),
  })
}
