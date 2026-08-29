/**
 * The six workpaper sections (build-spec §5.3). Titles are the mockup's;
 * `short` is the rail label. Section anchors are `#sec-<n>` (§4).
 */
export interface SectionDef {
  n: 1 | 2 | 3 | 4 | 5 | 6
  title: string
  short: string
}

export const SECTIONS: readonly SectionDef[] = [
  { n: 1, title: 'Transaction & Company Overview', short: 'Transaction & Company' },
  { n: 2, title: 'Financials', short: 'Financials' },
  { n: 3, title: 'Capital Structure & Terms', short: 'Capital Structure & Terms' },
  { n: 4, title: 'Risk Rating Rationale', short: 'Risk Rating Rationale' },
  { n: 5, title: 'Covenants & Monitoring', short: 'Covenants & Monitoring' },
  { n: 6, title: 'Recommendation', short: 'Recommendation' },
]

export const sectionAnchor = (n: number) => `sec-${n}`
