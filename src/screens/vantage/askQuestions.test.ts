import { describe, expect, it } from 'vitest'
import { WATCHLIST_QS } from '@/api/mock/vantageFixtures'
import { combineQuestions, deriveSetTitle } from './askQuestions'

describe('questions[] combination (one-off mode)', () => {
  it('typed question first, then the file’s questions in file order — one run', () => {
    const run = combineQuestions('  Which exposures were above the limit?  ', WATCHLIST_QS)
    expect(run).toHaveLength(15)
    expect(run[0]).toBe('Which exposures were above the limit?')
    expect(run.slice(1)).toEqual(WATCHLIST_QS)
  })

  it('a blank typed question contributes nothing; file-only runs are valid', () => {
    expect(combineQuestions('   ', WATCHLIST_QS)).toEqual(WATCHLIST_QS)
  })

  it('typed-only is a single-question run; nothing at all is zero questions', () => {
    expect(combineQuestions('One question?', [])).toEqual(['One question?'])
    expect(combineQuestions('', [])).toEqual([])
  })

  it('reviewed removals stay removed; blank rows never count', () => {
    const kept = WATCHLIST_QS.filter((_, i) => i !== 1 && i !== 5)
    const run = combineQuestions('Typed?', [...kept, ' ', ''])
    expect(run).toEqual(['Typed?', ...kept])
    expect(run).not.toContain(WATCHLIST_QS[1])
  })
})

describe('Save as a question set — the derived title', () => {
  it('the file stem, separators as spaces', () => {
    expect(deriveSetTitle('Watchlist_Qs.xlsx')).toBe('Watchlist Qs')
    expect(deriveSetTitle('Q3-covenant__follow_ups.xlsx')).toBe('Q3 covenant follow ups')
    expect(deriveSetTitle('plain.xlsx')).toBe('plain')
  })
})
