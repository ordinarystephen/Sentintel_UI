/**
 * In-memory implementation of SentinelApi (build-spec §7) — what `npm run
 * dev` runs against, what the demo mode demos, and what the dev team explores first.
 *
 * Semantics it deliberately mirrors from the real backend (§8):
 * - A review record exists from the moment of upload. Processing is derived
 *   from elapsed time since upload (not from in-memory timers), and the
 *   mutable state is persisted to localStorage, so closing the tab
 *   mid-processing and reopening /review/:id resumes correctly.
 * - Every analyst action appends a Disposition with actor + timestamp.
 *   Nothing is deleted.
 * - `respond` re-runs the single item: it reports `reRunning` for ~1.5s,
 *   then lands an adjusted value.
 * - Reviews owned by others are read-only: mutations reject with a message.
 * - `exportReview` succeeds with a placeholder .docx blob, except for one
 *   fixture (Seldwyn) that fails, to demonstrate the loud error path.
 *
 * Fixtures are the base layer; only mutated/created reviews are persisted
 * (`overrides`), keyed by STORAGE_KEY. Bump STATE_VERSION when fixtures change
 * shape so stale persisted state is discarded.
 */
import { fmt } from '@/lib/fmt'
import {
  ERM_ANSWERS,
  ERM_BORROWERS,
  ERM_POPULATION,
  ERM_RUN_SCOPE,
  ERM_RUNS,
  QUESTION_SETS,
} from './ermFixtures'
import { INQUIRY_RUNS, PROMPT_RUN_ANSWERS } from './inquiryFixtures'
import {
  QUESTION_FILES,
  VANTAGE_ANSWER_POOL,
  VANTAGE_DEMO_BLOCKS,
  VANTAGE_QUESTION_SETS,
  VANTAGE_RUNS,
} from './vantageFixtures'
import { ApiError, type SentinelApi } from '../client'
import { PROMPT_QUESTION_ID } from '../types'
import type {
  AttentionItem,
  BorrowerIndexEntry,
  BorrowerRef,
  ErmAnswer,
  ErmRun,
  PopulationAccounting,
  PortfolioAppId,
  QuestionSetStore,
  VantageAnswerSection,
  ErmRunState,
  VantageDocument,
  VantageRun,
  VantageRunState,
  PolicyAnswer,
  PolicyDoc,
  QuestionSet,
  WorkpaperConfig,
  PopulationCriteria,
  RepositoryDoc,
  ClearReason,
  DebatePosition,
  Disposition,
  DocumentFilters,
  DocumentHit,
  DocumentSearchResult,
  DocumentText,
  ExportResult,
  Policy,
  PriorComparison,
  ProcessingPhase,
  ProcessingReview,
  Review,
  ReviewDocument,
  ReviewFilters,
  ReviewList,
  ReviewRecord,
  ReviewSummary,
  Section,
  User,
  WorkItem,
} from '../types'
import {
  buildReviews,
  DOCUMENTS,
  CONFIDENCE_FLOOR,
  DEBATES,
  EXPORT_FAILS_ID,
  flagsFor,
  LEADERSHIP_USER,
  ME,
  VEYLAND,
  VEYLAND_ID,
  VEYLAND_PRIOR,
  VEYLAND_PRIOR_ID,
  OWNERS,
  PASSAGES,
  POLICIES,
  RERUN_OUTCOMES,
  summaryOf,
} from './fixtures'

// ─────────────────────────────────────────────────────────────────────────────
// EDIT ME — every user-visible message this mock "backend" returns (error
// banners, toasts, the processing status line). {curly} pieces are fill-ins.
// In production these come from the real API; see docs/editing-copy.md.
// ─────────────────────────────────────────────────────────────────────────────
export const MESSAGES = {
  emptyUpload: 'Add at least one PDF to begin a review.',
  noReview: 'No review with id {id}.',
  noItem: 'No work item with id {id}.',
  noAttention: 'No attention item with id {id}.',
  readOnly: 'This review belongs to {owner} — you can read it, but editing stays with its owner.',
  whyRequired: "A rationale is required — it is recorded in the review's evidence log.",
  noRepoDoc: 'No repository document {id} for this borrower.',
  noRun: 'No run with id {id}.',
  qsNameRequired: 'A title is required to save a question set.',
  qsPlaceholderLabel: 'Question {n}',
  qsPlaceholderQuestion:
    'Placeholder question {n} for "{name}" — the uploaded file is not parsed in this build.',
  qsPlaceholderDesc:
    'Saved set "{name}" — placeholder questions (file parsing arrives with the backend).',
  qsFromFileDescOne: '1 question from {file}.',
  qsFromFileDescOther: '{n} questions from {file}.',
  qsNoQuestions: 'A question set needs at least one question.',
  emptyQuestion: 'Type a question or a search term first.',
  runNeedsQuestion: 'Type a question first — or choose a question set.',
  runNeedsQuestionOneOff: 'Type a question first.',
  runOneMode: 'A run asks a typed question or a question set, not both.',
  noQuestionSet: 'No question set with id {id} in this application.',
  ungrounded: 'The documents on system for this borrower do not ground an answer to this question.',
  parseWrongType:
    'Could not read {file}: question files are .xlsx (or .csv), one question per row.',
  parseEmpty:
    'Could not read any questions from {file}: the first column of the first sheet is empty.',
  parsePlaceholder:
    'Placeholder question {n} from {file} — this build reads only the demo file; parsing arrives with the backend.',
  vantageReading: 'Reading {file} — {meta}…',
  vantageAnswering: 'Answering…',
  vantageAnsweringMany: 'Answering {n} questions…',
  vantageNeedsBoth: 'Bring at least one document and ask at least one question.',
  noVantageRun: 'No run with id {id}.',
  alreadyInReview: '{file} is already part of this review.',
  respondEmpty: 'Say what to re-check, correct, or add before sending.',
  rationaleRequired: 'Add a one-line rationale — it is recorded with the clear.',
  notCleared: 'This item is not cleared.',
  flagsOnly: 'Only flags can be dismissed.',
  notProcessing: 'Review {id} is not processing.',
  stillProcessing: 'This review is still processing — export once it is ready.',
  exportFailed:
    'Export failed: the render service returned no document for {rxm} (render-service: 502 Bad Gateway).',
  parseFailed: 'Could not parse {file}: the file is encrypted or damaged.',
  statusReading: 'Reading {file}…',
  statusReadingFallback: 'Reading the documents…',
  statusIndexing: 'Indexing {pages} pages…',
  statusPolicy: 'Running policy checks…',
  statusCancelled: 'Cancelled.',
  statusFailed: 'Failed.',
  noDocument: 'No document with id {id}.',
  noArea: 'No assessment area with id {id}.',
  notExtractedText:
    '{file} has not been extracted yet — the preview arrives when parsing completes.',
} as const

export const STORAGE_KEY = 'sentinel.mock.state'
/**
 * SCHEMA VERSION of the persisted payload — reviews saved under an older
 * shape must never shadow current fixtures. BUMP THIS whenever the Review /
 * fixture shape changes (a new field counts!); on load, any payload whose
 * version differs is discarded and the fixtures win. History: 1 = through
 * v0.5; 2 = v1.0 (Review gained `areas` + `referenceData`); 3 = areas are
 * structural to every review (all fixtures seeded with rated zones); 4 =
 * canonical workpaper section titles (fixture data changed under stored
 * reviews — same scenario-A shadowing logic); 5 = fictional-name hygiene
 * (v1.1.2 — every borrower name, review/doc id, and filename changed);
 * 6 = amend evidence (v1.4 — documents carry origin/addedAt/why/docId,
 * reviews carry evidenceAmendedAt/amendSettlesAt, CL ids became RXM);
 * 7 = the ERM slice (v1.5 — persisted state gains erm.runs);
 * 8 = refinement round (v1.6 — the former initiation-time parser controls
 * REMOVED from the processing seed, reviews/seeds gain workpaperConfig +
 * repository picks,
 * persisted state gains ermQuestionSets);
 * 9 = the Vantage slice (v1.7 — persisted state gains vantageRuns);
 * 10 = demo feedback round (v1.8 — ONE bump for every persisted change:
 * question sets become per-application stores (`ermQuestionSets` →
 * `questionSets.{erm,vantage}`), CPEA runs become app-scoped slices
 * (`ermRuns` → `portfolioRuns.{erm,inquiry}`) whose records may omit
 * `questionSetId` (prompt-only) and whose criteria may carry `borrower`,
 * and Vantage runs carry `questions[]` instead of `question`).
 */
export const STATE_VERSION = 10

/**
 * Mock-only sign-in switch (v1.8): which fixture user `me()` returns. Unset
 * (or unknown) = the demo user with every entitlement. The real backend
 * takes identity from the session; this key does not exist there.
 */
export const MOCK_USER_KEY = 'sentinel.mock.user'

/**
 * Policy search fixtures (v1.6): the browse rows (newest revision first)
 * and the ONE capability-preview answer. All policy content is fictional;
 * citations use the illustrative ProcMan-DEMO id.
 */
const POLICY_DOCS = [
  {
    id: 'ProcMan-DEMO · §4.2',
    title: 'Reliance on extracted valuation inputs',
    revisedOn: '2026-06-01',
  },
  {
    id: 'ProcMan-DEMO · §5.1',
    title: 'Evidence and citation standards for review workpapers',
    revisedOn: '2026-04-15',
  },
  {
    id: 'POLICY · ib-lending/ev-support',
    title: 'Enterprise-value coverage as a downgrade trigger',
    revisedOn: '2026-03-02',
  },
  {
    id: 'POLICY · ib-lending/covenants',
    title: 'Springing covenant testing and headroom disclosure',
    revisedOn: '2025-11-20',
  },
] satisfies PolicyDoc[]

const POLICY_PREVIEW_ANSWER: PolicyAnswer = {
  answer:
    "Valuation inputs must be re-verified whenever a source document is amended or superseded; reliance without re-verification requires a recorded rationale in the review's evidence log.",
  quote: 'Valuation inputs must be verified against source documents before reliance.',
  citation: 'ProcMan-DEMO · §4.2',
  revisedOn: '2026-06-01',
}

/** How long "impacted checks re-running" lasts after an evidence amend. */
export const AMEND_SETTLE_MS = 6_000

/** Processing timeline (ms since upload). */
export const PROCESSING = {
  reading: 5_000,
  indexing: 10_000,
  total: 15_000,
  detectBorrowerAt: 7_500,
  failAt: 6_000,
  reRun: 1_500,
} as const

interface ProcessingSeed {
  id: string
  startedAt: number
  files: Array<{ name: string; size: number }>
  /** Index-store docIds pulled from the shared repository at initiation. */
  repositoryDocIds?: string[]
  contextText: string
  config?: WorkpaperConfig
  cancelledAt?: number
}

/**
 * A user-started CPEA-workflow run (CPEA or Inquiry) as persisted: meta only — running state derives
 * from elapsed time (so "you can leave" is true), and a completed run's
 * answers/population are materialized from the canonical demo payload on
 * read rather than stored (keeps localStorage small).
 */
interface PersistedErmRun {
  runId: string
  startedAt: string
  /** Absent on a prompt-only (one-question) run. */
  questionSetId?: string
  prompt?: string
  criteria: PopulationCriteria
  documents: string[]
  cancelledAt?: string
}

interface PersistedState {
  version: number
  overrides: Record<string, Review>
  processing: Record<string, ProcessingSeed>
  /** itemId → epoch ms when the re-run lands. */
  reRuns: Record<string, { until: number; text: string }>
  /**
   * CPEA-workflow runs (v1.5; app-scoped v1.8): user-started runs by
   * runId, ONE SLICE PER APPLICATION — Inquiry's runs never list in CPEA.
   */
  portfolioRuns: Record<PortfolioAppId, Record<string, PersistedErmRun>>
  /** User-saved question sets (v1.6; per-application v1.8), in save order. */
  questionSets: Record<QuestionSetStore, QuestionSet[]>
  /** Vantage (v1.7): user-started runs, by runId (meta only — see portfolioRuns). */
  vantageRuns: Record<string, PersistedVantageRun>
}

interface PersistedVantageRun {
  runId: string
  /** v1.8: one or many, in the order asked. */
  questions: string[]
  documents: VantageDocument[]
  startedAt: string
  cancelledAt?: string
}

const freshState = (): PersistedState => ({
  version: STATE_VERSION,
  overrides: {},
  processing: {},
  reRuns: {},
  portfolioRuns: { erm: {}, inquiry: {} },
  questionSets: { erm: [], vantage: [] },
  vantageRuns: {},
})

/** Fixture shelves, per application — each store starts from its own sets only. */
const FIXTURE_SETS: Record<QuestionSetStore, QuestionSet[]> = {
  erm: QUESTION_SETS,
  vantage: VANTAGE_QUESTION_SETS,
}

/** Fixture runs, per application slice. */
const FIXTURE_RUNS: Record<PortfolioAppId, ErmRun[]> = {
  erm: ERM_RUNS,
  inquiry: INQUIRY_RUNS,
}

export interface MockOptions {
  /** Simulated network latency per call. 0 resolves synchronously-ish (tests). */
  latencyMs?: number
  /** Where to persist; `null` disables persistence. Defaults to window.localStorage when present. */
  storage?: Storage | null
  now?: () => number
}

const clone = <T>(v: T): T => structuredClone(v)

function escapeHtml(s: string): string {
  return s.replace(
    /[&<>"']/g,
    (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!,
  )
}

/** The mock plus a test-only reset that discards all mutated/created state. */
export interface MockApi extends SentinelApi {
  reset(): void
}

export function createMockApi(options: MockOptions = {}): MockApi {
  const latencyMs = options.latencyMs ?? 150
  const now = options.now ?? (() => Date.now())
  const storage =
    options.storage === undefined
      ? typeof localStorage === 'undefined'
        ? null
        : localStorage
      : options.storage

  const fixtures = buildReviews()
  let state: PersistedState = load()

  function load(): PersistedState {
    const fresh = freshState()
    try {
      const raw = storage?.getItem(STORAGE_KEY)
      if (!raw) return fresh
      const parsed = JSON.parse(raw) as PersistedState
      return parsed.version === STATE_VERSION ? parsed : fresh
    } catch {
      return fresh
    }
  }
  function save(): void {
    try {
      storage?.setItem(STORAGE_KEY, JSON.stringify(state))
    } catch {
      /* storage unavailable: session-only */
    }
  }

  const delay = <T>(value: T): Promise<T> =>
    latencyMs > 0
      ? new Promise((r) => setTimeout(() => r(value), latencyMs))
      : Promise.resolve(value)
  const fail = (message: string): Promise<never> => Promise.reject(new ApiError(message))

  // ---- reviews: read side -------------------------------------------------

  function stored(id: string): Review | undefined {
    return state.overrides[id] ?? fixtures.get(id)
  }

  /**
   * ERM run timeline (ms since startedAt). State derives from elapsed time,
   * so a run completes even if the user leaves — "you can leave" is true.
   */
  const ERM_TIMELINE = { resolved: 900, indexed: 2000, computing: 7200, done: 8800 }

  /** The borrower index: the monitored universe, each with its documents on system. */
  function borrowerIndex(): BorrowerIndexEntry[] {
    return ERM_BORROWERS.map((b) => ({
      ...b,
      documentCount: DOCUMENTS.filter((d) => d.rxm === b.rxm).length,
    }))
  }

  /** A borrower's documents on system — ALL of them, in or out of the monitor scope. */
  const borrowerDocs = (rxm: string) =>
    DOCUMENTS.filter((d) => d.rxm === rxm).map((d) => d.fileName)

  /**
   * Population accounting from criteria. A borrower criterion IS the
   * population: that one borrower, included, nothing excluded — the
   * accounting still states itself, however trivially. Otherwise the
   * canonical demo population (the dropdown vocabulary is a deliberate
   * placeholder), with the criteria echoed so the disclosure reflects what
   * was asked.
   */
  function populationFor(criteria: PopulationCriteria): PopulationAccounting {
    if (criteria.borrower) {
      const b: BorrowerRef = { rxm: criteria.borrower.rxm, name: criteria.borrower.name }
      return { criteria: clone(criteria), included: [b], excluded: [], indeterminate: [] }
    }
    const population = clone(ERM_POPULATION)
    population.criteria = clone(criteria)
    return population
  }

  const scopeDocuments = (criteria: PopulationCriteria) =>
    criteria.borrower ? borrowerDocs(criteria.borrower.rxm) : ERM_RUN_SCOPE

  /** A borrower with no canonical answer gets an honest unsupported one (never a blank). */
  const ungrounded = (rxm: string, questionId: string): ErmAnswer => ({
    rxm,
    questionId,
    value: '—',
    grade: 'unsupported',
    conf: 'low',
    evidenceRefs: [],
    limitations: MESSAGES.ungrounded,
  })

  /**
   * A completed user-started run materializes the canonical demo payload
   * for ITS population: a set run gets the canonical per-question store, a
   * prompt-only run the canonical one-question answers — each restricted
   * to the included borrowers, in population order.
   */
  function answersFor(rec: PersistedErmRun, population: PopulationAccounting): ErmAnswer[] {
    if (!rec.questionSetId) {
      return population.included.map((b) => {
        const a = PROMPT_RUN_ANSWERS.find((x) => x.rxm === b.rxm)
        return a ? clone(a) : ungrounded(b.rxm, PROMPT_QUESTION_ID)
      })
    }
    // Unscoped set runs are untouched: the canonical store, as since v1.5.
    const borrower = rec.criteria.borrower
    if (!borrower) return clone(ERM_ANSWERS)
    const mine = ERM_ANSWERS.filter((a) => a.rxm === borrower.rxm)
    if (mine.length > 0) return clone(mine)
    const setId = rec.questionSetId
    const fields =
      [...QUESTION_SETS, ...state.questionSets.erm].find((q) => q.id === setId)?.fields ?? []
    return fields.map((f) => ungrounded(borrower.rxm, f.id))
  }

  function ermRunOf(app: PortfolioAppId, runId: string): ErmRun | null {
    const fixture = FIXTURE_RUNS[app].find((r) => r.runId === runId)
    if (fixture) return clone(fixture)
    const rec = state.portfolioRuns[app][runId]
    if (!rec) return null
    const elapsed = now() - Date.parse(rec.startedAt)
    const cancelled = !!rec.cancelledAt
    const doneAt = cancelled ? Date.parse(rec.cancelledAt!) - Date.parse(rec.startedAt) : Infinity
    const eff = Math.min(elapsed, doneAt)
    let stateName: ErmRunState
    if (cancelled && eff < ERM_TIMELINE.done) stateName = 'cancelled'
    else if (elapsed >= ERM_TIMELINE.done || (cancelled && eff >= ERM_TIMELINE.done))
      stateName = 'completed'
    else stateName = elapsed < 250 ? 'queued' : 'running'
    const population = populationFor(rec.criteria)
    const completed = stateName === 'completed'
    const qTotal = rec.questionSetId
      ? ([...QUESTION_SETS, ...state.questionSets.erm].find((q) => q.id === rec.questionSetId)
          ?.fields.length ?? 17)
      : 1
    const run: ErmRun = {
      runId: rec.runId,
      startedAt: rec.startedAt,
      questionSetId: rec.questionSetId,
      prompt: rec.prompt,
      criteria: clone(rec.criteria),
      state: stateName,
      population,
      documents: [...rec.documents],
      // completed runs materialize the canonical demo payload
      answers: completed ? answersFor(rec, population) : [],
      cancelledAt: rec.cancelledAt,
      progress:
        stateName === 'running' || stateName === 'queued'
          ? {
              populationResolved: eff >= ERM_TIMELINE.resolved,
              indexCurrent: eff >= ERM_TIMELINE.indexed,
              questionsDone:
                eff < ERM_TIMELINE.indexed
                  ? 0
                  : Math.min(
                      qTotal,
                      Math.floor(
                        ((eff - ERM_TIMELINE.indexed) /
                          (ERM_TIMELINE.computing - ERM_TIMELINE.indexed)) *
                          qTotal,
                      ),
                    ),
              documentsDone:
                eff < ERM_TIMELINE.indexed
                  ? 0
                  : Math.min(
                      rec.documents.length,
                      Math.floor(
                        ((eff - ERM_TIMELINE.indexed) /
                          (ERM_TIMELINE.computing - ERM_TIMELINE.indexed)) *
                          rec.documents.length,
                      ),
                    ),
              computing: eff >= ERM_TIMELINE.computing,
            }
          : undefined,
    }
    return run
  }

  /**
   * Vantage run timeline: ~1.1s reading per document, then answering.
   * State derives from elapsed time — "you can leave" is true.
   */
  const VANTAGE_READ_MS = 1_100
  const VANTAGE_ANSWER_MS = 1_600
  /** Each question beyond the first adds a little answering time. */
  const VANTAGE_PER_EXTRA_Q_MS = 120

  /**
   * The canned answer, one section per question in order: a one-question
   * run gets the demo answer exactly as v1.7 did; in a many-question run
   * the first question gets the demo answer and the rest rotate through
   * the compact pool (see VANTAGE_ANSWER_POOL).
   */
  function vantageSections(questions: string[]): VantageAnswerSection[] {
    return questions.map((question, i) => ({
      question,
      blocks: clone(
        i === 0 ? VANTAGE_DEMO_BLOCKS : VANTAGE_ANSWER_POOL[(i - 1) % VANTAGE_ANSWER_POOL.length],
      ),
    }))
  }

  function vantageRunOf(runId: string): VantageRun | null {
    const fixture = VANTAGE_RUNS.find((r) => r.runId === runId)
    if (fixture) return clone(fixture)
    const rec = state.vantageRuns[runId]
    if (!rec) return null
    const readTotal = rec.documents.length * VANTAGE_READ_MS
    const doneAt =
      readTotal + VANTAGE_ANSWER_MS + (rec.questions.length - 1) * VANTAGE_PER_EXTRA_Q_MS
    const cancelled = !!rec.cancelledAt
    const rawElapsed = now() - Date.parse(rec.startedAt)
    const eff = cancelled
      ? Math.min(rawElapsed, Date.parse(rec.cancelledAt!) - Date.parse(rec.startedAt))
      : rawElapsed
    let stateName: VantageRunState
    if (eff >= doneAt) stateName = 'completed'
    else if (cancelled) stateName = 'cancelled'
    else stateName = rawElapsed < 200 ? 'queued' : 'running'
    const docsRead = Math.min(rec.documents.length, Math.floor(eff / VANTAGE_READ_MS))
    const answering = eff >= readTotal
    const reading = rec.documents[Math.min(docsRead, rec.documents.length - 1)]
    return {
      runId: rec.runId,
      questions: [...rec.questions],
      documents: clone(rec.documents),
      state: stateName,
      startedAt: rec.startedAt,
      cancelledAt: rec.cancelledAt,
      // completed runs materialize the canonical demo answer payload
      sections: stateName === 'completed' ? vantageSections(rec.questions) : [],
      progress:
        stateName === 'running' || stateName === 'queued'
          ? {
              docsRead,
              answering,
              statusLine: answering
                ? rec.questions.length > 1
                  ? fmt(MESSAGES.vantageAnsweringMany, { n: rec.questions.length })
                  : MESSAGES.vantageAnswering
                : fmt(MESSAGES.vantageReading, { file: reading.name, meta: reading.meta }),
            }
          : undefined,
    }
  }

  /** Mutable copy in overrides (cloning the fixture on first write). */
  function mutable(id: string): Review {
    if (!state.overrides[id]) {
      const base = fixtures.get(id)
      if (!base) throw new ApiError(fmt(MESSAGES.noReview, { id }))
      state.overrides[id] = clone(base)
    }
    return state.overrides[id]
  }

  function recompute(r: Review): void {
    r.openItems = r.attention.filter((a) => a.state === 'open').length
    r.sectionsPopulated = r.sections.filter((s) => s.status === 'populated').length
  }

  /** Land any re-runs whose time has come. */
  function settleReRuns(): void {
    const t = now()
    for (const [itemId, run] of Object.entries(state.reRuns)) {
      if (run.until > t) continue
      const found = findItemMutable(itemId)
      if (found) {
        const { review, item } = found
        const outcome = RERUN_OUTCOMES[itemId]
        if (outcome) {
          item.content = clone(outcome.content)
          item.confidence = outcome.confidence
        } else if (item.confidence !== undefined) {
          item.confidence = Math.max(item.confidence, 0.9)
        }
        item.flags = flagsFor(item.confidence, review.confidenceFloor)
        for (const a of review.attention) {
          if (a.itemId === itemId && a.kind === 'review_required' && a.state === 'open') {
            a.state = 'reviewed'
            a.note = `Re-run with direction — "${run.text}"`
          }
        }
        recompute(review)
      }
      delete state.reRuns[itemId]
    }
    save()
  }

  /** A consumer-facing copy with derived fields applied. */
  function view(r: Review): Review {
    const v = clone(r)
    v.readOnly = v.ownerId !== ME.id
    const t = now()
    for (const s of v.sections)
      for (const it of s.items) it.reRunning = (state.reRuns[it.id]?.until ?? 0) > t
    return v
  }

  // ---- processing ----------------------------------------------------------

  function processingRecord(seed: ProcessingSeed): ReviewRecord {
    const elapsed = now() - seed.startedAt
    const detected = elapsed >= PROCESSING.detectBorrowerAt
    const documents: ReviewDocument[] = [
      ...seed.files.map((f, i) => ({
        fileName: f.name,
        kind: i === 0 ? 'annual review' : 'quarterly update',
        date: new Date(seed.startedAt).toISOString().slice(0, 10),
        pages: Math.max(1, Math.round(f.size / 90_000)),
        sizeBytes: f.size,
      })),
      // repository picks resolve from the ONE index store (v1.6)
      ...(seed.repositoryDocIds ?? []).flatMap((rid) => {
        const d = DOCUMENTS.find((x) => x.docId === rid)
        return d
          ? [
              {
                fileName: d.fileName,
                kind: d.docType,
                date: d.date,
                pages: d.pages,
                docId: d.extracted ? d.docId : undefined,
              },
            ]
          : []
      }),
    ]
    const pages = documents.reduce((n, d) => n + (d.pages ?? 0), 0)
    const base: Omit<ProcessingReview, 'status' | 'phase' | 'statusLine'> = {
      id: seed.id,
      borrowerName: detected ? VEYLAND.borrowerName : null,
      rxm: detected ? VEYLAND.rxm : null,
      lob: 'IB Lending',
      ownerId: ME.id,
      ownerName: ME.name,
      createdAt: new Date(seed.startedAt).toISOString(),
      openItems: 0,
      sectionsPopulated: 0,
      documents,
    }
    if (seed.cancelledAt !== undefined) {
      return {
        ...base,
        status: 'cancelled',
        phase: 'reading',
        statusLine: MESSAGES.statusCancelled,
      }
    }
    const corrupt = seed.files.find((f) => /corrupt/i.test(f.name))
    if (corrupt && elapsed >= PROCESSING.failAt) {
      return {
        ...base,
        status: 'failed',
        phase: 'indexing',
        statusLine: MESSAGES.statusFailed,
        error: {
          message: fmt(MESSAGES.parseFailed, { file: corrupt.name }),
        },
      }
    }
    if (elapsed >= PROCESSING.total) return view(materialize(seed, documents))
    const phase: ProcessingPhase =
      elapsed < PROCESSING.reading
        ? 'reading'
        : elapsed < PROCESSING.indexing
          ? 'indexing'
          : 'policy_checks'
    const statusLine =
      phase === 'reading'
        ? seed.files[0]
          ? fmt(MESSAGES.statusReading, { file: seed.files[0].name })
          : MESSAGES.statusReadingFallback
        : phase === 'indexing'
          ? fmt(MESSAGES.statusIndexing, { pages })
          : MESSAGES.statusPolicy
    return { ...base, status: 'processing', phase, statusLine }
  }

  /** Turn a finished run into a ready Review (a copy of the Veyland fixture) — once. */
  function materialize(seed: ProcessingSeed, documents: ReviewDocument[]): Review {
    const existing = state.overrides[seed.id]
    if (existing) return existing
    const r = clone(VEYLAND)
    r.id = seed.id
    r.createdAt = new Date(seed.startedAt).toISOString()
    r.runCompletedAt = new Date(seed.startedAt + PROCESSING.total).toISOString()
    r.documents = documents
    // the initiation-time workpaper configuration rides the evidence snapshot
    r.workpaperConfig = seed.config
    r.story.docsLine = documents.map((d) => `${d.fileName} — ${d.kind}, ${d.date}`).join(' · ')
    r.priorReviewId = VEYLAND_ID
    r.repeatIndex = 3
    r.dispositions = []
    r.attention = r.attention.filter((a) => a.kind !== 'question')
    seed.contextText
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .forEach((line, i) => {
        r.attention.push({
          id: `${seed.id}-q-${i}`,
          kind: 'question',
          title: line,
          detail:
            'Asked at upload. Sentinel looked for this while reading — evidence, where found, is in the linked section.',
          sectionN: 2,
          state: 'open',
        })
      })
    recompute(r)
    state.overrides[seed.id] = r
    delete state.processing[seed.id]
    save()
    return r
  }

  function record(id: string): ReviewRecord | undefined {
    settleReRuns()
    const seed = state.processing[id]
    if (seed) return processingRecord(seed)
    const r = stored(id)
    return r ? view(r) : undefined
  }

  function allSummaries(): ReviewSummary[] {
    settleReRuns()
    const out: ReviewSummary[] = []
    for (const seed of Object.values(state.processing)) {
      const rec = processingRecord(seed)
      out.push(rec.status === 'ready' ? summaryOf(rec) : rec)
    }
    const seen = new Set(out.map((s) => s.id))
    for (const id of new Set([...Object.keys(state.overrides), ...fixtures.keys()])) {
      if (seen.has(id)) continue
      const r = stored(id)!
      out.push(summaryOf(r))
    }
    return out.sort((a, b) => b.createdAt.localeCompare(a.createdAt))
  }

  // ---- items -------------------------------------------------------------

  function findItemMutable(
    itemId: string,
  ): { review: Review; section: Section; item: WorkItem } | null {
    for (const id of new Set([...Object.keys(state.overrides), ...fixtures.keys()])) {
      const r = stored(id)!
      for (const s of r.sections) {
        if (s.items.some((it) => it.id === itemId)) {
          const review = mutable(id)
          const section = review.sections.find((x) => x.n === s.n)!
          const item = section.items.find((it) => it.id === itemId)!
          return { review, section, item }
        }
      }
    }
    return null
  }

  function findAttentionMutable(
    attentionId: string,
  ): { review: Review; attention: AttentionItem } | null {
    for (const id of new Set([...Object.keys(state.overrides), ...fixtures.keys()])) {
      const r = stored(id)!
      if (r.attention.some((a) => a.id === attentionId)) {
        const review = mutable(id)
        return { review, attention: review.attention.find((a) => a.id === attentionId)! }
      }
    }
    return null
  }

  function assertOwner(review: Review): void {
    if (review.ownerId !== ME.id) {
      throw new ApiError(fmt(MESSAGES.readOnly, { owner: review.ownerName }))
    }
  }

  function record_(review: Review, d: Omit<Disposition, 'actorId' | 'at'>): Disposition {
    const full: Disposition = { ...d, actorId: ME.id, at: new Date(now()).toISOString() }
    review.dispositions.push(full)
    return full
  }

  function itemOut(review: Review, item: WorkItem): WorkItem {
    recompute(review)
    save()
    return view(review)
      .sections.flatMap((s) => s.items)
      .find((it) => it.id === item.id)!
  }

  async function withItem(
    itemId: string,
    fn: (ctx: { review: Review; item: WorkItem }) => void,
  ): Promise<WorkItem> {
    settleReRuns()
    const found = findItemMutable(itemId)
    if (!found) return fail(fmt(MESSAGES.noItem, { id: itemId }))
    try {
      assertOwner(found.review)
      fn(found)
    } catch (e) {
      return fail((e as Error).message)
    }
    return delay(itemOut(found.review, found.item))
  }

  async function withAttention(
    attentionId: string,
    fn: (ctx: { review: Review; attention: AttentionItem }) => void,
  ): Promise<void> {
    const found = findAttentionMutable(attentionId)
    if (!found) return fail(fmt(MESSAGES.noAttention, { id: attentionId }))
    try {
      assertOwner(found.review)
      fn(found)
    } catch (e) {
      return fail((e as Error).message)
    }
    recompute(found.review)
    save()
    return delay(undefined)
  }

  // ---- the API -----------------------------------------------------------

  return {
    reset: () => {
      state = freshState()
      try {
        storage?.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    },

    me: () => {
      let id: string | null = null
      try {
        id = storage?.getItem(MOCK_USER_KEY) ?? null
      } catch {
        /* storage unavailable: the demo user */
      }
      return delay(clone(id === LEADERSHIP_USER.id ? LEADERSHIP_USER : ME))
    },

    listMyReviews: () => delay(allSummaries().filter((s) => s.ownerId === ME.id)),

    listAllReviews: (filters: ReviewFilters) => {
      const all = allSummaries()
      const q = (filters.query ?? '').trim().toLowerCase()
      const since = now() - 365 * 86_400_000
      const reviews = all.filter((s) => {
        if (filters.lob && filters.lob !== 'all' && s.lob !== filters.lob) return false
        if (filters.ownerId && filters.ownerId !== 'all' && s.ownerId !== filters.ownerId)
          return false
        if ((filters.period ?? '12m') === '12m' && Date.parse(s.createdAt) < since) return false
        if (q) {
          // Search keys (ratified 2026-09-17): borrower/counterparty name or
          // RXM — case-insensitive substring; a bare "6430" matches RXM-6430.
          const hay = [s.borrowerName, s.rxm].filter(Boolean).join(' ').toLowerCase()
          if (!hay.includes(q)) return false
        }
        return true
      })
      const owners: User[] = OWNERS.filter((o) => all.some((s) => s.ownerId === o.id))
      const result: ReviewList = { reviews, total: reviews.length, owners }
      return delay(result)
    },

    getReview: (id) => {
      const rec = record(id)
      return rec ? delay(rec) : fail(fmt(MESSAGES.noReview, { id }))
    },

    createReview: (input) => {
      const repoIds = input.repositoryDocIds ?? []
      if (input.files.length === 0 && repoIds.length === 0) return fail(MESSAGES.emptyUpload)
      const badRepo = repoIds.find((rid) => !DOCUMENTS.some((d) => d.docId === rid))
      if (badRepo) return fail(fmt(MESSAGES.noDocument, { id: badRepo }))
      const startedAt = now()
      const id = `rev-new-${startedAt.toString(36)}`
      state.processing[id] = {
        id,
        startedAt,
        files: input.files.map((f) => ({ name: f.name, size: f.size })),
        repositoryDocIds: repoIds,
        contextText: input.contextText,
        config: input.config,
      }
      save()
      return delay({ id })
    },

    getReviewStatus: (id) => {
      const rec = record(id)
      if (!rec) return fail(fmt(MESSAGES.noReview, { id }))
      return delay(rec.status === 'ready' ? { status: 'ready' as const } : rec)
    },

    cancelReview: (id) => {
      const seed = state.processing[id]
      if (!seed) return fail(fmt(MESSAGES.notProcessing, { id }))
      seed.cancelledAt = now()
      save()
      return delay(undefined)
    },

    respond: (itemId, text) =>
      withItem(itemId, ({ review, item }) => {
        if (!text.trim()) throw new ApiError(MESSAGES.respondEmpty)
        record_(review, { itemId: item.id, action: 'responded', note: text })
        item.disposition = review.dispositions[review.dispositions.length - 1]
        state.reRuns[item.id] = { until: now() + PROCESSING.reRun, text }
      }),

    verify: (itemId) =>
      withItem(itemId, ({ review, item }) => {
        item.verifiedAt = new Date(now()).toISOString()
        item.disposition = record_(review, { itemId: item.id, action: 'verified' })
        for (const a of review.attention) {
          if (a.itemId === item.id && a.kind === 'review_required' && a.state === 'open') {
            a.state = 'reviewed'
            a.note = 'Marked verified'
          }
        }
      }),

    clear: (itemId, reason: ClearReason, note: string) =>
      withItem(itemId, ({ review, item }) => {
        if (!note.trim()) {
          throw new ApiError(MESSAGES.rationaleRequired)
        }
        item.cleared = {
          reason,
          note: note.trim(),
          actorId: ME.id,
          at: new Date(now()).toISOString(),
        }
        item.disposition = record_(review, {
          itemId: item.id,
          action: reason === 'not_applicable' ? 'cleared_na' : 'cleared_incorrect',
          reason,
          note: note.trim(),
        })
      }),

    undoClear: (itemId) =>
      withItem(itemId, ({ review, item }) => {
        if (!item.cleared) throw new ApiError(MESSAGES.notCleared)
        delete item.cleared
        item.disposition = record_(review, { itemId: item.id, action: 'clear_undone' })
      }),

    dismissFlag: (attentionId) =>
      withAttention(attentionId, ({ review, attention }) => {
        if (attention.kind !== 'flag') throw new ApiError(MESSAGES.flagsOnly)
        attention.state = 'dismissed'
        record_(review, { itemId: attention.id, action: 'flag_dismissed' })
      }),

    markReviewed: (attentionId, note) =>
      withAttention(attentionId, ({ review, attention }) => {
        attention.state = 'reviewed'
        attention.note = note
        record_(review, { itemId: attention.id, action: 'reviewed', note })
      }),

    unreview: (attentionId) =>
      withAttention(attentionId, ({ review, attention }) => {
        attention.state = 'open'
        record_(review, { itemId: attention.id, action: 'unreviewed', note: attention.note })
      }),

    editNote: (attentionId, note) =>
      withAttention(attentionId, ({ review, attention }) => {
        attention.note = note
        record_(review, { itemId: attention.id, action: 'note_edited', note })
      }),

    setAreaRating: (areaId, rating) => {
      for (const id of new Set([...Object.keys(state.overrides), ...fixtures.keys()])) {
        const r = stored(id)!
        if ((r.areas ?? []).some((a) => a.id === areaId)) {
          const review = mutable(id)
          try {
            assertOwner(review)
          } catch (e) {
            return fail((e as Error).message)
          }
          const area = review.areas.find((a) => a.id === areaId)!
          area.rating = rating
          record_(review, { itemId: areaId, action: 'area_rated', note: rating })
          save()
          return delay(undefined)
        }
      }
      return fail(fmt(MESSAGES.noArea, { id: areaId }))
    },

    getDebate: (itemId) =>
      delay(clone(DEBATES.filter((d) => d.itemId === itemId)) as DebatePosition[]),

    getPriorDeltas: (reviewId) => {
      const r = stored(reviewId)
      if (!r) return fail(fmt(MESSAGES.noReview, { id: reviewId }))
      if (!r.priorReviewId) return delay(null)
      const prior = stored(r.priorReviewId)
      const priorDate = (prior?.createdAt ?? VEYLAND_PRIOR.priorDate).slice(0, 10)
      const cmp: PriorComparison =
        r.borrowerName === VEYLAND.borrowerName
          ? { ...clone(VEYLAND_PRIOR), priorReviewId: r.priorReviewId, priorDate }
          : {
              priorReviewId: r.priorReviewId,
              priorDate,
              deltas: [
                {
                  label: 'Sections populated',
                  prior: '6/6',
                  current: `${r.sectionsPopulated}/6`,
                  direction: 'neutral',
                },
                {
                  label: 'Open items',
                  prior: '0',
                  current: String(r.openItems),
                  direction: r.openItems > 0 ? 'worse' : 'neutral',
                },
              ],
            }
      return delay(cmp)
    },

    getPolicies: (reviewId) => {
      const r = stored(reviewId)
      if (!r) return fail(fmt(MESSAGES.noReview, { id: reviewId }))
      const ids = new Set(r.sections.flatMap((s) => s.items.map((it) => it.id)))
      const matched = POLICIES.filter((p) => p.itemIds.some((id) => ids.has(id)))
      const out: Policy[] =
        matched.length > 0
          ? clone(matched)
          : [
              { ...POLICIES[4], itemIds: [`${r.id}-wi-1`] },
              { ...POLICIES[2], itemIds: [`${r.id}-wi-2`] },
            ]
      return delay(out)
    },

    searchDocuments: (query, filters: DocumentFilters) => {
      // Query syntax (the "Advanced search" help): bare words match by stem
      // (any of them), "quoted phrases" must appear verbatim, -word excludes.
      const phrases: string[] = []
      const include: string[] = []
      const exclude: string[] = []
      for (const m of query.matchAll(/"([^"]+)"|(\S+)/g)) {
        if (m[1]) phrases.push(m[1].toLowerCase())
        else if (m[2]!.startsWith('-') && m[2]!.length > 1)
          exclude.push(m[2]!.slice(1).toLowerCase())
        else include.push(m[2]!.toLowerCase())
      }
      const qKey = query.trim().toLowerCase()
      const stemOf = (t: string) => t.slice(0, Math.max(5, t.length - 2))
      const stems = include.map(stemOf)
      const exStems = exclude.map(stemOf)
      const hasQuery = phrases.length + include.length > 0
      const markWords = (html: string, test: (w: string) => boolean, onHit: () => void) =>
        html
          .split(/(<mark>.*?<\/mark>)/)
          .map((seg) =>
            seg.startsWith('<mark>')
              ? seg
              : seg.replace(/[A-Za-z][A-Za-z$%.,0-9-]*/g, (w) => {
                  if (test(w.toLowerCase())) {
                    onHit()
                    return `<mark>${w}</mark>`
                  }
                  return w
                }),
          )
          .join('')
      const hits: Array<DocumentHit & { score?: number }> = []
      for (const p of PASSAGES) {
        if (filters.lob && filters.lob !== 'all' && p.lob !== filters.lob) continue
        if (
          filters.counterparty &&
          filters.counterparty !== 'all' &&
          p.counterparty !== filters.counterparty
        )
          continue
        if (filters.docType && filters.docType !== 'all' && p.docType !== filters.docType) continue
        const lower = p.snippet.toLowerCase()
        if (exStems.some((st) => lower.split(/[^a-z0-9$%.,-]+/).some((w) => w.startsWith(st))))
          continue
        if (phrases.some((ph) => !lower.includes(ph))) continue
        let score = phrases.length
        let html = escapeHtml(p.snippet)
        for (const ph of phrases) {
          html = html.replace(
            new RegExp(ph.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi'),
            (m) => `<mark>${m}</mark>`,
          )
        }
        if (stems.length)
          html = markWords(
            html,
            (w) => stems.some((st) => w.startsWith(st)),
            () => score++,
          )
        // First-class keys (ratified): borrower/counterparty name or RXM
        // match the passage regardless of its text; full-text stays as the
        // secondary capability.
        const keyHay = `${p.counterparty} ${p.rxm ?? ''}`.toLowerCase()
        const keyMatch = qKey.length > 0 && keyHay.includes(qKey)
        if (hasQuery && score === 0 && !keyMatch) continue
        if (keyMatch) score += 100
        hits.push({ ...p, snippetHtml: html, score })
      }
      // Relevance: matched terms, then passages that fed a review, then recency.
      hits.sort(
        (a, b) =>
          (b.score ?? 0) - (a.score ?? 0) ||
          Number(!!b.usedInReviewId) - Number(!!a.usedInReviewId) ||
          b.date.localeCompare(a.date),
      )
      for (const h of hits) delete h.score
      const result: DocumentSearchResult = {
        hits,
        totalPassages: hits.length,
        totalDocuments: new Set(hits.map((h) => h.fileName)).size,
        counterparties: [...new Set(PASSAGES.map((p) => p.counterparty))].sort(),
        docTypes: [...new Set(PASSAGES.map((p) => p.docType))].sort(),
      }
      return delay(result)
    },

    getDocumentText: (docId) => {
      const doc = DOCUMENTS.find((d) => d.docId === docId)
      if (!doc) return fail(fmt(MESSAGES.noDocument, { id: docId }))
      if (!doc.extracted) return fail(fmt(MESSAGES.notExtractedText, { file: doc.fileName }))
      const text: DocumentText = clone({
        docId: doc.docId,
        fileName: doc.fileName,
        pages: doc.pages,
        parsedAt: doc.parsedAt,
        extracted: doc.extracted,
        sections: doc.sections,
      })
      return delay(text)
    },

    downloadDocument: (docId) => {
      const doc = DOCUMENTS.find((d) => d.docId === docId)
      if (!doc) return fail(fmt(MESSAGES.noDocument, { id: docId }))
      // Placeholder bytes, not a real PDF: enough to exercise the download path.
      const body = `%PDF-1.4\n% Sentinel placeholder original — ${doc.fileName}\n`
      const result: ExportResult = {
        fileName: doc.fileName,
        blob: new Blob([body], { type: 'application/pdf' }),
      }
      return delay(result)
    },

    // ---- amend evidence (v1.4) ------------------------------------------

    searchRepository: (query, scope) => {
      // ONE document store, many lenses (v1.5): the repository view derives
      // from the index store — repoId IS the docId. Ratified search keys:
      // borrower/counterparty name or RXM (with or without the prefix),
      // case-insensitive substring; empty query = the whole scoped list.
      const q = query.trim().toLowerCase()
      let docs = DOCUMENTS.filter((d) => d.rxm)
      if (scope?.rxm) docs = docs.filter((d) => d.rxm === scope.rxm)
      if (scope?.notInReviewId) {
        const review = stored(scope.notInReviewId)
        if (!review) return fail(fmt(MESSAGES.noReview, { id: scope.notInReviewId }))
        const inReview = new Set(review.documents.map((d) => d.fileName))
        docs = docs.filter((d) => !inReview.has(d.fileName))
      }
      if (q.length > 0)
        docs = docs.filter((d) => `${d.counterparty} ${d.rxm}`.toLowerCase().includes(q))
      const out: RepositoryDoc[] = docs.map((d) => ({
        repoId: d.docId,
        rxm: d.rxm!,
        counterparty: d.counterparty,
        fileName: d.fileName,
        docType: d.docType,
        uploadedAt: d.date,
        pages: d.pages,
        parsed: d.extracted,
        docId: d.extracted ? d.docId : undefined,
      }))
      return delay(clone(out))
    },

    amendEvidence: (reviewId, source, why) => {
      const review = mutable(reviewId)
      assertOwner(review)
      if (!why.trim()) return fail(MESSAGES.whyRequired)
      const addedAt = new Date(now()).toISOString()
      let doc: ReviewDocument
      if (source.kind === 'repo') {
        const repo = DOCUMENTS.find((d) => d.docId === source.repoId && d.rxm === review.rxm)
        if (!repo) return fail(fmt(MESSAGES.noRepoDoc, { id: source.repoId }))
        if (review.documents.some((d) => d.fileName === repo.fileName))
          return fail(fmt(MESSAGES.alreadyInReview, { file: repo.fileName }))
        doc = {
          fileName: repo.fileName,
          kind: repo.docType,
          date: repo.date,
          pages: repo.pages,
          docId: repo.extracted ? repo.docId : undefined,
          origin: 'amended',
          addedAt,
          why: why.trim(),
        }
      } else {
        doc = {
          fileName: source.fileName,
          kind: 'uploaded document',
          date: addedAt.slice(0, 10),
          sizeBytes: source.sizeBytes,
          origin: 'amended',
          addedAt,
          why: why.trim(),
        }
      }
      review.documents.push(doc)
      review.evidenceAmendedAt = addedAt
      review.amendSettlesAt = new Date(now() + AMEND_SETTLE_MS).toISOString()
      save()
      return delay(clone(review))
    },

    // ---- Question sets (per-application v1.8) · CPEA workflow (CPEA + Inquiry) ----

    // Per-application shelves (v1.8): each store reads its own fixtures
    // plus its own saved sets — never another application's.
    getQuestionSets: (store) =>
      delay(clone([...FIXTURE_SETS[store], ...state.questionSets[store]])),

    addQuestionSet: (store, input) => {
      const name = input.name.trim()
      if (!name) return fail(MESSAGES.qsNameRequired)
      const id = `${store === 'vantage' ? 'vqs' : 'qs'}-user-${(now() % 1e8).toString(36)}`
      const read = (input.questions ?? []).map((q) => q.trim()).filter(Boolean)
      // a reviewed list with nothing left in it is not a set (never invent one)
      if (input.questions && read.length === 0) return fail(MESSAGES.qsNoQuestions)
      // really read = the demo file the mock can "parse"; anything else was placeholders
      const reallyRead = !!input.fileName && !!QUESTION_FILES[input.fileName.toLowerCase()]
      // With already-read questions (a reviewed file) those ARE the set.
      // Without them the mock parses nothing: a placeholder question list
      // (5 generic questions), labeled honestly in its description.
      const fields =
        read.length > 0
          ? read.map((question, i) => ({
              id: `${id}-q${i + 1}`,
              label: fmt(MESSAGES.qsPlaceholderLabel, { n: i + 1 }),
              question,
              outputType: 'text' as const,
              visible: i < 2,
              derivedAcceptable: true,
            }))
          : Array.from({ length: 5 }, (_, i) => ({
              id: `${id}-q${i + 1}`,
              label: fmt(MESSAGES.qsPlaceholderLabel, { n: i + 1 }),
              question: fmt(MESSAGES.qsPlaceholderQuestion, { n: i + 1, name }),
              outputType: 'text' as const,
              visible: i < 2,
              derivedAcceptable: true,
            }))
      const set: QuestionSet = {
        id,
        name,
        description:
          input.description.trim() ||
          (read.length > 0 && reallyRead
            ? fmt(read.length === 1 ? MESSAGES.qsFromFileDescOne : MESSAGES.qsFromFileDescOther, {
                n: read.length,
                file: input.fileName!,
              })
            : fmt(MESSAGES.qsPlaceholderDesc, { name })),
        fields,
      }
      state.questionSets[store].push(set)
      save()
      return delay(clone(set))
    },

    parseQuestionFile: (file) => {
      // THE CONTRACT the mock declares (parsing is backend work): .xlsx
      // (the first sheet) or .csv; the first column; one question per row;
      // blank cells skipped; row order kept; no header row. The mock reads no bytes: the demo
      // file parses to its fixture questions; any other file gets an
      // honestly labeled placeholder list.
      if (!/\.(xlsx|csv)$/i.test(file.name))
        return fail(fmt(MESSAGES.parseWrongType, { file: file.name }))
      if (file.size === 0) return fail(fmt(MESSAGES.parseEmpty, { file: file.name }))
      const known = QUESTION_FILES[file.name.toLowerCase()]
      if (known) return delay({ fileName: file.name, questions: [...known] })
      return delay({
        fileName: file.name,
        questions: Array.from({ length: 3 }, (_, i) =>
          fmt(MESSAGES.parsePlaceholder, { n: i + 1, file: file.name }),
        ),
        placeholder: true as const,
      })
    },

    searchBorrowers: (query) => {
      // Ratified search keys: name or RXM, case-insensitive substring,
      // RXM with or without the prefix. Empty query = the whole index.
      const q = query.trim().toLowerCase()
      const all = borrowerIndex()
      return delay(q ? all.filter((b) => `${b.name} ${b.rxm}`.toLowerCase().includes(q)) : all)
    },

    listPolicyDocs: () => delay(clone(POLICY_DOCS)),

    askPolicies: (question) => {
      if (!question.trim()) return fail(MESSAGES.emptyQuestion)
      // CAPABILITY PREVIEW: the answering engine is future work — every
      // question returns the one fixture answer so the UI contract is real.
      return delay(clone(POLICY_PREVIEW_ANSWER))
    },

    resolvePopulation: (criteria) => {
      // Unscoped, the demo resolves ONE population regardless of criteria
      // — the dropdown vocabulary is a deliberate placeholder (ratified
      // 2026-09-18); the criteria are echoed into the accounting so the
      // disclosure sentence reflects what was asked. A borrower criterion
      // (v1.8) resolves to that one borrower and ALL its documents on
      // system (in or out of the monitor scope).
      return delay({
        population: populationFor(criteria),
        documentCount: scopeDocuments(criteria).length,
      })
    },

    startRun: (app, input) => {
      const prompt = input.prompt?.trim() ?? ''
      if (input.questionSetId && prompt) return fail(MESSAGES.runOneMode)
      if (!input.questionSetId && !prompt)
        // Inquiry has no question sets: its message must not offer one
        return fail(app === 'erm' ? MESSAGES.runNeedsQuestion : MESSAGES.runNeedsQuestionOneOff)
      // Only CPEA keeps a shelf; Inquiry has question sets switched off.
      const shelf = app === 'erm' ? [...QUESTION_SETS, ...state.questionSets.erm] : []
      if (input.questionSetId && !shelf.some((q) => q.id === input.questionSetId))
        return fail(fmt(MESSAGES.noQuestionSet, { id: input.questionSetId }))
      const runId = `${app}-run-${new Date(now()).toISOString().slice(0, 10)}-${(now() % 1e7).toString(36)}`
      state.portfolioRuns[app][runId] = {
        runId,
        startedAt: new Date(now()).toISOString(),
        questionSetId: input.questionSetId,
        prompt: prompt || undefined,
        criteria: clone(input.criteria),
        // population scope and explicit documents union into one run
        documents: [...new Set([...scopeDocuments(input.criteria), ...(input.documents ?? [])])],
      }
      save()
      return delay({ runId })
    },

    getRun: (app, runId) => {
      const run = ermRunOf(app, runId)
      if (!run) return fail(fmt(MESSAGES.noRun, { id: runId }))
      return delay(run)
    },

    listRuns: (app) => {
      const started = Object.keys(state.portfolioRuns[app]).map((id) => ermRunOf(app, id)!)
      const all = [...started, ...clone(FIXTURE_RUNS[app])]
      all.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      return delay(all)
    },

    cancelRun: (app, runId) => {
      const rec = state.portfolioRuns[app][runId]
      if (!rec) return fail(fmt(MESSAGES.noRun, { id: runId }))
      const run = ermRunOf(app, runId)!
      if (run.state === 'running' || run.state === 'queued') {
        rec.cancelledAt = new Date(now()).toISOString()
        save()
      }
      return delay(ermRunOf(app, runId)!)
    },

    // ---- Vantage (v1.7; questions[] v1.8) ----------------------------------

    askDocuments: (questions, documents) => {
      const asked = questions.map((q) => q.trim()).filter(Boolean)
      if (asked.length === 0 || documents.length === 0) return fail(MESSAGES.vantageNeedsBoth)
      const runId = `vantage-run-${new Date(now()).toISOString().slice(0, 10)}-${(now() % 1e7).toString(36)}`
      state.vantageRuns[runId] = {
        runId,
        questions: asked,
        documents: clone(documents),
        startedAt: new Date(now()).toISOString(),
      }
      save()
      return delay({ runId })
    },

    getVantageRun: (runId) => {
      const run = vantageRunOf(runId)
      if (!run) return fail(fmt(MESSAGES.noVantageRun, { id: runId }))
      return delay(run)
    },

    listVantageRuns: () => {
      const started = Object.keys(state.vantageRuns).map((id) => vantageRunOf(id)!)
      const all = [...started, ...clone(VANTAGE_RUNS)]
      all.sort((a, b) => b.startedAt.localeCompare(a.startedAt))
      return delay(all)
    },

    cancelVantageRun: (runId) => {
      const rec = state.vantageRuns[runId]
      if (!rec) return fail(fmt(MESSAGES.noVantageRun, { id: runId }))
      const run = vantageRunOf(runId)!
      if (run.state === 'running' || run.state === 'queued') {
        rec.cancelledAt = new Date(now()).toISOString()
        save()
      }
      return delay(vantageRunOf(runId)!)
    },

    exportReview: (id) => {
      const rec = record(id)
      if (!rec) return fail(fmt(MESSAGES.noReview, { id }))
      if (rec.status !== 'ready') return fail(MESSAGES.stillProcessing)
      if (id === EXPORT_FAILS_ID) {
        return fail(fmt(MESSAGES.exportFailed, { rxm: rec.rxm }))
      }
      // Placeholder bytes, not a real OOXML package: enough to exercise the download path.
      const body = `Sentinel placeholder export — ${rec.borrowerName} · ${rec.rxm}\n`
      const blob = new Blob([body], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const result: ExportResult = {
        fileName: `${rec.rxm}_${rec.borrowerName.replace(/[^A-Za-z0-9]+/g, '_')}_Review.docx`,
        blob,
      }
      return delay(result)
    },
  }
}

export { CONFIDENCE_FLOOR, ME, VEYLAND_ID, VEYLAND_PRIOR_ID, EXPORT_FAILS_ID }
