import { describe, expect, it } from 'vitest'
import { filterPolicies } from './policyFilter'

const DOCS = [
  { id: 'ProcMan-DEMO · §4.2', title: 'Reliance on extracted valuation inputs' },
  {
    id: 'POLICY · ib-lending/covenants',
    title: 'Springing covenant testing and headroom disclosure',
  },
]

describe('policy browse filter', () => {
  it('matches by number, title word, or id — case-insensitive substring', () => {
    expect(filterPolicies(DOCS, '§4.2')).toHaveLength(1)
    expect(filterPolicies(DOCS, 'covenant')).toHaveLength(1)
    expect(filterPolicies(DOCS, 'procman')).toHaveLength(1)
    expect(filterPolicies(DOCS, '')).toHaveLength(2)
    expect(filterPolicies(DOCS, 'zebra')).toHaveLength(0)
  })
})
