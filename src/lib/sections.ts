/**
 * The six workpaper sections (build-spec §5.3). Titles are the mockup's;
 * `short` is the rail label. Section anchors are `#sec-<n>` (§4).
 */
export interface SectionDef {
  n: 1 | 2 | 3 | 4 | 5 | 6
  title: string
  short: string
}

/* Canonical titles (corrected 2026-09-09) — there is no "Recommendation"
   section; adjudication lives in the areas of assessment. */
export const SECTIONS: readonly SectionDef[] = [
  {
    n: 1,
    title: 'Borrower / Counterparty & Relationship Overview',
    short: 'Borrower / Counterparty',
  },
  { n: 2, title: 'Financials', short: 'Financials' },
  { n: 3, title: 'Underwriting & Documentation', short: 'Underwriting & Documentation' },
  { n: 4, title: 'Portfolio Management', short: 'Portfolio Management' },
  { n: 5, title: 'Risk Rating Accuracy', short: 'Risk Rating Accuracy' },
  { n: 6, title: 'Trading Activity & Exposure Analysis', short: 'Trading Activity & Exposure' },
]

export const sectionAnchor = (n: number) => `sec-${n}`
