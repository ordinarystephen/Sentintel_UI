/**
 * The API seam (build-spec §6). The entire app consumes `SentinelApi`; the
 * mock in ./mock implements it now, and the dev team implements it against
 * the Flask backend in ./http later — without touching a component.
 *
 * Rules: no `fetch` outside src/api/; all times ISO-8601; every failure is an
 * `ApiError` whose `message` the UI shows verbatim in banners and toasts.
 */
import { createMockApi } from './mock/mockApi'
import type {
  AmendSource,
  ErmRun,
  PopulationAccounting,
  PopulationCriteria,
  QuestionSet,
  RepositoryDoc,
  ApiErrorShape,
  ClearReason,
  DebatePosition,
  DocumentFilters,
  DocumentSearchResult,
  DocumentText,
  ExportResult,
  CreateReviewInput,
  Policy,
  PolicyAnswer,
  PolicyDoc,
  PriorComparison,
  ProcessingReview,
  Review,
  ReviewFilters,
  ReviewList,
  ReviewRecord,
  ReviewSummary,
  User,
  VantageDocument,
  VantageRun,
  WorkItem,
} from './types'

export class ApiError extends Error implements ApiErrorShape {
  constructor(message: string) {
    super(message)
    this.name = 'ApiError'
  }
}

export interface SentinelApi {
  /**
   * The signed-in user. Real backend: identity comes from the firm's
   * credential management system; `name` is display-formatted "Last, First".
   * The mock returns a fixed user.
   */
  me(): Promise<User>

  /**
   * The caller's reviews, newest first, INCLUDING ones still processing
   * (a review record exists from the moment of upload, §5.2).
   */
  listMyReviews(): Promise<ReviewSummary[]>

  /**
   * Team-wide list. Search (borrower, CL number, sector), line of business,
   * owner and period are applied SERVER-SIDE; the UI never assumes it holds
   * the full list. Newest first.
   */
  listAllReviews(filters: ReviewFilters): Promise<ReviewList>

  /**
   * The review at `/review/:id`. Returns a `ProcessingReview` while the run is
   * in flight (or failed/cancelled) and a full `Review` once ready, so the same
   * URL always lands correctly. `readOnly` is true for another owner's review.
   * Errors: `{ message: 'No review with id …' }`.
   */
  getReview(id: string): Promise<ReviewRecord>

  /**
   * Upload the documents for one borrower and start the run. The record is
   * durable from this call: it appears in listMyReviews immediately with
   * `borrowerName: null` and renames itself when the borrower is detected.
   * `contextText` lines ride into the run and surface as `question` attention
   * items. Uploads and repository picks (by docId) may mix; a repository-only
   * review (zero uploads) is valid. `config` is the initiation-time workpaper
   * configuration and rides the review's evidence snapshot. Resolves as soon
   * as the record exists — never waits for the run.
   */
  createReview(input: CreateReviewInput): Promise<{ id: string }>

  /** Cheap poll while processing: phase + status line, or the failure message. */
  getReviewStatus(id: string): Promise<ProcessingReview | { status: 'ready' }>

  /** Cancel an in-flight run. The record stays (status `cancelled`); nothing is deleted. */
  cancelReview(id: string): Promise<void>

  // ---- item dispositions (owner only; read-only reviews reject with a message) ----

  /**
   * Free-text direction on one work item. Records a `responded` disposition
   * with the text, then RE-RUNS THAT ITEM (scope: the single item — §9 Q1 is
   * open; widen here if the design owner says subsection/section). The item reports
   * `reRunning: true` until the new value lands; re-fetch the review to see it.
   */
  respond(itemId: string, text: string): Promise<WorkItem>

  /** Analyst attests the value. Lifts the review_required treatment on screen and in the export. */
  verify(itemId: string): Promise<WorkItem>

  /**
   * Clear an item from the workpaper with a reason and a required one-line
   * rationale note. The item stays on screen, struck, with the rationale
   * beside it; the exported document renders without it. Records
   * `cleared_na` / `cleared_incorrect` with the note, actor + time.
   *
   * The UI enforces only that the note is non-empty. UI validation is NOT
   * the enforcement point: the server must require a substantive rationale —
   * more than the category label — before accepting the clear.
   */
  clear(itemId: string, reason: ClearReason, note: string): Promise<WorkItem>

  /** Reverse a clear. Records `clear_undone`; the original clear stays in the trail. */
  undoClear(itemId: string): Promise<WorkItem>

  // ---- attention dispositions ----

  /** Dismiss a `flag` attention row (flags only). Records `flag_dismissed`. */
  dismissFlag(attentionId: string): Promise<void>

  /** Mark an attention row reviewed with a note. Records `reviewed`. */
  markReviewed(attentionId: string, note: string): Promise<void>

  /** Reopen a reviewed row. Records `unreviewed`; the note is kept in the trail. */
  unreview(attentionId: string): Promise<void>

  /** Edit the note on a reviewed row. Records `note_edited`. */
  editNote(attentionId: string, note: string): Promise<void>

  /**
   * Set the analyst's verdict on an assessment area (the Satisfactory /
   * Unsatisfactory buttons on a pending area). A disposition (`area_rated`,
   * note = the rating) records with actor + timestamp; re-fetches reflect the
   * new rating and the zone's tally. Owner only.
   */
  setAreaRating(areaId: string, rating: 'satisfactory' | 'unsatisfactory'): Promise<void>

  // ---- context rail ----

  /** Advocate + dissent positions for an item. Empty when none were produced (UI hides the cards). */
  getDebate(itemId: string): Promise<DebatePosition[]>

  /** Deltas vs the borrower's prior review, or null when there is none (UI hides the Prior tab). */
  getPriorDeltas(reviewId: string): Promise<PriorComparison | null>

  /** Policies and standards applied in this review, each listing the items it touched. */
  getPolicies(reviewId: string): Promise<Policy[]>

  /** Policy search: the browsable rows, newest revision first. */
  listPolicyDocs(): Promise<PolicyDoc[]>

  /**
   * Ask the policies (CAPABILITY PREVIEW): returns the fixture preview
   * answer for any question — the answering engine is future work; the seam
   * is visible now so the UI contract is stable. A non-question search term
   * belongs in listPolicyDocs filtering, not here.
   */
  askPolicies(question: string): Promise<PolicyAnswer>

  // ---- documents ----

  /**
   * Passage search over everything Sentinel has read. `query` matches passage
   * text; filters are applied server-side. Hits carry provenance and, when a
   * passage fed a review, `usedInReviewId`.
   */
  searchDocuments(query: string, filters: DocumentFilters): Promise<DocumentSearchResult>

  /**
   * The SHARED repository search (v1.4, re-signed v1.5 as the platform
   * picker contract — ERM's picker today, the future CRR picker's too).
   * `query` matches borrower/counterparty name or RXM (case-insensitive
   * substring; RXM with or without the prefix); empty query returns the
   * scoped list. `scope.rxm` restricts to one borrower;
   * `scope.notInReviewId` additionally drops documents already in that
   * review's evidence set (CRR's amend-evidence case).
   */
  searchRepository(
    query: string,
    scope?: { rxm?: string; notInReviewId?: string },
  ): Promise<RepositoryDoc[]>

  /**
   * Add a document to a review's evidence set mid-review ("Add document").
   * `source` is either a repository document (by repoId) or a fresh upload;
   * `why` is REQUIRED — it is recorded in the review's evidence log and
   * shown on the manifest row. The mock marks the review amended
   * (`evidenceAmendedAt`) with impacted checks re-running until
   * `amendSettlesAt`; the real backend re-runs impacted checks and streams
   * the same states. Returns the updated review.
   */
  amendEvidence(reviewId: string, source: AmendSource, why: string): Promise<Review>

  // ---- ERM (v1.5) ----

  /** The question sets the start screen can select. */
  getQuestionSets(): Promise<QuestionSet[]>

  /**
   * Resolve a population from criteria WITHOUT starting a run: the start
   * screen's scope-preview line. Returns full accounting (included /
   * named exclusions / indeterminate) plus the in-scope document count.
   */
  resolvePopulation(
    criteria: PopulationCriteria,
  ): Promise<{ population: PopulationAccounting; documentCount: number }>

  /**
   * Start a run. Returns immediately with the runId; the run advances
   * server-side (mock: derived from elapsed time, so it completes even if
   * the user leaves) — poll with getRun. `documents` (fileNames) union
   * with the population's document scope.
   */
  startRun(input: {
    questionSetId: string
    prompt?: string
    criteria: PopulationCriteria
    documents?: string[]
  }): Promise<{ runId: string }>

  /** One run, any state — queued/running (with progress), completed, cancelled, failed. */
  getRun(runId: string): Promise<ErmRun>

  /**
   * Save a question set (CPEA "Add new"): the mock parses no file — a saved
   * set gets a placeholder question list (count from fixture logic, labeled
   * honestly). Appends to getQuestionSets and persists.
   */
  addQuestionSet(input: {
    name: string
    description: string
    fileName?: string
  }): Promise<QuestionSet>

  /** Newest first. Every run ever started is kept and revisitable. */
  listRuns(): Promise<ErmRun[]>

  /** Cancel a running run: it becomes `cancelled` and stays in Runs. */
  cancelRun(runId: string): Promise<ErmRun>

  // ---- Vantage (v1.7) ----

  /**
   * Ask a question of uploaded documents (upload only — no repository).
   * Returns the runId immediately; the run advances server-side (mock:
   * derived from elapsed time). One question in, one answer out — a run,
   * never a chat; a follow-up is a NEW run against the same docset with
   * no context carried.
   */
  askDocuments(question: string, documents: VantageDocument[]): Promise<{ runId: string }>

  /** One Vantage run, any state (poll while queued/running). */
  getVantageRun(runId: string): Promise<VantageRun>

  /** Newest first; every run kept, cancelled runs honestly labeled. */
  listVantageRuns(): Promise<VantageRun[]>

  /** Cancel a running Vantage run: kept as `cancelled`. */
  cancelVantageRun(runId: string): Promise<VantageRun>

  /**
   * The extracted text of one document, organized by the DOCUMENT's own
   * sections with page ranges — the "Preview extracted text" payload. Real
   * backend: read from the index store. A not-yet-extracted document rejects
   * with `{ message }` (the UI disables the action, so this is defensive).
   */
  getDocumentText(docId: string): Promise<DocumentText>

  /**
   * The original uploaded file. Real backend: stream from the document store
   * (filename from Content-Disposition). Mock: a placeholder PDF blob, same
   * pattern as exportReview.
   */
  downloadDocument(docId: string): Promise<ExportResult>

  // ---- export ----

  /**
   * Render the clean Word review: cleared content omitted, no working-state
   * artifacts, flagged values carrying the same REVIEW REQUIRED banner the
   * screen showed. Rejects with `{ message }` on render failure — the UI shows
   * it in-app, never as a raw error page.
   */
  exportReview(id: string): Promise<ExportResult>
}

export type ApiKind = 'mock' | 'http'

/**
 * Selects the implementation from `VITE_API` (default `mock`). Only `mock`
 * exists in this repo; `http` is the dev team's — see docs/api-handoff.md.
 */
export function createApi(kind: string | undefined = import.meta.env.VITE_API): SentinelApi {
  switch (kind ?? 'mock') {
    case 'mock':
      return createMockApi()
    case 'http':
      throw new Error(
        'VITE_API=http: src/api/http/ is not implemented in this repository. See docs/api-handoff.md.',
      )
    default:
      throw new Error(`Unknown VITE_API value "${kind}". Use "mock" or "http".`)
  }
}
