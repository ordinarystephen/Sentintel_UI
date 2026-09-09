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
import { ApiError, type SentinelApi } from '../client'
import type {
  AttentionItem,
  ClearReason,
  DebatePosition,
  Disposition,
  DocumentFilters,
  DocumentHit,
  DocumentSearchResult,
  DocumentText,
  ExportResult,
  ExtractionSettings,
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
  respondEmpty: 'Say what to re-check, correct, or add before sending.',
  rationaleRequired: 'Add a one-line rationale — it is recorded with the clear.',
  notCleared: 'This item is not cleared.',
  flagsOnly: 'Only flags can be dismissed.',
  notProcessing: 'Review {id} is not processing.',
  stillProcessing: 'This review is still processing — export once it is ready.',
  exportFailed:
    'Export failed: the render service returned no document for {clId} (render-service: 502 Bad Gateway).',
  parseFailed: 'Could not parse {file}: the file is encrypted or damaged (parser: pdfplumber).',
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
 * (v1.1.2 — every borrower name, review/doc id, and filename changed).
 */
export const STATE_VERSION = 5

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
  contextText: string
  settings?: ExtractionSettings
  cancelledAt?: number
}

interface PersistedState {
  version: number
  overrides: Record<string, Review>
  processing: Record<string, ProcessingSeed>
  /** itemId → epoch ms when the re-run lands. */
  reRuns: Record<string, { until: number; text: string }>
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
    const fresh: PersistedState = {
      version: STATE_VERSION,
      overrides: {},
      processing: {},
      reRuns: {},
    }
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
    const documents: ReviewDocument[] = seed.files.map((f, i) => ({
      fileName: f.name,
      kind: i === 0 ? 'annual review' : 'quarterly update',
      date: new Date(seed.startedAt).toISOString().slice(0, 10),
      pages: Math.max(1, Math.round(f.size / 90_000)),
      sizeBytes: f.size,
    }))
    const pages = documents.reduce((n, d) => n + (d.pages ?? 0), 0)
    const base: Omit<ProcessingReview, 'status' | 'phase' | 'statusLine'> = {
      id: seed.id,
      borrowerName: detected ? VEYLAND.borrowerName : null,
      clId: detected ? VEYLAND.clId : null,
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
      state = { version: STATE_VERSION, overrides: {}, processing: {}, reRuns: {} }
      try {
        storage?.removeItem(STORAGE_KEY)
      } catch {
        /* ignore */
      }
    },

    me: () => delay(clone(ME)),

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
          const hay = [s.borrowerName, s.clId, s.sector].filter(Boolean).join(' ').toLowerCase()
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

    createReview: (files, contextText, settings) => {
      if (files.length === 0) return fail(MESSAGES.emptyUpload)
      const startedAt = now()
      const id = `rev-new-${startedAt.toString(36)}`
      state.processing[id] = {
        id,
        startedAt,
        files: files.map((f) => ({ name: f.name, size: f.size })),
        contextText,
        settings,
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
        if (hasQuery && score === 0) continue
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

    exportReview: (id) => {
      const rec = record(id)
      if (!rec) return fail(fmt(MESSAGES.noReview, { id }))
      if (rec.status !== 'ready') return fail(MESSAGES.stillProcessing)
      if (id === EXPORT_FAILS_ID) {
        return fail(fmt(MESSAGES.exportFailed, { clId: rec.clId }))
      }
      // Placeholder bytes, not a real OOXML package: enough to exercise the download path.
      const body = `Sentinel placeholder export — ${rec.borrowerName} · ${rec.clId}\n`
      const blob = new Blob([body], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      })
      const result: ExportResult = {
        fileName: `${rec.clId}_${rec.borrowerName.replace(/[^A-Za-z0-9]+/g, '_')}_Review.docx`,
        blob,
      }
      return delay(result)
    },
  }
}

export { CONFIDENCE_FLOOR, ME, VEYLAND_ID, VEYLAND_PRIOR_ID, EXPORT_FAILS_ID }
