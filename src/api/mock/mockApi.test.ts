import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Review } from '../types'
import {
  AMEND_SETTLE_MS,
  createMockApi,
  EXPORT_FAILS_ID,
  ME,
  MOCK_USER_KEY,
  STORAGE_KEY,
  VEYLAND_ID,
  PROCESSING,
} from './mockApi'
import { LEADERSHIP_USER } from './fixtures'
import { INQUIRY_DEMO_QUESTION } from './inquiryFixtures'
import { VANTAGE_DEMO_BLOCKS, VANTAGE_DEMO_DOCS, WATCHLIST_QS } from './vantageFixtures'
import { expectedGrade, gradeCounts } from '@/lib/ermModel'
import { amendReRunning } from '@/screens/review/amendState'

const T0 = Date.UTC(2026, 7, 29, 12, 0, 0)
const make = (storage: Storage | null = null) => createMockApi({ latencyMs: 0, storage })
const file = (name: string, size = 1_000_000) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' })
const asReview = (r: unknown) => r as Review
/** A Storage over a Map — lets a second api instance read what the first persisted. */
function mapStorage(): Storage {
  const store = new Map<string, string>()
  return {
    getItem: (k: string) => store.get(k) ?? null,
    setItem: (k: string, v: string) => void store.set(k, v),
    removeItem: (k: string) => void store.delete(k),
  } as Storage
}
const CRITERIA = {
  portfolio: 'IB Lending',
  subPortfolio: 'All sub-portfolios',
  region: 'All regions',
  asOf: 'Latest on system',
}

beforeEach(() => {
  vi.useFakeTimers({ now: T0 })
})
afterEach(() => {
  vi.useRealTimers()
})

describe('identity and lists', () => {
  it('me() is the fixed user', async () => {
    expect(await make().me()).toEqual(ME)
  })

  it('listMyReviews returns only my reviews, newest first, Veyland on top', async () => {
    const mine = await make().listMyReviews()
    expect(mine.every((r) => r.ownerId === ME.id)).toBe(true)
    expect(mine[0].id).toBe(VEYLAND_ID)
    expect(mine[0].openItems).toBe(4)
    for (let i = 1; i < mine.length; i++)
      expect(mine[i - 1].createdAt >= mine[i].createdAt).toBe(true)
  })

  it('listAllReviews applies search, LOB, owner and period server-side', async () => {
    const api = make()
    const all = await api.listAllReviews({ period: 'all' })
    expect(all.total).toBeGreaterThanOrEqual(40)
    expect(all.owners.map((o) => o.name)).toContain('R. Chen')

    const wm = await api.listAllReviews({ lob: 'Wealth Management', period: 'all' })
    expect(wm.reviews.length).toBeGreaterThan(0)
    expect(wm.reviews.every((r) => r.lob === 'Wealth Management')).toBe(true)
    expect(wm.reviews.map((r) => r.borrowerName)).toContain('Verloway AgriChem')

    const chen = await api.listAllReviews({ ownerId: 'u-chen', period: 'all' })
    expect(chen.reviews.every((r) => r.ownerName === 'R. Chen')).toBe(true)

    // RXM matches with or without the prefix (ratified search keys)
    const byRxm = await api.listAllReviews({ query: 'rxm-6430', period: 'all' })
    expect(byRxm.reviews.map((r) => r.id).sort()).toEqual(
      ['rev-veyland-2026-02', VEYLAND_ID].sort(),
    )
    expect(byRxm.reviews[0].repeatIndex).toBe(2)
    const bare = await api.listAllReviews({ query: '6430', period: 'all' })
    expect(bare.reviews.map((r) => r.id).sort()).toEqual(byRxm.reviews.map((r) => r.id).sort())

    const bySector = await api.listAllReviews({ query: 'marine', period: 'all' })
    expect(bySector.reviews.length).toBeGreaterThanOrEqual(2)

    const recent = await api.listAllReviews({ period: '12m' })
    expect(recent.total).toBeLessThan(all.total)
  })
})

describe('getReview', () => {
  it('serves the Veyland fixture with the flag derived from the single floor', async () => {
    const r = asReview(await make().getReview(VEYLAND_ID))
    expect(r.status).toBe('ready')
    expect(r.sections).toHaveLength(6)
    expect(r.sectionsPopulated).toBe(2)
    expect(r.openItems).toBe(4)
    expect(r.readOnly).toBe(false)
    const items = r.sections.flatMap((s) => s.items)
    const wacc = items.find((i) => i.id === 'wi-2-wacc')!
    expect(wacc.confidence).toBeLessThan(r.confidenceFloor)
    expect(wacc.flags).toEqual(['review_required'])
    expect(items.find((i) => i.id === 'wi-2-ev')!.flags).toEqual([])
    expect(items.find((i) => i.id === 'wi-2-leverage-flag')!.factor?.verdictState).toBe('stubbed')
  })

  it("marks another owner's review read-only and rejects unknown ids with a message", async () => {
    const api = make()
    expect(asReview(await api.getReview('rev-farrowdale-2026-08')).readOnly).toBe(true)
    await expect(api.getReview('nope')).rejects.toMatchObject({
      message: 'No review with id nope.',
    })
  })
})

describe('createReview / processing', () => {
  it('creates a durable record that names itself, then serves a Veyland copy', async () => {
    const api = make()
    const { id } = await api.createReview({
      files: [file('Acme_Annual.pdf'), file('Acme_Q3.pdf')],
      contextText: 'What is revolver availability at close?\n\n',
    })
    let mine = await api.listMyReviews()
    expect(mine[0]).toMatchObject({ id, status: 'processing', borrowerName: null })

    let st = await api.getReviewStatus(id)
    expect(st).toMatchObject({
      status: 'processing',
      phase: 'reading',
      statusLine: 'Reading Acme_Annual.pdf…',
    })

    vi.setSystemTime(T0 + PROCESSING.reading + 500)
    st = await api.getReviewStatus(id)
    expect(st).toMatchObject({ phase: 'indexing' })
    expect((st as { statusLine: string }).statusLine).toMatch(/^Indexing \d+ pages…$/)
    expect((await api.listMyReviews())[0].borrowerName).toBeNull()

    vi.setSystemTime(T0 + PROCESSING.detectBorrowerAt + 100)
    mine = await api.listMyReviews()
    expect(mine[0].borrowerName).toBe('Veyland US Holdco LLC')
    expect(mine[0].rxm).toBe('RXM-6430')

    vi.setSystemTime(T0 + PROCESSING.indexing + 100)
    expect(await api.getReviewStatus(id)).toMatchObject({
      phase: 'policy_checks',
      statusLine: 'Running policy checks…',
    })

    vi.setSystemTime(T0 + PROCESSING.total)
    expect(await api.getReviewStatus(id)).toEqual({ status: 'ready' })
    const r = asReview(await api.getReview(id))
    expect(r.status).toBe('ready')
    expect(r.documents.map((d) => d.fileName)).toEqual(['Acme_Annual.pdf', 'Acme_Q3.pdf'])
    expect(r.story.docsLine).toContain('Acme_Annual.pdf')
    const q = r.attention.filter((a) => a.kind === 'question')
    expect(q).toHaveLength(1)
    expect(q[0]).toMatchObject({
      title: 'What is revolver availability at close?',
      state: 'open',
      sectionN: 2,
    })
    expect(r.openItems).toBe(5)
    expect(r.priorReviewId).toBe(VEYLAND_ID)
  })

  it('resumes from persisted state in a fresh instance (tab killed mid-processing)', async () => {
    const storage = localStorage
    const first = make(storage)
    const { id } = await first.createReview({ files: [file('Doc.pdf')], contextText: '' })
    vi.setSystemTime(T0 + 6_000)
    const second = make(storage)
    expect(await second.getReviewStatus(id)).toMatchObject({
      status: 'processing',
      phase: 'indexing',
    })
    vi.setSystemTime(T0 + PROCESSING.total + 1)
    expect(asReview(await second.getReview(id)).status).toBe('ready')
    const third = make(storage)
    expect(asReview(await third.getReview(id)).status).toBe('ready')
  })

  it('cancel keeps the record with status cancelled', async () => {
    const api = make()
    const { id } = await api.createReview({ files: [file('Doc.pdf')], contextText: '' })
    await api.cancelReview(id)
    expect(await api.getReview(id)).toMatchObject({ id, status: 'cancelled' })
    await expect(api.cancelReview(VEYLAND_ID)).rejects.toMatchObject({
      message: expect.stringContaining('not processing'),
    })
  })

  it('a damaged file fails loudly with the specific message', async () => {
    const api = make()
    const { id } = await api.createReview({
      files: [file('Veyland_corrupt_scan.pdf')],
      contextText: '',
    })
    vi.setSystemTime(T0 + PROCESSING.failAt)
    const st = await api.getReviewStatus(id)
    expect(st).toMatchObject({
      status: 'failed',
      error: {
        message: 'Could not parse Veyland_corrupt_scan.pdf: the file is encrypted or damaged.',
      },
    })
  })

  it('rejects an empty upload', async () => {
    await expect(make().createReview({ files: [], contextText: '' })).rejects.toMatchObject({
      message: 'Add at least one PDF to begin a review.',
    })
  })
})

describe('dispositions persist and are reflected in re-fetches', () => {
  it('attention: mark reviewed / unreview / edit note / dismiss flag', async () => {
    const api = make()
    await api.markReviewed('att-headroom', 'Headroom acceptable given prepayment cadence')
    let r = asReview(await api.getReview(VEYLAND_ID))
    expect(r.openItems).toBe(3)
    expect(r.attention.find((a) => a.id === 'att-headroom')).toMatchObject({
      state: 'reviewed',
      note: 'Headroom acceptable given prepayment cadence',
    })
    expect(r.dispositions.at(-1)).toMatchObject({
      itemId: 'att-headroom',
      action: 'reviewed',
      actorId: ME.id,
      at: new Date(T0).toISOString(),
    })

    await api.editNote('att-headroom', 'Revised note')
    await api.unreview('att-headroom')
    r = asReview(await api.getReview(VEYLAND_ID))
    expect(r.attention.find((a) => a.id === 'att-headroom')?.state).toBe('open')
    expect(r.dispositions.map((d) => d.action).slice(-3)).toEqual([
      'reviewed',
      'note_edited',
      'unreviewed',
    ])

    await expect(api.dismissFlag('att-wacc')).rejects.toMatchObject({
      message: 'Only flags can be dismissed.',
    })
    await api.dismissFlag('att-concentration')
    r = asReview(await api.getReview(VEYLAND_ID))
    expect(r.attention.find((a) => a.id === 'att-concentration')?.state).toBe('dismissed')
    expect(r.openItems).toBe(3)
  })

  it('clear requires a rationale note, strikes the item; undo restores it; both stay in the trail', async () => {
    const api = make()
    await expect(api.clear('wi-2-liq', 'incorrect', '   ')).rejects.toMatchObject({
      message: 'Add a one-line rationale — it is recorded with the clear.',
    })
    const cleared = await api.clear('wi-2-liq', 'incorrect', 'Figure superseded by the Q3 update')
    expect(cleared.cleared).toMatchObject({
      reason: 'incorrect',
      note: 'Figure superseded by the Q3 update',
      actorId: ME.id,
    })
    const restored = await api.undoClear('wi-2-liq')
    expect(restored.cleared).toBeUndefined()
    const r = asReview(await api.getReview(VEYLAND_ID))
    expect(r.dispositions.slice(-2).map((d) => d.action)).toEqual([
      'cleared_incorrect',
      'clear_undone',
    ])
    await expect(api.undoClear('wi-2-liq')).rejects.toMatchObject({
      message: 'This item is not cleared.',
    })
  })

  it('verify lifts the review-required attention row', async () => {
    const api = make()
    const item = await api.verify('wi-2-wacc')
    expect(item.verifiedAt).toBe(new Date(T0).toISOString())
    const r = asReview(await api.getReview(VEYLAND_ID))
    expect(r.attention.find((a) => a.id === 'att-wacc')).toMatchObject({
      state: 'reviewed',
      note: 'Marked verified',
    })
    expect(r.openItems).toBe(3)
  })

  it('respond flips the item into re-running, then lands the adjusted value', async () => {
    const api = make()
    const pending = await api.respond('wi-2-wacc', 'Use 9.6% from the prior review')
    expect(pending.reRunning).toBe(true)
    expect(pending.disposition).toMatchObject({
      action: 'responded',
      note: 'Use 9.6% from the prior review',
    })
    let r = asReview(await api.getReview(VEYLAND_ID))
    let wacc = r.sections[1].items.find((i) => i.id === 'wi-2-wacc')!
    expect(wacc.reRunning).toBe(true)
    expect(wacc.flags).toEqual(['review_required'])

    vi.setSystemTime(T0 + PROCESSING.reRun)
    r = asReview(await api.getReview(VEYLAND_ID))
    wacc = r.sections[1].items.find((i) => i.id === 'wi-2-wacc')!
    expect(wacc.reRunning).toBe(false)
    expect(wacc.content).toEqual({ kind: 'keyValue', entries: [{ value: '9.6%' }] })
    expect(wacc.confidence).toBe(0.93)
    expect(wacc.flags).toEqual([])
    expect(r.attention.find((a) => a.id === 'att-wacc')?.state).toBe('reviewed')
    await expect(api.respond('wi-2-wacc', '   ')).rejects.toMatchObject({
      message: expect.stringContaining('before sending'),
    })
  })

  it("rejects mutations on another owner's review with a specific message", async () => {
    const api = make()
    await expect(
      api.clear('rev-farrowdale-2026-08-wi-1', 'not_applicable', 'n/a'),
    ).rejects.toMatchObject({
      message:
        'This review belongs to R. Chen — you can read it, but editing stays with its owner.',
    })
  })

  it('mutations survive a fresh instance over the same storage', async () => {
    const a = make(localStorage)
    await a.markReviewed('att-headroom', 'ok')
    const b = make(localStorage)
    expect(asReview(await b.getReview(VEYLAND_ID)).openItems).toBe(3)
  })
})

describe('context rail data', () => {
  it('debate positions exist for the items that have them', async () => {
    const api = make()
    const d = await api.getDebate('wi-2-wacc')
    expect(d.map((p) => p.stance)).toEqual(['advocate', 'dissent'])
    expect(d[0]).toMatchObject({ at: '2026-08-28T09:42:00Z', runId: 'run-veyland-2026-08' })
    expect(await api.getDebate('wi-2-debt')).toEqual([])
  })

  it('prior deltas only when the borrower has a prior review', async () => {
    const api = make()
    const cmp = await api.getPriorDeltas(VEYLAND_ID)
    expect(cmp).toMatchObject({ priorReviewId: 'rev-veyland-2026-02', priorDate: '2026-02-14' })
    expect(cmp!.deltas.find((d) => d.label === 'Gross leverage')).toMatchObject({
      prior: '5.6x',
      current: '5.9x',
      direction: 'worse',
    })
    expect(await api.getPriorDeltas('rev-ambervale-2026-08')).toBeNull()
  })

  it('policies cite the items they touched', async () => {
    const pols = await make().getPolicies(VEYLAND_ID)
    expect(pols.find((p) => p.id === 'ProcMan-DEMO · §4.2')?.itemIds).toContain('wi-2-wacc')
    const other = await make().getPolicies('rev-ambervale-2026-08')
    expect(other.length).toBeGreaterThan(0)
  })
})

describe('documents', () => {
  it('finds the revolver availability passages with marked terms', async () => {
    const res = await make().searchDocuments('revolver availability', {})
    const liq = res.hits.find((h) => h.id === 'doc-veyland-q3-liq')!
    expect(liq.snippetHtml).toContain('<mark>revolving</mark>')
    expect(liq.snippetHtml).toContain('<mark>availability</mark>')
    expect(liq.usedInReviewId).toBe(VEYLAND_ID)
    expect(res.hits[0].id).toBe('doc-veyland-q3-liq') // most terms matched ranks first
    expect(res.totalDocuments).toBeGreaterThanOrEqual(2)
    expect(res.counterparties).toContain('Seldwyn Marine Finance')
  })

  it('advanced syntax: "quoted phrases" must appear verbatim; -word excludes', async () => {
    const api = make()
    const phrase = await api.searchDocuments('"letters of credit"', {})
    expect(phrase.hits.map((h) => h.id).sort()).toEqual(['doc-seldwyn-fa-72', 'doc-veyland-q3-liq'])
    expect(phrase.hits[0].snippetHtml).toMatch(/<mark>letters of credit<\/mark>/i)
    const minus = await api.searchDocuments('revolver -letters', {})
    expect(minus.hits.map((h) => h.id)).not.toContain('doc-veyland-q3-liq')
    expect(minus.hits.map((h) => h.id)).toContain('doc-veyland-annual-cov')
    expect(minus.hits[0].snippet).not.toContain('<mark>')
  })

  it('filters hit the seam', async () => {
    const api = make()
    const wm = await api.searchDocuments('', { lob: 'Wealth Management' })
    expect(wm.hits.map((h) => h.counterparty)).toEqual(['Verloway AgriChem'])
    const fa = await api.searchDocuments('', { docType: 'facility agreement' })
    expect(fa.hits).toHaveLength(1)
    const none = await api.searchDocuments('zebra', {})
    expect(none.hits).toEqual([])
  })
})

describe('areas of assessment + reference data', () => {
  it('Veyland carries the 8 areas and the reference snapshot; complete reviews carry fully-rated zones', async () => {
    const api = make()
    const r = asReview(await api.getReview(VEYLAND_ID))
    expect(r.areas).toHaveLength(8)
    const pending = r.areas.find((a) => a.rating === 'pending')!
    expect(pending).toMatchObject({
      id: 'aa-repay-secondary',
      blockedBy: 'wi-2-wacc',
      sectionRefs: [2],
    })
    expect(r.areas.filter((a) => a.rating === 'satisfactory')).toHaveLength(6)
    expect(r.referenceData).toMatchObject({ asOf: '2026-08-15' })
    expect(r.referenceData!.fields).toHaveLength(6)
    expect(r.referenceData!.fields.find((f) => f.label === 'Reference number')).toMatchObject({
      value: '3117-04',
      source: 'crr',
    })

    // areas are structural to every review: completed reviews are fully rated
    const ambervale = asReview(await api.getReview('rev-ambervale-2026-08'))
    expect(ambervale.areas).toHaveLength(8)
    expect(ambervale.areas.filter((a) => a.rating === 'satisfactory')).toHaveLength(7)
    expect(ambervale.areas.filter((a) => a.rating === 'pending')).toHaveLength(0)
    expect(ambervale.areas[0].id).toBe('rev-ambervale-2026-08-aa-structure') // ids namespaced per review
    expect(ambervale.referenceData).toBeUndefined()
  })

  it('setAreaRating records a disposition, updates the rating, and persists', async () => {
    const api = make(localStorage)
    await api.setAreaRating('aa-repay-secondary', 'satisfactory')
    const r = asReview(await api.getReview(VEYLAND_ID))
    expect(r.areas.find((a) => a.id === 'aa-repay-secondary')?.rating).toBe('satisfactory')
    expect(r.dispositions.at(-1)).toMatchObject({
      itemId: 'aa-repay-secondary',
      action: 'area_rated',
      note: 'satisfactory',
      actorId: ME.id,
    })
    const fresh = make(localStorage)
    expect(
      asReview(await fresh.getReview(VEYLAND_ID)).areas.find((a) => a.id === 'aa-repay-secondary')
        ?.rating,
    ).toBe('satisfactory')
    await expect(api.setAreaRating('nope', 'satisfactory')).rejects.toMatchObject({
      message: 'No assessment area with id nope.',
    })
  })
})

describe('document text and download', () => {
  it("returns the extracted text organized by the document's own sections", async () => {
    const api = make()
    const text = await api.getDocumentText('doc-veyland-q3')
    expect(text.fileName).toBe('Veyland_Holdco_Q3_Update.pdf')
    expect(text.pages).toBe(15)
    expect(text.extracted).toBe(true)
    expect(text.sections).toHaveLength(5)
    expect(text.sections[4]).toMatchObject({
      title: 'Liquidity Summary',
      pageStart: 14,
      pageEnd: 15,
    })
    expect(text.sections[4].text).toContain('$150 million revolving credit facility')
  })

  it('rejects not-yet-extracted documents and unknown ids with messages', async () => {
    const api = make()
    await expect(api.getDocumentText('doc-farrowdale-q2')).rejects.toMatchObject({
      message:
        'Farrowdale_Logistics_Q2_Update.pdf has not been extracted yet — the preview arrives when parsing completes.',
    })
    await expect(api.getDocumentText('nope')).rejects.toMatchObject({
      message: 'No document with id nope.',
    })
  })

  it('downloads the original as a placeholder PDF', async () => {
    const r = await make().downloadDocument('doc-veyland-annual')
    expect(r.fileName).toBe('Veyland_Holdco_Annual_Review_FY25.pdf')
    expect(r.blob.type).toBe('application/pdf')
    expect(r.blob.size).toBeGreaterThan(0)
  })

  it('search hits carry the document id', async () => {
    const res = await make().searchDocuments('revolver availability', {})
    expect(res.hits.find((h) => h.id === 'doc-veyland-q3-liq')?.docId).toBe('doc-veyland-q3')
  })
})

describe('export', () => {
  it('downloads a placeholder .docx for a ready review', async () => {
    const res = await make().exportReview(VEYLAND_ID)
    expect(res.fileName).toBe('RXM-6430_Veyland_US_Holdco_LLC_Review.docx')
    expect(res.blob.type).toContain('wordprocessingml')
    expect(res.blob.size).toBeGreaterThan(0)
  })

  it('fails loudly for the failing fixture and for processing reviews', async () => {
    const api = make()
    await expect(api.exportReview(EXPORT_FAILS_ID)).rejects.toMatchObject({
      message:
        'Export failed: the render service returned no document for RXM-7712 (render-service: 502 Bad Gateway).',
    })
    const { id } = await api.createReview({ files: [file('Doc.pdf')], contextText: '' })
    await expect(api.exportReview(id)).rejects.toMatchObject({
      message: expect.stringContaining('still processing'),
    })
  })
})

describe('amend evidence (v1.4)', () => {
  it('searchRepository (shared contract): scopes by rxm/review, honors the ratified keys', async () => {
    const api = make()
    const scope = { rxm: 'RXM-6430', notInReviewId: VEYLAND_ID }
    const all = await api.searchRepository('', scope)
    expect(all.map((r) => r.repoId).sort()).toEqual(['doc-veyland-cov', 'doc-veyland-ra2'])
    // name or RXM, with or without the prefix — case-insensitive
    expect((await api.searchRepository('veyland', scope)).length).toBe(2)
    expect((await api.searchRepository('6430', scope)).length).toBe(2)
    expect((await api.searchRepository('RXM-6430', scope)).length).toBe(2)
    expect((await api.searchRepository('northgale', scope)).length).toBe(0)
    // unscoped: the whole shared repository (every on-system doc with an RXM)
    const everything = await api.searchRepository('')
    expect(everything.length).toBeGreaterThanOrEqual(19)
    expect(everything.every((r) => r.rxm && r.counterparty)).toBe(true)
  })

  it('amendEvidence requires a rationale, records origin/addedAt/why, re-runs then settles', async () => {
    const api = make()
    await expect(
      api.amendEvidence(VEYLAND_ID, { kind: 'repo', repoId: 'doc-veyland-cov' }, '   '),
    ).rejects.toThrow(/rationale/i)

    const r = await api.amendEvidence(
      VEYLAND_ID,
      { kind: 'repo', repoId: 'doc-veyland-cov' },
      'Credit officer provided the June compliance certificate after the review opened',
    )
    expect(r.documents).toHaveLength(3)
    const added = r.documents.find((d) => d.origin === 'amended')!
    expect(added.fileName).toBe('Veyland_Holdco_Covenant_Cert_2026-06.pdf')
    expect(added.docId).toBe('doc-veyland-cov')
    expect(added.why).toMatch(/June compliance certificate/)
    expect(r.evidenceAmendedAt).toBeTruthy()
    // impacted checks re-run, then settle at the known instant
    expect(amendReRunning(r, T0)).toBe(true)
    expect(amendReRunning(r, T0 + AMEND_SETTLE_MS + 1)).toBe(false)
    // the repository no longer offers what the review already holds
    expect(
      (await api.searchRepository('', { rxm: 'RXM-6430', notInReviewId: VEYLAND_ID })).map(
        (x) => x.repoId,
      ),
    ).toEqual(['doc-veyland-ra2'])
    // an upload path lands too, without a docId (not yet parsed)
    const r2 = await api.amendEvidence(
      VEYLAND_ID,
      { kind: 'upload', fileName: 'Veyland_Site_Visit_Notes.pdf', sizeBytes: 500_000 },
      'Site visit notes from the September meeting',
    )
    const up = r2.documents.find((d) => d.fileName === 'Veyland_Site_Visit_Notes.pdf')!
    expect(up.origin).toBe('amended')
    expect(up.docId).toBeUndefined()
  })

  it('searchDocuments: borrower name and RXM are first-class keys; full text stays secondary', async () => {
    const api = make()
    const byRxm = await api.searchDocuments('6430', {})
    expect(byRxm.hits.length).toBeGreaterThan(0)
    expect(byRxm.hits.every((h) => h.counterparty === 'Veyland US Holdco')).toBe(true)
    const byName = await api.searchDocuments('ambervale', {})
    expect(byName.hits.some((h) => h.counterparty === 'Ambervale Foods Group')).toBe(true)
    const fullText = await api.searchDocuments('revolver availability', {})
    expect(fullText.hits.length).toBeGreaterThan(0)
  })
})

describe('question-set store (v1.6)', () => {
  it('7 fixture sets ship; Add-new appends a persisted set with an honest placeholder list', async () => {
    const fakeStorage = mapStorage()
    const api = make(fakeStorage)
    const before = await api.getQuestionSets('erm')
    expect(before).toHaveLength(7)
    expect(before.map((q) => q.name)).toContain('Watchlist deep-dive')
    // counts match the ratified card grid
    expect(before.find((q) => q.name === 'Quarterly credit pulse')?.fields).toHaveLength(17)
    expect(before.find((q) => q.name === 'Liquidity stress pulse')?.fields).toHaveLength(7)

    await expect(api.addQuestionSet('erm', { name: '  ', description: 'x' })).rejects.toThrow(
      /title/i,
    )
    const saved = await api.addQuestionSet('erm', {
      name: 'My covenant follow-ups',
      description: 'Ad hoc follow-ups from the September committee.',
    })
    expect(saved.fields.length).toBeGreaterThan(0)
    const after = await api.getQuestionSets('erm')
    expect(after).toHaveLength(8)
    // persists: a fresh api over the same storage still has it
    const again = await createMockApi({ latencyMs: 0, storage: fakeStorage }).getQuestionSets('erm')
    expect(again.map((q) => q.name)).toContain('My covenant follow-ups')
  })
})

describe('question-set stores are per-application (v1.8)', () => {
  it('each shelf starts from its own fixtures only: CPEA 7 untouched, Vantage the concept’s 2', async () => {
    const api = make()
    const erm = await api.getQuestionSets('erm')
    const vantage = await api.getQuestionSets('vantage')
    expect(erm).toHaveLength(7)
    expect(vantage.map((q) => `${q.name} · ${q.fields.length}q`)).toEqual([
      'Exposure limits sweep · 6q',
      'Key-customer scan · 4q',
    ])
    const ermIds = new Set(erm.map((q) => q.id))
    expect(vantage.some((q) => ermIds.has(q.id))).toBe(false)
  })

  it('ISOLATION: a set saved in one application never appears in the other — live or after reload', async () => {
    const storage = mapStorage()
    const api = make(storage)
    const inVantage = await api.addQuestionSet('vantage', {
      name: 'Watchlist Qs',
      description: '',
      fileName: 'Watchlist_Qs.xlsx',
      questions: WATCHLIST_QS,
    })
    const inCpea = await api.addQuestionSet('erm', { name: 'CPEA-only set', description: 'x' })

    const vantage = await api.getQuestionSets('vantage')
    const erm = await api.getQuestionSets('erm')
    expect(vantage.map((q) => q.id)).toContain(inVantage.id)
    expect(vantage.map((q) => q.id)).not.toContain(inCpea.id)
    expect(erm.map((q) => q.id)).toContain(inCpea.id)
    expect(erm.map((q) => q.id)).not.toContain(inVantage.id)
    expect(erm).toHaveLength(8)
    expect(vantage).toHaveLength(3)

    // the same holds for a fresh instance over the same persisted state
    const reloaded = make(storage)
    expect((await reloaded.getQuestionSets('vantage')).map((q) => q.name)).toEqual([
      'Exposure limits sweep',
      'Key-customer scan',
      'Watchlist Qs',
    ])
    expect((await reloaded.getQuestionSets('erm')).map((q) => q.name)).not.toContain('Watchlist Qs')
    expect((await reloaded.getQuestionSets('vantage')).map((q) => q.name)).not.toContain(
      'CPEA-only set',
    )
  })

  it('saving a reviewed file keeps its questions verbatim, in order, and describes itself honestly', async () => {
    const set = await make().addQuestionSet('vantage', {
      name: 'Watchlist Qs',
      description: '',
      fileName: 'Watchlist_Qs.xlsx',
      questions: WATCHLIST_QS.slice(0, 12),
    })
    expect(set.fields.map((f) => f.question)).toEqual(WATCHLIST_QS.slice(0, 12))
    expect(set.description).toBe('12 questions from Watchlist_Qs.xlsx.')
  })

  it('never invents a set: a reviewed list with nothing kept is refused; placeholders say so', async () => {
    const api = make()
    await expect(
      api.addQuestionSet('vantage', { name: 'Empty', description: '', questions: [' '] }),
    ).rejects.toThrow(/at least one question/)
    const parsed = await api.parseQuestionFile(
      new File([new Uint8Array(9)], 'Covenant_Qs.xlsx', { type: 'application/octet-stream' }),
    )
    expect(parsed.placeholder).toBe(true)
    const saved = await api.addQuestionSet('erm', {
      name: 'Covenant follow-ups',
      description: '',
      fileName: 'Covenant_Qs.xlsx',
      questions: parsed.questions,
    })
    // nothing was really read — the card must not claim it was
    expect(saved.description).toMatch(/placeholder questions/)
    expect(saved.description).not.toMatch(/read from/)
  })
})

describe('question file parse (v1.8 — the mock declares the contract)', () => {
  const xlsx = (name: string, size = 9_000) =>
    new File([new Uint8Array(size)], name, {
      type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    })

  it('the demo file reads back its 14 questions, in row order', async () => {
    const parsed = await make().parseQuestionFile(xlsx('Watchlist_Qs.xlsx'))
    expect(parsed.fileName).toBe('Watchlist_Qs.xlsx')
    expect(parsed.questions).toHaveLength(14)
    expect(parsed.questions[0]).toBe('Has covenant headroom been recomputed at the revised EBITDA?')
    expect(parsed.questions).toEqual(WATCHLIST_QS)
    expect(parsed.placeholder).toBeUndefined()
  })

  it('any other file gets an honestly labeled placeholder list; wrong types and empty files reject', async () => {
    const api = make()
    const other = await api.parseQuestionFile(xlsx('Covenant_Qs.xlsx'))
    expect(other.questions.length).toBeGreaterThan(0)
    expect(other.questions.every((q) => /placeholder/i.test(q))).toBe(true)
    await expect(api.parseQuestionFile(xlsx('notes.docx'))).rejects.toThrow(/\.xlsx/)
    await expect(api.parseQuestionFile(xlsx('Empty.xlsx', 0))).rejects.toThrow(/empty/)
  })
})

describe('borrower scope (v1.8)', () => {
  it('searchBorrowers: the index by name or RXM, with or without the prefix', async () => {
    const api = make()
    expect((await api.searchBorrowers('')).length).toBe(7)
    expect((await api.searchBorrowers('amber')).map((b) => b.rxm)).toEqual(['RXM-5120'])
    expect((await api.searchBorrowers('5120')).map((b) => b.name)).toEqual([
      'Ambervale Foods Group',
    ])
    expect((await api.searchBorrowers('rxm-6430'))[0]).toMatchObject({
      name: 'Veyland US Holdco LLC',
      documentCount: 4,
    })
    expect(await api.searchBorrowers('zzz')).toEqual([])
  })

  it('resolvePopulation with a borrower: 1 included, nothing excluded, ALL their documents', async () => {
    const api = make()
    const borrower = { rxm: 'RXM-5120', name: 'Ambervale Foods Group' }
    const { population, documentCount } = await api.resolvePopulation({ ...CRITERIA, borrower })
    expect(population.included).toEqual([borrower])
    expect(population.excluded).toEqual([])
    expect(population.indeterminate).toEqual([])
    expect(population.criteria.borrower).toEqual(borrower)
    // every document on system, in or out of the monitor scope (the concept's "5 documents")
    expect(documentCount).toBe(5)
    // no silent change elsewhere: unscoped still resolves the canonical population
    const unscoped = await api.resolvePopulation(CRITERIA)
    expect(unscoped.population.included).toHaveLength(6)
    expect(unscoped.documentCount).toBe(11)
  })

  it('a scoped run’s accounting names the borrower as its criterion; answers are that borrower’s only', async () => {
    const api = make()
    const borrower = { rxm: 'RXM-6430', name: 'Veyland US Holdco LLC' }
    const { runId } = await api.startRun('erm', {
      questionSetId: 'qs-quarterly-pulse',
      criteria: { ...CRITERIA, borrower },
    })
    vi.setSystemTime(T0 + 60_000)
    const run = await api.getRun('erm', runId)
    expect(run.state).toBe('completed')
    expect(run.criteria.borrower).toEqual(borrower)
    expect(run.population.criteria.borrower).toEqual(borrower)
    expect(run.population.included).toEqual([borrower])
    expect(run.documents).toHaveLength(4)
    expect(run.answers).toHaveLength(17)
    expect(new Set(run.answers.map((a) => a.rxm))).toEqual(new Set(['RXM-6430']))
  })

  it('a borrower with no canonical answers gets honest unsupported answers, never blanks', async () => {
    const api = make()
    const { runId } = await api.startRun('inquiry', {
      prompt: 'Any refinancing risk?',
      criteria: { ...CRITERIA, borrower: { rxm: 'RXM-8093', name: 'Farrowdale Logistics' } },
    })
    vi.setSystemTime(T0 + 60_000)
    const run = await api.getRun('inquiry', runId)
    expect(run.answers).toHaveLength(1)
    expect(run.answers[0]).toMatchObject({ rxm: 'RXM-8093', grade: 'unsupported' })
    expect(run.answers[0].limitations).toBeTruthy()
  })
})

describe('prompt-only runs ask exactly one question (v1.8)', () => {
  it('a run needs a question: an empty prompt with no set rejects; prompt AND set rejects', async () => {
    const api = make()
    await expect(api.startRun('erm', { prompt: '   ', criteria: CRITERIA })).rejects.toThrow(
      /question/i,
    )
    await expect(
      api.startRun('erm', { prompt: 'x', questionSetId: 'qs-quarterly-pulse', criteria: CRITERIA }),
    ).rejects.toThrow(/not both/)
  })

  it('completes with ONE answer per borrower, graded by the decision table', async () => {
    const api = make()
    const { runId } = await api.startRun('erm', {
      prompt: 'Which borrowers face refinancing risk?',
      criteria: CRITERIA,
    })
    vi.setSystemTime(T0 + 60_000)
    const run = await api.getRun('erm', runId)
    expect(run.questionSetId).toBeUndefined()
    expect(run.prompt).toBe('Which borrowers face refinancing risk?')
    expect(run.answers).toHaveLength(6)
    expect(new Set(run.answers.map((a) => a.questionId))).toEqual(new Set(['prompt']))
    for (const a of run.answers) expect(a.grade).toBe(expectedGrade(a))
    expect(gradeCounts(run.answers)).toEqual({ stated: 4, derived: 1, unsupported: 1 })
  })
})

describe('app-scoped run stores (v1.8 — Inquiry keeps its own Runs)', () => {
  it('Inquiry’s fixture runs: the demo + two history runs + one cancelled, never in CPEA’s list', async () => {
    const api = make()
    const inquiry = await api.listRuns('inquiry')
    expect(inquiry.map((r) => r.state)).toEqual([
      'completed',
      'completed',
      'completed',
      'cancelled',
    ])
    expect(inquiry[0].prompt).toBe(INQUIRY_DEMO_QUESTION)
    expect(inquiry.every((r) => !r.questionSetId)).toBe(true)
    expect(gradeCounts(inquiry[0].answers)).toEqual({ stated: 4, derived: 1, unsupported: 1 })
    // the demo's grades come from the decision table, never typed
    for (const a of inquiry[0].answers) expect(a.grade).toBe(expectedGrade(a))
    const erm = await api.listRuns('erm')
    expect(erm).toHaveLength(3)
    expect(erm.some((r) => r.runId.startsWith('inquiry-'))).toBe(false)
  })

  it('a run started in one application is invisible to the other', async () => {
    const api = make()
    const { runId } = await api.startRun('inquiry', { prompt: 'One question', criteria: CRITERIA })
    expect((await api.listRuns('inquiry')).map((r) => r.runId)).toContain(runId)
    expect((await api.listRuns('erm')).map((r) => r.runId)).not.toContain(runId)
    await expect(api.getRun('erm', runId)).rejects.toThrow(/No run/)
    await expect(api.cancelRun('erm', runId)).rejects.toThrow(/No run/)
  })

  it('Inquiry has question sets switched off: a set run is refused', async () => {
    await expect(
      make().startRun('inquiry', { questionSetId: 'qs-quarterly-pulse', criteria: CRITERIA }),
    ).rejects.toThrow(/No question set/)
  })

  it('unscoped CPEA set runs are untouched: the canonical store, byte for byte', async () => {
    const api = make()
    const { runId } = await api.startRun('erm', {
      questionSetId: 'qs-quarterly-pulse',
      criteria: CRITERIA,
    })
    vi.setSystemTime(T0 + 60_000)
    const run = await api.getRun('erm', runId)
    const canonical = (await api.getRun('erm', 'erm-run-2026-09-18-0912')).answers
    expect(run.answers).toEqual(canonical)
  })
})

describe('Vantage runs carry questions[] (v1.8)', () => {
  it('one question: the demo answer, exactly as v1.7', async () => {
    const api = make()
    const { runId } = await api.askDocuments(['Anything above the limit?'], VANTAGE_DEMO_DOCS)
    vi.setSystemTime(T0 + 60_000)
    const run = await api.getVantageRun(runId)
    expect(run.questions).toEqual(['Anything above the limit?'])
    expect(run.sections).toEqual([
      { question: 'Anything above the limit?', blocks: VANTAGE_DEMO_BLOCKS },
    ])
  })

  it('many questions: one section per question, in the order asked; blanks never count', async () => {
    const api = make()
    const asked = ['Typed question?', ...WATCHLIST_QS]
    const { runId } = await api.askDocuments([...asked, '  '], VANTAGE_DEMO_DOCS)
    vi.setSystemTime(T0 + 60_000)
    const run = await api.getVantageRun(runId)
    expect(run.questions).toEqual(asked)
    expect(run.sections.map((sec) => sec.question)).toEqual(asked)
    expect(run.sections.every((sec) => sec.blocks.length > 0)).toBe(true)
  })

  it('needs at least one question and one document', async () => {
    const api = make()
    await expect(api.askDocuments([' '], VANTAGE_DEMO_DOCS)).rejects.toThrow(/at least one/)
    await expect(api.askDocuments(['q'], [])).rejects.toThrow(/at least one/)
  })

  it('persisted runs survive a reload in the new shape', async () => {
    const storage = mapStorage()
    const { runId } = await make(storage).askDocuments(['A?', 'B?'], VANTAGE_DEMO_DOCS)
    const saved = JSON.parse(storage.getItem(STORAGE_KEY)!)
    expect(saved.vantageRuns[runId].questions).toEqual(['A?', 'B?'])
    vi.setSystemTime(T0 + 60_000)
    expect((await make(storage).getVantageRun(runId)).sections).toHaveLength(2)
  })
})

describe('mock sign-in switch (v1.8)', () => {
  it('sentinel.mock.user picks the inquiry-only leadership user; unset is the demo user', async () => {
    const storage = mapStorage()
    expect((await make(storage).me()).entitlements).toEqual(['crr', 'erm', 'vantage', 'inquiry'])
    storage.setItem(MOCK_USER_KEY, 'u-leadership')
    expect(await make(storage).me()).toEqual(LEADERSHIP_USER)
    expect(LEADERSHIP_USER.entitlements).toEqual(['inquiry'])
    storage.setItem(MOCK_USER_KEY, 'u-nobody')
    expect(await make(storage).me()).toEqual(ME)
  })
})

describe('fixture integrity: evidence comes from the run’s own documents', () => {
  it('every quote in every completed fixture run cites a document IN that run’s scope', async () => {
    const api = make()
    for (const app of ['erm', 'inquiry'] as const)
      for (const run of await api.listRuns(app)) {
        const scope = new Set(run.documents)
        const outside = run.answers
          .flatMap((a) => a.evidenceRefs.map((r) => `${a.rxm} → ${r.fileName}`))
          .filter((s) => !scope.has(s.split(' → ')[1]))
        expect({ run: run.runId, outside }).toEqual({ run: run.runId, outside: [] })
      }
  })
})
