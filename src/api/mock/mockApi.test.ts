import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Review } from '../types'
import { createMockApi, EXPORT_FAILS_ID, ME, MERIDIAN_ID, PROCESSING } from './mockApi'

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

  it('listMyReviews returns only my reviews, newest first, Meridian on top', async () => {
    const mine = await make().listMyReviews()
    expect(mine.every((r) => r.ownerId === ME.id)).toBe(true)
    expect(mine[0].id).toBe(MERIDIAN_ID)
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
    expect(wm.reviews.map((r) => r.borrowerName)).toContain('Verdant AgriChem')

    const chen = await api.listAllReviews({ ownerId: 'u-chen', period: 'all' })
    expect(chen.reviews.every((r) => r.ownerName === 'R. Chen')).toBe(true)

    const byCl = await api.listAllReviews({ query: 'cl6430', period: 'all' })
    expect(byCl.reviews.map((r) => r.id).sort()).toEqual(
      ['rev-meridian-2026-02', MERIDIAN_ID].sort(),
    )
    expect(byCl.reviews[0].repeatIndex).toBe(2)

    const bySector = await api.listAllReviews({ query: 'marine', period: 'all' })
    expect(bySector.reviews.length).toBeGreaterThanOrEqual(2)

    const recent = await api.listAllReviews({ period: '12m' })
    expect(recent.total).toBeLessThan(all.total)
  })
})

describe('getReview', () => {
  it('serves the Meridian fixture with the flag derived from the single floor', async () => {
    const r = asReview(await make().getReview(MERIDIAN_ID))
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
    expect(asReview(await api.getReview('rev-crestline-2026-08')).readOnly).toBe(true)
    await expect(api.getReview('nope')).rejects.toMatchObject({
      message: 'No review with id nope.',
    })
  })
})

describe('createReview / processing', () => {
  it('creates a durable record that names itself, then serves a Meridian copy', async () => {
    const api = make()
    const { id } = await api.createReview(
      [file('Acme_Annual.pdf'), file('Acme_Q3.pdf')],
      'What is revolver availability at close?\n\n',
    )
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
    expect(mine[0].borrowerName).toBe('Meridian US Holdco LLC')
    expect(mine[0].clId).toBe('CL6430')

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
    expect(r.priorReviewId).toBe(MERIDIAN_ID)
  })

  it('resumes from persisted state in a fresh instance (tab killed mid-processing)', async () => {
    const storage = localStorage
    const first = make(storage)
    const { id } = await first.createReview([file('Doc.pdf')], '')
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
    const { id } = await api.createReview([file('Doc.pdf')], '')
    await api.cancelReview(id)
    expect(await api.getReview(id)).toMatchObject({ id, status: 'cancelled' })
    await expect(api.cancelReview(MERIDIAN_ID)).rejects.toMatchObject({
      message: expect.stringContaining('not processing'),
    })
  })

  it('a damaged file fails loudly with the specific message', async () => {
    const api = make()
    const { id } = await api.createReview([file('Meridian_corrupt_scan.pdf')], '')
    vi.setSystemTime(T0 + PROCESSING.failAt)
    const st = await api.getReviewStatus(id)
    expect(st).toMatchObject({
      status: 'failed',
      error: {
        message:
          'Could not parse Meridian_corrupt_scan.pdf: the file is encrypted or damaged (parser: pdfplumber).',
      },
    })
  })

  it('rejects an empty upload', async () => {
    await expect(make().createReview([], '')).rejects.toMatchObject({
      message: 'Add at least one PDF to begin a review.',
    })
  })
})

describe('dispositions persist and are reflected in re-fetches', () => {
  it('attention: mark reviewed / unreview / edit note / dismiss flag', async () => {
    const api = make()
    await api.markReviewed('att-headroom', 'Headroom acceptable given prepayment cadence')
    let r = asReview(await api.getReview(MERIDIAN_ID))
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
    r = asReview(await api.getReview(MERIDIAN_ID))
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
    r = asReview(await api.getReview(MERIDIAN_ID))
    expect(r.attention.find((a) => a.id === 'att-concentration')?.state).toBe('dismissed')
    expect(r.openItems).toBe(3)
  })

  it('clear with a reason strikes the item; undo restores it; both stay in the trail', async () => {
    const api = make()
    const cleared = await api.clear('wi-2-liq', 'incorrect')
    expect(cleared.cleared).toMatchObject({ reason: 'incorrect', actorId: ME.id })
    const restored = await api.undoClear('wi-2-liq')
    expect(restored.cleared).toBeUndefined()
    const r = asReview(await api.getReview(MERIDIAN_ID))
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
    const r = asReview(await api.getReview(MERIDIAN_ID))
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
    let r = asReview(await api.getReview(MERIDIAN_ID))
    let wacc = r.sections[1].items.find((i) => i.id === 'wi-2-wacc')!
    expect(wacc.reRunning).toBe(true)
    expect(wacc.flags).toEqual(['review_required'])

    vi.setSystemTime(T0 + PROCESSING.reRun)
    r = asReview(await api.getReview(MERIDIAN_ID))
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
    await expect(api.clear('rev-crestline-2026-08-wi-1', 'not_applicable')).rejects.toMatchObject({
      message:
        'This review belongs to R. Chen — you can read it, but editing stays with its owner.',
    })
  })

  it('mutations survive a fresh instance over the same storage', async () => {
    const a = make(localStorage)
    await a.markReviewed('att-headroom', 'ok')
    const b = make(localStorage)
    expect(asReview(await b.getReview(MERIDIAN_ID)).openItems).toBe(3)
  })
})

describe('context rail data', () => {
  it('debate positions exist for the items that have them', async () => {
    const api = make()
    const d = await api.getDebate('wi-2-wacc')
    expect(d.map((p) => p.stance)).toEqual(['advocate', 'dissent'])
    expect(await api.getDebate('wi-2-debt')).toEqual([])
  })

  it('prior deltas only when the borrower has a prior review', async () => {
    const api = make()
    const cmp = await api.getPriorDeltas(MERIDIAN_ID)
    expect(cmp).toMatchObject({ priorReviewId: 'rev-meridian-2026-02', priorDate: '2026-02-14' })
    expect(cmp!.deltas.find((d) => d.label === 'Gross leverage')).toMatchObject({
      prior: '5.6x',
      current: '5.9x',
      direction: 'worse',
    })
    expect(await api.getPriorDeltas('rev-atlas-2026-08')).toBeNull()
  })

  it('policies cite the items they touched', async () => {
    const pols = await make().getPolicies(MERIDIAN_ID)
    expect(pols.find((p) => p.id === '1-G-007544 · §4.2')?.itemIds).toContain('wi-2-wacc')
    const other = await make().getPolicies('rev-atlas-2026-08')
    expect(other.length).toBeGreaterThan(0)
  })
})

describe('documents', () => {
  it('finds the revolver availability passages with marked terms', async () => {
    const res = await make().searchDocuments('revolver availability', {})
    const liq = res.hits.find((h) => h.id === 'doc-meridian-q3-liq')!
    expect(liq.snippetHtml).toContain('<mark>revolving</mark>')
    expect(liq.snippetHtml).toContain('<mark>availability</mark>')
    expect(liq.usedInReviewId).toBe(MERIDIAN_ID)
    expect(res.hits[0].id).toBe('doc-meridian-q3-liq') // most terms matched ranks first
    expect(res.totalDocuments).toBeGreaterThanOrEqual(2)
    expect(res.counterparties).toContain('Halcyon Marine Finance')
  })

  it('filters hit the seam', async () => {
    const api = make()
    const wm = await api.searchDocuments('', { lob: 'Wealth Management' })
    expect(wm.hits.map((h) => h.counterparty)).toEqual(['Verdant AgriChem'])
    const fa = await api.searchDocuments('', { docType: 'facility agreement' })
    expect(fa.hits).toHaveLength(1)
    const none = await api.searchDocuments('zebra', {})
    expect(none.hits).toEqual([])
  })
})

describe('export', () => {
  it('downloads a placeholder .docx for a ready review', async () => {
    const res = await make().exportReview(MERIDIAN_ID)
    expect(res.fileName).toBe('CL6430_Meridian_US_Holdco_LLC_Review.docx')
    expect(res.blob.type).toContain('wordprocessingml')
    expect(res.blob.size).toBeGreaterThan(0)
  })

  it('fails loudly for the failing fixture and for processing reviews', async () => {
    const api = make()
    await expect(api.exportReview(EXPORT_FAILS_ID)).rejects.toMatchObject({
      message:
        'Export failed: the render service returned no document for CL7712 (render-service: 502 Bad Gateway).',
    })
    const { id } = await api.createReview([file('Doc.pdf')], '')
    await expect(api.exportReview(id)).rejects.toMatchObject({
      message: expect.stringContaining('still processing'),
    })
  })
})
