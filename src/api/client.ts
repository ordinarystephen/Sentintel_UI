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
  AddQuestionSetInput,
  AmendSource,
  BorrowerIndexEntry,
  ParsedQuestionFile,
  PortfolioAppId,
  QuestionSetStore,
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

  // ---- Question sets (v1.6, per-application stores v1.8) ----

  /**
   * One application's saved question sets (its shelf). Stores are
   * PER-APPLICATION: CPEA's and Vantage's never mix — a set saved in one
   * never appears in the other.
   */
  getQuestionSets(store: QuestionSetStore): Promise<QuestionSet[]>

  /**
   * Save a question set to ONE application's store ("Add new", or "Save
   * as a question set" from a reviewed question file). With `questions`
   * (an already-read file) those become the set's fields, in order;
   * without them the mock parses nothing and gives the set a placeholder
   * question list, labeled honestly. Persists; appends to that store only.
   */
  addQuestionSet(store: QuestionSetStore, input: AddQuestionSetInput): Promise<QuestionSet>

  /**
   * Read a question file back for review BEFORE anything runs (Vantage
   * one-off intake, and every shelf's Add new). THE FILE CONTRACT: .xlsx
   * (the first sheet) or .csv; the first column; one question per row;
   * blank cells skipped; row order kept; no header row. Nothing is
   * retained server-side — the questions come back to the client, which
   * runs them once (or saves them as a set via addQuestionSet). Parsing is
   * backend work: the mock declares the contract with a fixture parse.
   */
  parseQuestionFile(file: File): Promise<ParsedQuestionFile>

  // ---- CPEA workflow (v1.5; app-scoped v1.8 — CPEA and Inquiry) ----

  /**
   * The borrower index behind the population zone's borrower scope:
   * name or RXM (ratified search keys — case-insensitive substring, RXM
   * with or without the prefix), each with its documents on system.
   * Empty query returns the whole index.
   */
  searchBorrowers(query: string): Promise<BorrowerIndexEntry[]>

  /**
   * Resolve a population from criteria WITHOUT starting a run: the start
   * screen's scope-preview line. Returns full accounting (included /
   * named exclusions / indeterminate) plus the in-scope document count.
   * With `criteria.borrower` the population is that one borrower
   * (included = 1, nothing excluded) and documentCount is its documents.
   */
  resolvePopulation(
    criteria: PopulationCriteria,
  ): Promise<{ population: PopulationAccounting; documentCount: number }>

  /**
   * Start a run in one application's run store (`app`: CPEA = 'erm',
   * Inquiry = 'inquiry' — each keeps its own Runs). Exactly one of
   * `questionSetId` (a set run) or `prompt` (a prompt-only run: ONE
   * question) is required. Returns immediately with the runId; the run
   * advances server-side (mock: derived from elapsed time, so it
   * completes even if the user leaves) — poll with getRun. `documents`
   * (fileNames) union with the population's document scope.
   */
  startRun(
    app: PortfolioAppId,
    input: {
      questionSetId?: string
      prompt?: string
      criteria: PopulationCriteria
      documents?: string[]
    },
  ): Promise<{ runId: string }>

  /** One run of that application, any state — queued/running (with progress), completed, cancelled, failed. */
  getRun(app: PortfolioAppId, runId: string): Promise<ErmRun>

  /** That application's runs, newest first. Every run ever started is kept and revisitable. */
  listRuns(app: PortfolioAppId): Promise<ErmRun[]>

  /** Cancel a running run: it becomes `cancelled` and stays in that application's Runs. */
  cancelRun(app: PortfolioAppId, runId: string): Promise<ErmRun>

  // ---- Vantage (v1.7; questions[] v1.8) ----

  /**
   * Ask ONE OR MANY questions of uploaded documents (upload only — no
   * repository). Typed and file questions arrive combined, in order.
   * Returns the runId immediately; the run advances server-side (mock:
   * derived from elapsed time). The answer is an ordered list of
   * per-question sections — a run, never a chat; a follow-up is a NEW
   * single-question run against the same docset with no context carried.
   */
  askDocuments(questions: string[], documents: VantageDocument[]): Promise<{ runId: string }>

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
