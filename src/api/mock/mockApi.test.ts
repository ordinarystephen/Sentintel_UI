import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Review } from '../types'
import {
  AMEND_SETTLE_MS,
  createMockApi,
  EXPORT_FAILS_ID,
  ME,
  VEYLAND_ID,
  PROCESSING,
} from './mockApi'
import { amendReRunning } from '@/screens/review/amendState'

const T0 = Date.UTC(2026, 7, 29, 12, 0, 0)
const make = (storage: Storage | null = null) => createMockApi({ latencyMs: 0, storage })
const file = (name: string, size = 1_000_000) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' })
const asReview = (r: unknown) => r as Review

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
    const storage = new Map<string, string>()
    const fakeStorage = {
      getItem: (k: string) => storage.get(k) ?? null,
      setItem: (k: string, v: string) => void storage.set(k, v),
      removeItem: (k: string) => void storage.delete(k),
    } as Storage
    const api = make(fakeStorage)
    const before = await api.getQuestionSets()
    expect(before).toHaveLength(7)
    expect(before.map((q) => q.name)).toContain('Watchlist deep-dive')
    // counts match the ratified card grid
    expect(before.find((q) => q.name === 'Quarterly credit pulse')?.fields).toHaveLength(17)
    expect(before.find((q) => q.name === 'Liquidity stress pulse')?.fields).toHaveLength(7)

    await expect(api.addQuestionSet({ name: '  ', description: 'x' })).rejects.toThrow(/title/i)
    const saved = await api.addQuestionSet({
      name: 'My covenant follow-ups',
      description: 'Ad hoc follow-ups from the September committee.',
    })
    expect(saved.fields.length).toBeGreaterThan(0)
    const after = await api.getQuestionSets()
    expect(after).toHaveLength(8)
    // persists: a fresh api over the same storage still has it
    const again = await createMockApi({ latencyMs: 0, storage: fakeStorage }).getQuestionSets()
    expect(again.map((q) => q.name)).toContain('My covenant follow-ups')
  })
})
