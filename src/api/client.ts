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
  RepositoryDoc,
  ApiErrorShape,
  ClearReason,
  DebatePosition,
  DocumentFilters,
  DocumentSearchResult,
  DocumentText,
  ExportResult,
  ExtractionSettings,
  Policy,
  PriorComparison,
  ProcessingReview,
  Review,
  ReviewFilters,
  ReviewList,
  ReviewRecord,
  ReviewSummary,
  User,
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
   * items. `settings` are the demoted extraction controls (parser, section
   * preset, concurrency); omitted = platform defaults. Resolves as soon as the
   * record exists — never waits for the run.
   */
  createReview(
    files: File[],
    contextText: string,
    settings?: ExtractionSettings,
  ): Promise<{ id: string }>

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

  // ---- documents ----

  /**
   * Passage search over everything Sentinel has read. `query` matches passage
   * text; filters are applied server-side. Hits carry provenance and, when a
   * passage fed a review, `usedInReviewId`.
   */
  searchDocuments(query: string, filters: DocumentFilters): Promise<DocumentSearchResult>

  /**
   * Amend-evidence support (v1.4): documents on system for THIS review's
   * borrower (matched by RXM) that are not yet part of the review's
   * evidence set. `query` matches borrower/counterparty name or RXM
   * (case-insensitive substring; RXM with or without the prefix); empty
   * query returns the full scoped list.
   */
  searchRepository(reviewId: string, query: string): Promise<RepositoryDoc[]>

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
