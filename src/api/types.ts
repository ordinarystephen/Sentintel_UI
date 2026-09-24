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
  /** Which Sentinel applications this user can enter (suite round). */
  entitlements: import('@/apps').AppId[]
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
  /** Borrower/counterparty identifier (RXM scheme, e.g. "RXM-6430"); null until detected. */
  rxm: string | null
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
  /** Set when the document's extracted text is on system (enables Preview). */
  docId?: string
  /** Evidence provenance: absent/'opening' = opening set; 'amended' = added mid-review. */
  origin?: 'opening' | 'amended'
  /** amend-evidence audit fields (origin 'amended' only) */
  addedAt?: string
  why?: string
}

/** A document on system (parsed into the index store) for some borrower. */
export interface RepositoryDoc {
  repoId: string
  /** Borrower/counterparty this document belongs to, RXM scheme. */
  rxm: string
  counterparty: string
  fileName: string
  docType: string
  uploadedAt: string
  pages: number
  parsed: boolean
  /** Extracted-text id (Preview) — present when parsed. */
  docId?: string
}

export type AmendSource =
  { kind: 'repo'; repoId: string } | { kind: 'upload'; fileName: string; sizeBytes: number }

// ---------------------------------------------------------------------------
// ERM (v1.5): question sets, per-answer grades, population accounting, runs
// ---------------------------------------------------------------------------

/** One question in a set. `visible` marks a monitor-table column. */
export interface QuestionField {
  id: string
  label: string
  question: string
  outputType: 'text' | 'number' | 'ratio' | 'rating' | 'flag'
  visible: boolean
  /**
   * Governance hook (ratified 2026-09-18): whether a derived answer is
   * acceptable for this field. Carried in config; UNENFORCED this round.
   */
  derivedAcceptable: boolean
}

/** A first-class question-set config object. */
export interface QuestionSet {
  id: string
  name: string
  /** One line on what this set asks and when to use it (2-line clamp on cards). */
  description: string
  fields: QuestionField[]
}

/**
 * Which application's set shelf (v1.8). Sets are PER-APPLICATION: a set
 * saved in one application never appears in another's store.
 */
export type QuestionSetStore = 'erm' | 'vantage'

/**
 * A question file read back for review before anything runs (v1.8). THE
 * FILE CONTRACT: .xlsx, first sheet, first column, one question per row;
 * blank cells skipped; row order kept. Parsing is the backend's job.
 */
export interface ParsedQuestionFile {
  fileName: string
  questions: string[]
}

/** Input to addQuestionSet — `questions` present when saving a parsed file. */
export interface AddQuestionSetInput {
  name: string
  description: string
  fileName?: string
  /** Already-read questions (the one-off intake's parse): the set's fields, in order. */
  questions?: string[]
}

/**
 * Per-answer grade — the decision table (ratified 2026-09-18):
 * `stated` only with an entailing quote attached (evidenceRefs non-empty),
 * `derived` only with `inferredFrom` naming stated inputs, else
 * `unsupported`. Retrieval similarity never grades. Grades live ONLY on
 * answers — no row-level grade exists anywhere; a row's flag count is
 * computed (count of unsupported answers).
 */
export type AnswerGrade = 'stated' | 'derived' | 'unsupported'

export interface AnswerEvidenceRef {
  fileName: string
  sectionName: string
  page: number
  quote: string
  /** Extracted-text id when the document is on system. */
  docId?: string
  imageKind?: 'section' | 'page' | 'none'
  imageRef?: string
}

/** One record per (borrower × question). */
export interface ErmAnswer {
  rxm: string
  questionId: string
  value: string
  grade: AnswerGrade
  conf: 'high' | 'medium' | 'low'
  /** For derived answers: the questionIds of the stated inputs. */
  inferredFrom?: string[]
  evidenceRefs: AnswerEvidenceRef[]
  /** Rationale cards; the LABEL set is per-application config. */
  rationale?: { memoFacts: string; basis: string }
  /** Shown in the limitations strip of the detail modal, when present. */
  limitations?: string
}

export interface BorrowerRef {
  rxm: string
  name: string
}

/** One entry in the borrower index (the scope typeahead): name, RXM, documents on system. */
export interface BorrowerIndexEntry extends BorrowerRef {
  documentCount: number
}

export interface PopulationCriteria {
  portfolio: string
  subPortfolio: string
  region: string
  asOf: string
  /**
   * Borrower scope (v1.8): when present the population IS this one
   * borrower — the four dropdown criteria stand down (carried, not
   * applied) and the accounting names the borrower as the criterion.
   */
  borrower?: BorrowerRef
}

/** The applications that run CPEA's workflow; each keeps its own runs. */
export type PortfolioAppId = 'erm' | 'inquiry'

/** The one question id of a prompt-only (single-question) run's answers. */
export const PROMPT_QUESTION_ID = 'prompt'

/** Population accounting — exclusions are named, never silent. */
export interface PopulationAccounting {
  criteria: PopulationCriteria
  included: BorrowerRef[]
  excluded: Array<{ ref: BorrowerRef; reason: string }>
  indeterminate: Array<{ ref: BorrowerRef; reason: string }>
}

/** A browsable policy row (Policy search, newest revision first). */
export interface PolicyDoc {
  id: string
  title: string
  revisedOn: string
}

/**
 * The Ask-the-policies preview answer (capability preview: the answering
 * engine is future work — the seam is visible, the machinery arrives later).
 */
export interface PolicyAnswer {
  answer: string
  quote: string
  citation: string
  revisedOn: string
}

// ---------------------------------------------------------------------------
// Vantage (v1.7): the typed block contract — an answer is an ordered list
// of typed blocks; the UI never receives free markup. A new shape is an
// additive block type, not a redesign; an unknown type renders an honest
// labeled fallback, never a broken state.
// ---------------------------------------------------------------------------

/** Block-level citations, two kinds. */
export type VantageCitation =
  | {
      kind: 'document'
      file: string
      section?: string
      page?: number
      /** The entailing quote, shown in the shared source-image viewer. */
      quote?: string
      imageKind?: 'section' | 'page' | 'none'
      imageRef?: string
    }
  | {
      kind: 'tabular'
      file: string
      /** 1-based row numbers in the source file. */
      rows: number[]
      of: number
      /**
       * The verbatim rows as they appear in the file, supplied by the
       * backend WITH the citation — the UI never re-reads the file.
       */
      columns: string[]
      rowData: Array<{ n: number; cells: string[] }>
      note?: string
    }

export interface VantageFigure {
  label: string
  value: string
  /** REQUIRED — a figure without a derivation must not render. */
  derivation: string
}

export interface VantageTableColumn {
  key: string
  label: string
  align?: 'left' | 'right'
  kind?: 'text' | 'mono' | 'num'
}

/** A cell is a plain string, or flagged amber for needs-you values only. */
export type VantageTableCell = string | { value: string; warn?: boolean }

export type VantageBlock =
  | { type: 'prose'; paragraphs: string[]; citations?: VantageCitation[] }
  | { type: 'figures'; items: VantageFigure[]; citations?: VantageCitation[] }
  | {
      type: 'table'
      columns: VantageTableColumn[]
      rows: Array<Record<string, VantageTableCell>>
      citations?: VantageCitation[]
    }
  | { type: 'quote'; text: string; citations?: VantageCitation[] }
  | { type: 'absence'; text: string }

export interface VantageDocument {
  name: string
  kind: 'pdf' | 'docx' | 'xlsx' | 'csv'
  /** e.g. "9 pages", "42 rows" — derived at upload in the mock. */
  meta: string
  sizeBytes?: number
}

export type VantageRunState = 'queued' | 'running' | 'completed' | 'cancelled' | 'failed'

export interface VantageRunProgress {
  /** How many documents have been read so far. */
  docsRead: number
  answering: boolean
  statusLine: string
}

/**
 * One question's answer (v1.8): the question, then its typed blocks. The
 * block contract applies per section, unchanged.
 */
export interface VantageAnswerSection {
  question: string
  blocks: VantageBlock[]
}

/**
 * A run is a frozen revisitable record; every state kept. v1.8: a run
 * carries ONE OR MANY questions (typed + file questions combine) and its
 * answer is an ordered list of per-question sections, in question order.
 */
export interface VantageRun {
  runId: string
  questions: string[]
  documents: VantageDocument[]
  state: VantageRunState
  /** Empty until completed; one section per question, same order. */
  sections: VantageAnswerSection[]
  startedAt: string
  cancelledAt?: string
  progress?: VantageRunProgress
  error?: string
}

export type ErmRunState = 'queued' | 'running' | 'completed' | 'cancelled' | 'failed'

/** The staged processing readout while a run is `running`. */
export interface ErmRunProgress {
  populationResolved: boolean
  indexCurrent: boolean
  questionsDone: number
  documentsDone: number
  computing: boolean
}

/**
 * A run is a record: every state is kept and revisitable; nothing
 * overwrites. Answers are attached once completed.
 */
export interface ErmRun {
  runId: string
  startedAt: string
  /**
   * A question-set run names its set. A prompt-only run (v1.8) has none:
   * it asks exactly one question — `prompt` — and its answers carry
   * `questionId: PROMPT_QUESTION_ID`.
   */
  questionSetId?: string
  prompt?: string
  criteria: PopulationCriteria
  state: ErmRunState
  population: PopulationAccounting
  /** fileNames in this run's document scope. */
  documents: string[]
  answers: ErmAnswer[]
  progress?: ErmRunProgress
  cancelledAt?: string
  /** Present only when state is `failed`. */
  error?: string
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
  /** The analyst's one-line rationale, shown beside the struck item. */
  note: string
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

/** One management-summary verdict (the "Areas of assessment" zone; the export opens with this table). */
export type AreaRating = 'satisfactory' | 'unsatisfactory' | 'na' | 'pending'

export interface AssessmentArea {
  id: string
  name: string
  rating: AreaRating
  /** The narrative under the rating — why it is what it is. */
  reason: string
  /** For pending areas: the WorkItem blocking the verdict (named in `reason`). */
  blockedBy?: string
  /** Sections whose content supports (or resolves) this area; rendered as deep links. */
  sectionRefs: number[]
}

/** Entity/facility snapshot from the upstream credit system + CRR-internal designations. */
export interface ReferenceField {
  label: string
  value: string
  /** upstream = credit-system snapshot (as of `ReferenceData.asOf`); crr = CRR-internal designation. */
  source: 'upstream' | 'crr'
}

export interface ReferenceData {
  asOf: string
  fields: ReferenceField[]
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
  | 'area_rated'

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
  rxm: string
  sector: string
  ownership: string
  ratings: Rating[]
  dealTypeChips: string[]
  runCompletedAt: string
  /** The initiation-time workpaper configuration, in the evidence snapshot. */
  workpaperConfig?: WorkpaperConfig
  /** Set when evidence was amended mid-review (the manifest's status line). */
  evidenceAmendedAt?: string
  /** While now < this, impacted checks are re-running; settled afterwards. */
  amendSettlesAt?: string
  documents: ReviewDocument[]
  story: Story
  /** Always six, in order. */
  sections: Section[]
  attention: AttentionItem[]
  /**
   * Management-summary verdicts. STRUCTURAL: a well-formed review always
   * carries assessment areas (completed reviews fully rated). The UI's
   * empty/missing tolerance is a data-integrity guard for malformed or
   * legacy records, never an expected product state.
   */
  areas: AssessmentArea[]
  /**
   * Upstream/CRR reference snapshot. Absent → the disclosure is not rendered
   * at all. Real upstream integration is future work; the seam just carries
   * the snapshot the backend captured.
   */
  referenceData?: ReferenceData
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
  /** When the position was produced. */
  at: string
  /** The run that produced it. */
  runId: string
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
  /** mono id, e.g. "ProcMan-DEMO · §4.2" or "POLICY · ib-lending/ev-support" */
  id: string
  kind: 'standard' | 'policy'
  text: string
  itemIds: string[]
}

/** One section of a document's extracted text, as the DOCUMENT organizes it. */
export interface DocumentTextSection {
  title: string
  pageStart: number
  pageEnd: number
  text: string
}

/** The extracted text of one document — powers "Preview extracted text". */
export interface DocumentText {
  docId: string
  fileName: string
  pages: number
  /** When Sentinel finished parsing this document. */
  parsedAt: string
  extracted: boolean
  sections: DocumentTextSection[]
}

export interface DocumentHit {
  id: string
  /** The document this passage belongs to (stable across passages). */
  docId: string
  fileName: string
  lob: Lob
  counterparty: string
  /** RXM of the counterparty, when it maps to a known borrower. */
  rxm?: string
  docType: string
  date: string
  extracted: boolean
  /** The matched passage, plain text. */
  snippet: string
  /** The same passage with `<mark>` around matched terms. Trusted markup from the API only. */
  snippetHtml: string
  sectionName: string
  page: number
  /** Opaque image reference for the source modal; absent → neutral degradation. */
  imageRef?: string
  /** Set when this passage fed a review: the review, its borrower (short), and the section it landed in. */
  usedInReviewId?: string
  usedInBorrower?: string
  usedInSectionN?: number
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

/**
 * Workpaper configuration (refinement round, 2026-09-18) — what the analyst
 * DOES shape at initiation: template, section toggles, custom analysis
 * topics. Option vocabulary is a deliberate placeholder (see
 * screens/landing/config.ts); the chosen values ride the review's evidence
 * snapshot even while placeholders. (The former "advanced extraction
 * settings" were removed entirely — parsing is the platform's job.)
 */
export interface WorkpaperConfig {
  template: string
  /** Canonical section numbers included (1..6). */
  sections: number[]
  customTopics?: string
}

export interface CreateReviewInput {
  files: File[]
  contextText: string
  /** Index-store docIds pulled from the shared repository. */
  repositoryDocIds?: string[]
  config?: WorkpaperConfig
}

export interface ExportResult {
  fileName: string
  blob: Blob
}

/** Every API failure surfaces as `{ message }`, shown verbatim (§6). */
export interface ApiErrorShape {
  message: string
}
