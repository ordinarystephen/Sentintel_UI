/**
 * Sentinel domain model — the shapes the whole UI consumes (build-spec §6).
 *
 * Contract notes for the real backend:
 * - All timestamps are ISO-8601 strings in UTC; the UI formats them in lib/.
 * - Every extracted item carries a numeric confidence in [0, 1]. ONE floor
 *   (`Review.confidenceFloor`, server-side) drives both the amber UI treatment
 *   + `review_required` flag and the DOCX "REVIEW REQUIRED" banner.
 * - Nothing is deleted: dispositions, clears and responses append to
 *   `Review.dispositions` with actor + timestamp.
 */

export type Lob = 'IB Lending' | 'Wealth Management' | 'Counterparty Credit Risk'
export const LOBS: readonly Lob[] = ['IB Lending', 'Wealth Management', 'Counterparty Credit Risk']

export interface User {
  id: string
  name: string
}

/**
 * `processing` from upload until the run completes; `ready` afterwards.
 * `failed` carries the backend's message (surfaced verbatim, loudly);
 * `cancelled` is the analyst's own cancel.
 */
export type ReviewStatus = 'processing' | 'ready' | 'failed' | 'cancelled'

export interface ReviewSummary {
  id: string
  /** null until the borrower is detected during processing ("New review — reading…"). */
  borrowerName: string | null
  /** null until detected. */
  clId: string | null
  lob: Lob
  ownerId: string
  ownerName: string
  status: ReviewStatus
  createdAt: string
  openItems: number
  sectionsPopulated: number
  /** Set when the same borrower has an earlier review; drives the Prior tab. */
  priorReviewId?: string
  /** 2 for the second review of this borrower within 12 months, etc. Shown as "2nd in 12 mo". */
  repeatIndex?: number
  sector?: string
}

export type ProcessingPhase = 'reading' | 'indexing' | 'policy_checks'

/** What `/review/:id` renders while the run is in flight (§5.2). */
export interface ProcessingReview extends ReviewSummary {
  status: 'processing' | 'failed' | 'cancelled'
  phase: ProcessingPhase
  /** The single muted status line ("Indexing 33 pages…"). */
  statusLine: string
  documents: ReviewDocument[]
  /** Present only when status is `failed`. */
  error?: ApiErrorShape
}

export interface Rating {
  agency: string
  rating: string
  outlook: string
  asOf?: string
}

export interface ReviewDocument {
  fileName: string
  /** e.g. "annual review", "quarterly update", "facility agreement" */
  kind: string
  date: string
  pages?: number
  sizeBytes?: number
}

export interface StoryChange {
  date: string
  /** factor badge, e.g. "expected case", "leverage" */
  factor: string
  summary: string
  prior: string
  current: string
  /** serif-italic snippet from the document */
  snippet: string
}

export interface Story {
  docsLine: string
  narrative: string
  /** "What changed" WITHIN this run's documents (distinct from PriorDelta). */
  changes: StoryChange[]
}

export type Via = 'tier1' | 'tier2' | 'ocr' | 'static' | 'unresolved'

export type ItemContent =
  | { kind: 'prose'; text: string }
  | { kind: 'keyValue'; entries: Array<{ label?: string; value: string; note?: string }> }
  | { kind: 'quote'; text: string; page?: number }

export interface Evidence {
  quote: string
  sourceDoc: string
  sectionName: string
  page: number
  /** Provenance badge in the source modal. */
  imageKind: 'section' | 'page'
  /** Opaque reference the backend resolves to an image; absent → neutral degradation. */
  imageRef?: string
}

export interface AssessmentFactor {
  /** mono factor name, e.g. leverage_flag */
  name: string
  question: string
  verdict: string | null
  /** `stubbed` = "reasoning stubbed" — preserve this honesty label exactly. */
  verdictState: 'pass' | 'fail' | 'stubbed'
  snippets: string[]
}

export interface ResolutionStep {
  text: string
  warn?: boolean
}

export type ClearReason = 'not_applicable' | 'incorrect'

export interface ClearedState {
  reason: ClearReason
  actorId: string
  at: string
}

export interface WorkItem {
  id: string
  sectionN: number
  name: string
  via: Via
  /** Human label for the resolved-via badge ("Tier 1 · section", "image value · OCR", "static data · direct"). */
  viaLabel: string
  page?: number
  /** [0, 1]. Absent for static data / unresolved. */
  confidence?: number
  /** Derived server-side from `confidence < confidenceFloor`. */
  flags: Array<'review_required'>
  content: ItemContent
  evidence: Evidence[]
  factor?: AssessmentFactor
  /** "How this got here" — the Why tab's resolution chain. */
  resolution: ResolutionStep[]
  /** Most recent disposition on this item, if any. */
  disposition?: Disposition
  /** Set while cleared; screen strikes the item, export omits it. */
  cleared?: ClearedState
  /** Analyst marked the value verified: the review_required treatment lifts on screen and in the export. */
  verifiedAt?: string
  /** True briefly after `respond` while Sentinel re-runs the item. */
  reRunning?: boolean
}

export interface Section {
  n: number
  title: string
  status: 'populated' | 'pending'
  /** Shown when a pending section is expanded ("TO BE POPULATED. Feeders: …"). */
  feederNote?: string
  items: WorkItem[]
}

export type AttentionKind = 'review_required' | 'flag' | 'unresolved' | 'question'

export interface AttentionItem {
  id: string
  kind: AttentionKind
  title: string
  detail: string
  sectionN: number
  itemId?: string
  /** Flag confidence, shown inline ("⚑ 0.78"). */
  confidence?: number
  state: 'open' | 'reviewed' | 'dismissed'
  note?: string
}

export type DispositionAction =
  | 'cleared_na'
  | 'cleared_incorrect'
  | 'clear_undone'
  | 'verified'
  | 'reviewed'
  | 'unreviewed'
  | 'note_edited'
  | 'flag_dismissed'
  | 'responded'

/** One row of the audit trail. `itemId` is a WorkItem id or an AttentionItem id depending on the action. */
export interface Disposition {
  itemId: string
  action: DispositionAction
  reason?: ClearReason
  note?: string
  actorId: string
  at: string
}

export interface Review extends ReviewSummary {
  status: 'ready'
  borrowerName: string
  clId: string
  sector: string
  ownership: string
  ratings: Rating[]
  dealTypeChips: string[]
  runCompletedAt: string
  documents: ReviewDocument[]
  story: Story
  /** Always six, in order. */
  sections: Section[]
  attention: AttentionItem[]
  dispositions: Disposition[]
  /** The single threshold both the screen and the export flag against. */
  confidenceFloor: number
  /** True when the caller is not the owner: no dispositions, no clearing. */
  readOnly: boolean
}

export type ReviewRecord = Review | ProcessingReview

export interface DebatePosition {
  itemId: string
  stance: 'advocate' | 'dissent'
  text: string
  citations: string[]
}

export interface PriorDelta {
  label: string
  prior: string
  current: string
  direction: 'worse' | 'better' | 'neutral'
}

/** "Since the [date] review" — BETWEEN reviews (distinct from Story.changes). */
export interface PriorComparison {
  priorReviewId: string
  priorDate: string
  deltas: PriorDelta[]
}

export interface Policy {
  /** mono id, e.g. "1-G-007544 · §4.2" or "POLICY · ib-lending/ev-support" */
  id: string
  kind: 'standard' | 'policy'
  text: string
  itemIds: string[]
}

export interface DocumentHit {
  id: string
  fileName: string
  lob: Lob
  counterparty: string
  docType: string
  date: string
  extracted: boolean
  /** Matched passage with `<mark>` around matched terms. Trusted markup from the API only. */
  snippetHtml: string
  sectionName: string
  page: number
  usedInReviewId?: string
  usedInBorrower?: string
}

export interface ReviewFilters {
  query?: string
  lob?: Lob | 'all'
  ownerId?: string | 'all'
  period?: '12m' | 'all'
}

export interface ReviewList {
  reviews: ReviewSummary[]
  /** Total matching the filters (the list may be truncated by the backend). */
  total: number
  /** Distinct owners for the owner select. */
  owners: User[]
}

export interface DocumentFilters {
  lob?: Lob | 'all'
  counterparty?: string | 'all'
  docType?: string | 'all'
}

export interface DocumentSearchResult {
  hits: DocumentHit[]
  totalPassages: number
  totalDocuments: number
  /** Facets for the selects. */
  counterparties: string[]
  docTypes: string[]
}

export interface ExportResult {
  fileName: string
  blob: Blob
}

/** Every API failure surfaces as `{ message }`, shown verbatim (§6). */
export interface ApiErrorShape {
  message: string
}
