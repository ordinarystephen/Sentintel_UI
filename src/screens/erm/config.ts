/**
 * ERM start-screen population vocabulary — DELIBERATE PLACEHOLDERS
 * (ratified 2026-09-18): the SHAPE (a labeled dropdown row that composes
 * with explicit documents) is the design; the words in these lists are
 * not settled and will be replaced by real portfolio taxonomy.
 */
export const POP_VOCAB = {
  portfolio: ['All portfolios', 'IB Lending', 'Wealth Management', 'Counterparty Credit Risk'],
  subPortfolio: [
    'All sub-portfolios',
    'Leveraged Lending',
    'Fund Finance',
    'Commodity Trade Finance',
  ],
  region: ['All regions', 'Americas', 'EMEA', 'APAC'],
  asOf: ['Latest on system', 'Q2 2026', 'Q1 2026'],
} as const

/** ERM's rationale-card labels (per-application config; see AnswerDetailModal). */
export const ERM_RATIONALE_LABELS = { memoFacts: 'Memo facts', basis: 'Basis' } as const
