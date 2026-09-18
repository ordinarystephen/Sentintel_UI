import { describe, expect, it } from 'vitest'
import { expectedGrade, flagCount, gradeCounts } from './ermModel'
import { ERM_ANSWERS, ERM_BORROWERS, ERM_POPULATION, QUARTERLY_PULSE } from '@/api/mock/ermFixtures'
import { buildReviews } from '@/api/mock/fixtures'

describe('the grading decision table', () => {
  const ref = { fileName: 'x', sectionName: 's', page: 1, quote: 'q' }
  it('stated only with an entailing quote attached', () => {
    expect(expectedGrade({ evidenceRefs: [ref] })).toBe('stated')
  })
  it('derived only with inferredFrom naming stated inputs — even when evidence is present', () => {
    expect(expectedGrade({ inferredFrom: ['lev'], evidenceRefs: [ref] })).toBe('derived')
    expect(expectedGrade({ inferredFrom: ['lev'], evidenceRefs: [] })).toBe('derived')
  })
  it('else unsupported — retrieval similarity never grades', () => {
    expect(expectedGrade({ evidenceRefs: [] })).toBe('unsupported')
    expect(expectedGrade({ inferredFrom: [], evidenceRefs: [] })).toBe('unsupported')
  })
  it('every fixture answer conforms to the table (data cannot diverge from the contract)', () => {
    for (const a of ERM_ANSWERS) expect(a.grade).toBe(expectedGrade(a))
  })
})

describe('row flag counts are computed, never stored', () => {
  it('Redfenn carries 8 unsupported answers; clean rows carry none', () => {
    expect(flagCount(ERM_ANSWERS, 'RXM-6292')).toBe(8)
    expect(flagCount(ERM_ANSWERS, 'RXM-4100')).toBe(0)
  })
  it('grade totals sum to borrowers × questions', () => {
    const c = gradeCounts(ERM_ANSWERS)
    expect(c.stated + c.derived + c.unsupported).toBe(6 * QUARTERLY_PULSE.fields.length)
    expect(c.unsupported).toBe(8)
  })
})

describe('population accounting', () => {
  it('6 included · 3 excluded (named reasons) · 1 indeterminate', () => {
    expect(ERM_POPULATION.included).toHaveLength(6)
    expect(ERM_POPULATION.excluded).toHaveLength(3)
    expect(ERM_POPULATION.excluded.every((e) => e.reason.length > 0)).toBe(true)
    expect(ERM_POPULATION.indeterminate).toHaveLength(1)
    expect(ERM_POPULATION.indeterminate[0].reason).toMatch(/insufficient look-through/)
  })
  it('ERM RXMs agree with the platform identity space (one borrower, one RXM)', () => {
    const byName = new Map<string, string>()
    for (const r of buildReviews().values()) byName.set(r.borrowerName, r.rxm)
    for (const b of [...ERM_BORROWERS, ...ERM_POPULATION.excluded.map((e) => e.ref)]) {
      const known = byName.get(b.name)
      if (known) expect(`${b.name}:${b.rxm}`).toBe(`${b.name}:${known}`)
    }
  })
})
