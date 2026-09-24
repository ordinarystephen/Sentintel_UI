/**
 * ═══════════════════════════════════════════════════════════════════════════
 * THE DEMO DATA FILE — safe to edit.
 * Borrower names, CL numbers, sector labels, the narrative and timeline text,
 * work-paper values, attention-row wording, debate positions, document
 * passages: it all lives here. Change the text between quotes and the demo
 * changes with it (`make dev` hot-reloads; delete the browser's
 * `sentinel.mock.state` storage key to reset a used demo).
 * UI chrome wording (buttons, headings, labels) is NOT here — that is
 * src/strings.ts. See docs/editing-copy.md.
 * ═══════════════════════════════════════════════════════════════════════════
 *
 * Mock fixtures (build-spec §7), seeded from the mockup's content. All
 * company, person, and transaction data in this application is fictional;
 * any resemblance to real entities is coincidental. The Veyland review is the
 * fully-worked record (4 open items, WACC at conf 41% below the floor, a
 * prior review → Prior tab); the other named reviews are complete; ~34
 * generated rows make search/filter/count lines credible.
 */
import type {
  AssessmentArea,
  AttentionItem,
  DocumentText,
  DebatePosition,
  Disposition,
  DocumentHit,
  Lob,
  Policy,
  PriorComparison,
  Review,
  ReviewSummary,
  Section,
  User,
  WorkItem,
} from '../types'

export const ME: User = {
  id: 'u-me',
  name: 'Stark, Tony',
  // The CRR team will hold access to every app — the demo shows the
  // multi-entitlement experience (landing once, then last-used).
  entitlements: ['crr', 'erm', 'vantage', 'inquiry'],
}

/**
 * A senior-leadership user entitled to Inquiry ONLY (demo feedback round):
 * `/` sends them straight into Inquiry — no landing page, no switcher
 * menu. Mock-only sign-in switch: `localStorage['sentinel.mock.user'] =
 * 'u-leadership'` (see MOCK_USER_KEY in mockApi.ts).
 */
export const LEADERSHIP_USER: User = {
  id: 'u-leadership',
  name: 'Potts, Pepper',
  entitlements: ['inquiry'],
}
export const OWNERS: User[] = [
  ME,
  { id: 'u-chen', name: 'R. Chen', entitlements: ['crr'] },
  { id: 'u-alvarez', name: 'T. Alvarez', entitlements: ['crr'] },
  { id: 'u-okafor', name: 'M. Okafor', entitlements: ['crr'] },
  { id: 'u-lindqvist', name: 'J. Lindqvist', entitlements: ['crr'] },
]
const owner = (id: string): User => OWNERS.find((o) => o.id === id)!

/** The ONE confidence floor (§8). Mirrors what the real backend would enforce. */
export const CONFIDENCE_FLOOR = 0.6

export const VEYLAND_ID = 'rev-veyland-2026-08'
export const VEYLAND_PRIOR_ID = 'rev-veyland-2026-02'
/** Seldwyn's export fails — the demo of the loud error path (§7). */
export const EXPORT_FAILS_ID = 'rev-seldwyn-2026-08'

const VIA_LABEL: Record<WorkItem['via'], string> = {
  tier1: 'Tier 1 · section',
  tier2: 'Tier 2 · vector',
  ocr: 'image value · OCR',
  static: 'static data · direct',
  unresolved: 'unresolved',
}

type ItemSeed = Omit<WorkItem, 'flags' | 'viaLabel' | 'resolution' | 'evidence'> & {
  evidence?: WorkItem['evidence']
  resolution?: WorkItem['resolution']
}

export function flagsFor(
  confidence: number | undefined,
  floor = CONFIDENCE_FLOOR,
): WorkItem['flags'] {
  return confidence !== undefined && confidence < floor ? ['review_required'] : []
}

function item(seed: ItemSeed): WorkItem {
  const { via, page, name, sectionN } = seed
  const defaultResolution: WorkItem['resolution'] = [
    { text: `Template ib_lending asks for ${name} in Section ${sectionN}.` },
    {
      text:
        via === 'unresolved'
          ? 'Nothing matched this concept in either document.'
          : `Matched via ${VIA_LABEL[via]}${page ? `, p. ${page}` : ''}.`,
      warn: via === 'unresolved',
    },
  ]
  return {
    ...seed,
    viaLabel: VIA_LABEL[via],
    flags: flagsFor(seed.confidence),
    evidence: seed.evidence ?? [],
    resolution: seed.resolution ?? defaultResolution,
  }
}

const VEYLAND_DOC_ANNUAL = 'Veyland_Holdco_Annual_Review_FY25.pdf'
const VEYLAND_DOC_Q3 = 'Veyland_Holdco_Q3_Update.pdf'

export const VEYLAND_SECTIONS: Section[] = [
  {
    n: 1,
    title: 'Borrower / Counterparty & Relationship Overview',
    status: 'populated',
    items: [
      item({
        id: 'wi-1-company',
        sectionN: 1,
        name: 'Company Overview',
        via: 'tier1',
        page: 3,
        confidence: 0.95,
        content: {
          kind: 'prose',
          text: 'Veyland US Holdco LLC operates a managed application-hosting platform serving ~420 mid-market enterprise customers across North America. The company was acquired by Bramhurst Capital in 2023 in a $2.1bn LBO…',
        },
      }),
      item({
        id: 'wi-1-recent',
        sectionN: 1,
        name: 'Recent Developments',
        via: 'tier2',
        page: 7,
        confidence: 0.88,
        content: {
          kind: 'prose',
          text: 'The Q3 update reports two enterprise renewals slipping into Q4 and a completed $35mm voluntary TLB prepayment funded from excess cash…',
        },
      }),
      item({
        id: 'wi-1-ratings',
        sectionN: 1,
        name: 'External Ratings',
        via: 'static',
        content: {
          kind: 'keyValue',
          entries: [
            { label: "Moody's", value: 'B1 / Negative', note: '11-Apr-2026' },
            { label: 'S&P', value: 'B+ / Stable', note: '02-Feb-2026' },
          ],
        },
      }),
      item({
        id: 'wi-1-ownership',
        sectionN: 1,
        name: 'Ownership & Sponsor',
        via: 'unresolved',
        content: { kind: 'prose', text: 'No content extracted for this concept.' },
      }),
    ],
  },
  {
    n: 2,
    title: 'Financials',
    status: 'populated',
    items: [
      item({
        id: 'wi-2-ev',
        sectionN: 2,
        name: 'Enterprise Value / LTM EBITDA',
        via: 'ocr',
        page: 12,
        confidence: 0.94,
        content: {
          kind: 'keyValue',
          entries: [{ value: '8.6x', note: 'expected case, per EV/DCF summary table' }],
        },
      }),
      item({
        id: 'wi-2-wacc',
        sectionN: 2,
        name: 'Expected Case WACC',
        via: 'ocr',
        page: 12,
        confidence: 0.41,
        content: { kind: 'keyValue', entries: [{ value: '9.8%' }] },
        evidence: [
          {
            quote: 'Expected case WACC 9.8% (see EV/DCF summary table).',
            sourceDoc: VEYLAND_DOC_ANNUAL,
            sectionName: 'EV/DCF summary',
            page: 12,
            imageKind: 'page',
          },
        ],
        resolution: [
          { text: 'Template ib_lending asks for Expected Case WACC in Section 2.' },
          {
            text: 'Matched the EV/DCF summary table, p. 12 of the annual review (image value · OCR).',
          },
          {
            text: 'OCR read 9.8% below the confidence floor → flagged review required, here and in the Word export.',
            warn: true,
          },
        ],
      }),
      item({
        id: 'wi-2-debt',
        sectionN: 2,
        name: 'Total Debt',
        via: 'ocr',
        page: 12,
        confidence: 0.97,
        content: { kind: 'keyValue', entries: [{ value: '$1,240mm' }] },
      }),
      item({
        id: 'wi-2-liq',
        sectionN: 2,
        name: 'Liquidity',
        via: 'tier1',
        page: 14,
        confidence: 0.92,
        content: {
          kind: 'prose',
          text: 'The $150mm revolving facility is undrawn as of the Q3 update; availability is reduced by $6mm of outstanding letters of credit, leaving ~$144mm.',
        },
        evidence: [
          {
            quote:
              'The $150 million revolving credit facility remains undrawn, with $6.0 million utilized for standby letters of credit.',
            sourceDoc: VEYLAND_DOC_Q3,
            sectionName: 'Liquidity Summary',
            page: 14,
            imageKind: 'section',
            imageRef: 'img-veyland-q3-p14-liquidity',
          },
        ],
        resolution: [
          { text: 'Template asks for Liquidity in Section 2.' },
          {
            text: 'Tier 1 match: the Q3 update’s own "Liquidity Summary" section, p. 14 — quoted verbatim.',
          },
        ],
      }),
      item({
        id: 'wi-2-leverage-flag',
        sectionN: 2,
        name: 'leverage_flag',
        via: 'tier2',
        content: { kind: 'prose', text: '' },
        factor: {
          name: 'leverage_flag',
          question: 'Is gross leverage above the policy threshold for this deal type?',
          verdict: null,
          verdictState: 'stubbed',
          snippets: [
            'POLICY[ib-lending/leverage]: Sponsor-owned software TLB — gross leverage above 6.0x requires second-line sign-off…',
            'Gross leverage of 5.9x as of Q3-26, up from 5.6x at FY25 close…',
            'Total debt outstanding $1,240mm; LTM EBITDA $210mm…',
            'Springing first-lien net leverage covenant of 6.5x, tested at 35% revolver utilization…',
            '$35mm voluntary prepayment applied to the TLB in June 2026…',
            'Sector median gross leverage for rated peers: 5.2x…',
          ],
        },
        resolution: [
          { text: 'Assessment factor leverage_flag runs inside Section 2.' },
          { text: 'Retrieved 6 snippets from the policy corpus and both documents.' },
          { text: 'Reasoning is stubbed in this build — verdict withheld.', warn: true },
        ],
      }),
    ],
  },
  {
    n: 3,
    title: 'Underwriting & Documentation',
    status: 'pending',
    feederNote:
      'TO BE POPULATED. Feeders: credit approval memo, credit agreement, underwriting file.',
    items: [],
  },
  {
    n: 4,
    title: 'Portfolio Management',
    status: 'pending',
    feederNote: 'TO BE POPULATED. Feeders: monitoring history, covenant schedule, review dates.',
    items: [],
  },
  {
    n: 5,
    title: 'Risk Rating Accuracy',
    status: 'pending',
    feederNote: 'TO BE POPULATED. Feeders: rating model output, Financials.',
    items: [],
  },
  {
    n: 6,
    title: 'Trading Activity & Exposure Analysis',
    status: 'pending',
    feederNote: 'TO BE POPULATED. Feeders: trading lines, ISDA/CSA terms, MtM exposure.',
    items: [],
  },
]

export const VEYLAND_ATTENTION: AttentionItem[] = [
  {
    id: 'att-wacc',
    kind: 'review_required',
    title: 'Expected Case WACC 9.8% was read below the OCR confidence floor',
    detail: 'The Word export will flag this value — verify it against p. 12 before finalizing.',
    sectionN: 2,
    itemId: 'wi-2-wacc',
    confidence: 0.41,
    state: 'open',
  },
  {
    id: 'att-headroom',
    kind: 'flag',
    title: 'Covenant headroom tightening',
    detail:
      'Gross leverage 5.9x against the 6.5x springing covenant — headroom narrows to 0.6x at revised EBITDA.',
    sectionN: 2,
    itemId: 'wi-2-leverage-flag',
    confidence: 0.78,
    state: 'open',
  },
  {
    id: 'att-concentration',
    kind: 'flag',
    title: 'Customer concentration',
    detail: 'Top-10 customers ~34% of ARR per the annual review; no updated figure in Q3.',
    sectionN: 1,
    itemId: 'wi-1-company',
    confidence: 0.64,
    state: 'open',
  },
  {
    id: 'att-ownership',
    kind: 'unresolved',
    title: 'Ownership & Sponsor — no content extracted',
    detail:
      "Nothing matched this concept in either document. Check the annual review's sponsor section or re-upload a complete copy.",
    sectionN: 1,
    itemId: 'wi-1-ownership',
    state: 'open',
  },
  {
    id: 'att-covenant-threshold',
    kind: 'question',
    title: 'Confirm the springing covenant test threshold',
    detail: 'Asked at upload.',
    sectionN: 2,
    itemId: 'wi-2-leverage-flag',
    state: 'reviewed',
    note: 'confirmed at 35% utilization',
  },
]

export const VEYLAND_AREAS: AssessmentArea[] = [
  {
    id: 'aa-structure',
    name: 'Transaction Structure / Underwriting',
    rating: 'satisfactory',
    reason:
      'The 2023 LBO financing and subsequent amendments were appropriately evaluated, documented and approved under the leveraged lending standards. Write-up quality acceptable; key risks and mitigants adequately identified.',
    sectionRefs: [3],
  },
  {
    id: 'aa-repay-primary',
    name: 'Repayment Capacity — Primary Sources',
    rating: 'satisfactory',
    reason:
      'Cash flow from operations correctly identified as the primary source of repayment. Expected-case cumulative FCF adequately covers debt service; model assumptions reasonable after challenge.',
    sectionRefs: [2],
  },
  {
    id: 'aa-repay-secondary',
    name: 'Repayment Capacity — Secondary Sources',
    rating: 'pending',
    reason:
      'Refinancing supported by enterprise value is the identified secondary source. EV coverage of total debt at 1.46x sits below the 1.5x trigger at the revised expected case, and the Expected Case WACC input remains unverified (review required, §2). Rating held pending analyst verification.',
    blockedBy: 'wi-2-wacc',
    sectionRefs: [2],
  },
  {
    id: 'aa-portfolio',
    name: 'Portfolio Management',
    rating: 'satisfactory',
    reason:
      'Required monitoring practices are adequate and timely: the annual review completed on schedule, covenant and liquidity monitoring current, and the Q3 update received within expected timeframes.',
    sectionRefs: [4],
  },
  {
    id: 'aa-reg-class',
    name: 'US Regulatory Classification',
    rating: 'satisfactory',
    reason:
      'Pass classification appropriately assigned and supported by the leverage trajectory, consistent positive projected FCF, and repayment capacity over the projection period.',
    sectionRefs: [5],
  },
  {
    id: 'aa-pd',
    name: 'Probability of Default Assessment',
    rating: 'satisfactory',
    reason:
      'The PD rating applied was correctly derived using the appropriate rating model and standards.',
    sectionRefs: [5],
  },
  {
    id: 'aa-lgd',
    name: 'Loss Given Default Assessment',
    rating: 'satisfactory',
    reason:
      "The LGD applied was correctly derived and is appropriate for the facility's position in the capital structure.",
    sectionRefs: [5],
  },
  {
    id: 'aa-traded',
    name: 'Traded Products',
    rating: 'na',
    reason: 'No traded products exposure to the counterparty.',
    sectionRefs: [6],
  },
]

const VEYLAND_DISPOSITIONS: Disposition[] = [
  {
    itemId: 'att-covenant-threshold',
    action: 'reviewed',
    note: 'confirmed at 35% utilization',
    actorId: ME.id,
    at: '2026-08-28T10:05:00Z',
  },
]

export const VEYLAND: Review = {
  id: VEYLAND_ID,
  borrowerName: 'Veyland US Holdco LLC',
  rxm: 'RXM-6430',
  lob: 'IB Lending',
  ownerId: ME.id,
  ownerName: ME.name,
  status: 'ready',
  createdAt: '2026-08-28T09:31:00Z',
  openItems: 4,
  sectionsPopulated: 2,
  priorReviewId: VEYLAND_PRIOR_ID,
  repeatIndex: 2,
  sector: 'Software (application hosting)',
  ownership: 'sponsor-owned',
  ratings: [
    { agency: "Moody's", rating: 'B1', outlook: 'Negative', asOf: '2026-04-11' },
    { agency: 'S&P', rating: 'B+', outlook: 'Stable', asOf: '2026-02-02' },
  ],
  dealTypeChips: ['term loan B', 'sponsor-owned'],
  runCompletedAt: '2026-08-28T09:42:00Z',
  documents: [
    {
      fileName: VEYLAND_DOC_ANNUAL,
      kind: 'annual review',
      date: '2026-03-31',
      pages: 21,
      sizeBytes: 2_516_582,
      docId: 'doc-veyland-annual',
    },
    {
      fileName: VEYLAND_DOC_Q3,
      kind: 'quarterly update',
      date: '2026-07-15',
      pages: 12,
      sizeBytes: 1_153_433,
      docId: 'doc-veyland-q3',
    },
  ],
  story: {
    docsLine: `${VEYLAND_DOC_ANNUAL} — annual review, 2026-03-31 · ${VEYLAND_DOC_Q3} — quarterly update, 2026-07-15`,
    narrative:
      'Veyland is a sponsor-owned application-hosting platform carrying a $1,240mm Term Loan B and an undrawn $150mm revolver. FY25 revenue grew 9% with EBITDA margins holding near 31%; leverage improved modestly on debt paydown but remains above the sector median. The Q3 update flags a delayed enterprise renewal cycle and revises the expected case downward.',
    changes: [
      {
        date: '2026-07-15',
        factor: 'expected case',
        summary: 'Expected-case revenue growth revised down on slower enterprise renewals.',
        prior: '9.0%',
        current: '6.5%',
        snippet: 'Management now guides to mid-single-digit growth for FY26…',
      },
      {
        date: '2026-07-15',
        factor: 'leverage',
        summary: 'Gross leverage tightened against the 6.5x covenant.',
        prior: '5.6x',
        current: '5.9x',
        snippet: 'Covenant headroom narrows to 0.6x at the revised EBITDA…',
      },
    ],
  },
  sections: VEYLAND_SECTIONS,
  attention: VEYLAND_ATTENTION,
  areas: VEYLAND_AREAS,
  referenceData: {
    asOf: '2026-08-15',
    fields: [
      { label: 'Reference number', value: '3117-04', source: 'crr' },
      { label: 'Industry (portfolio bucket)', value: 'TMT — Software Services', source: 'crr' },
      { label: 'Credit officer', value: 'M. Okafor', source: 'upstream' },
      { label: 'PD / PD CRR', value: 'B1 / B1', source: 'upstream' },
      { label: 'Facility', value: 'TLB 71834 · $1,240mm CMT · matures 2030', source: 'upstream' },
      { label: 'Accrual status', value: 'Accruing', source: 'upstream' },
    ],
  },
  dispositions: VEYLAND_DISPOSITIONS,
  confidenceFloor: CONFIDENCE_FLOOR,
  readOnly: false,
}

export const VEYLAND_PRIOR: PriorComparison = {
  priorReviewId: VEYLAND_PRIOR_ID,
  priorDate: '2026-02-14',
  deltas: [
    { label: 'Gross leverage', prior: '5.6x', current: '5.9x', direction: 'worse' },
    { label: 'Expected-case revenue growth', prior: '9.0%', current: '6.5%', direction: 'worse' },
    { label: 'Expected Case WACC', prior: '9.6%', current: '9.8%', direction: 'worse' },
    { label: 'Covenant headroom', prior: '0.9x', current: '0.6x', direction: 'worse' },
    { label: "Moody's", prior: 'B1 /Stable', current: 'B1 /Negative', direction: 'worse' },
    { label: 'Revolver availability', prior: '$150mm', current: '$144mm', direction: 'neutral' },
    { label: 'LC utilization', prior: '$0', current: '$6mm', direction: 'neutral' },
  ],
}

export const POLICIES: Policy[] = [
  {
    id: 'ProcMan-DEMO · §4.2',
    kind: 'standard',
    text: 'Valuation inputs must be verified against source documents before reliance.',
    itemIds: ['wi-2-wacc', 'wi-2-ev'],
  },
  {
    id: 'POLICY · ib-lending/ev-support',
    kind: 'policy',
    text: 'EV coverage of total debt below 1.5x is a downgrade trigger; WACC drives the expected-case EV.',
    itemIds: ['wi-2-wacc'],
  },
  {
    id: 'ProcMan-DEMO · §5.1',
    kind: 'standard',
    text: 'Liquidity adequacy assessed against 12-month obligations including LC utilization.',
    itemIds: ['wi-2-liq'],
  },
  {
    id: 'POLICY · ib-lending/leverage',
    kind: 'policy',
    text: 'Sponsor-owned software TLB — gross leverage above 6.0x requires second-line sign-off.',
    itemIds: ['wi-2-leverage-flag', 'wi-2-debt'],
  },
  {
    id: 'ProcMan-DEMO · §2.1',
    kind: 'standard',
    text: 'Ownership and sponsor identity must be established from primary documents.',
    itemIds: ['wi-1-ownership', 'wi-1-company'],
  },
]

export const DEBATES: DebatePosition[] = [
  {
    itemId: 'wi-2-wacc',
    stance: 'advocate',
    text: "9.8% sits inside the sector range (9–11%) and one step from the prior review's 9.6%. The flag is a legibility problem, not a valuation problem — verify against p. 12 and move on.",
    citations: ['prior review 2026-02', 'sector comps table'],
    at: '2026-08-28T09:42:00Z',
    runId: 'run-veyland-2026-08',
  },
  {
    itemId: 'wi-2-wacc',
    stance: 'dissent',
    text: 'The value cannot be verified at required confidence, and expected-case EV coverage is 1.46x — already below the 1.5x trigger. An unverified WACC materially weakens the EV-support conclusion in Section 2.',
    citations: ['POLICY ib-lending/ev-support', 'ProcMan-DEMO §4.2'],
    at: '2026-08-28T09:42:00Z',
    runId: 'run-veyland-2026-08',
  },
  {
    itemId: 'wi-2-liq',
    stance: 'advocate',
    text: '~$144mm available against no near-term maturities — liquidity is a clear strength this cycle.',
    citations: ['Liquidity Summary p. 14'],
    at: '2026-08-28T09:42:00Z',
    runId: 'run-veyland-2026-08',
  },
  {
    itemId: 'wi-2-liq',
    stance: 'dissent',
    text: 'The $6mm LC figure appears only in a footnote; confirm utilization with the agent bank before calling availability clean.',
    citations: ['footnote 7, p. 14'],
    at: '2026-08-28T09:42:00Z',
    runId: 'run-veyland-2026-08',
  },
]

/** What `respond` lands for specific items (the re-run outcome); others just gain confidence. */
export const RERUN_OUTCOMES: Record<string, { content: WorkItem['content']; confidence: number }> =
  {
    'wi-2-wacc': { content: { kind: 'keyValue', entries: [{ value: '9.6%' }] }, confidence: 0.93 },
  }

// ---------------------------------------------------------------------------
// Other reviews
// ---------------------------------------------------------------------------

interface SummarySeed {
  id: string
  borrowerName: string
  rxm: string
  lob: Lob
  ownerId: string
  createdAt: string
  sector: string
  ownership?: string
  priorReviewId?: string
  repeatIndex?: number
}

/**
 * The fully-rated assessment set every completed review carries (areas are
 * structural to every review — clarified 2026-09-09). Same voice as the
 * Veyland set; ids namespaced per review so setAreaRating can never cross
 * reviews. 7 satisfactory + Traded Products n/a → "8 areas · 7 satisfactory
 * · 1 n/a", no pending badge.
 */
function completedAreas(reviewId: string): AssessmentArea[] {
  const mk = (
    key: string,
    name: string,
    reason: string,
    sectionRefs: number[],
    rating: AssessmentArea['rating'] = 'satisfactory',
  ): AssessmentArea => ({
    id: `${reviewId}-${key}`,
    name,
    rating,
    reason,
    sectionRefs,
  })
  return [
    mk(
      'aa-structure',
      'Transaction Structure / Underwriting',
      'The facility structure and subsequent amendments were appropriately evaluated, documented and approved under the applicable underwriting standards. Write-up quality acceptable; key risks and mitigants adequately identified.',
      [3],
    ),
    mk(
      'aa-repay-primary',
      'Repayment Capacity — Primary Sources',
      'Cash flow from operations correctly identified as the primary source of repayment. Expected-case coverage of debt service is adequate; model assumptions reasonable after challenge.',
      [2],
    ),
    mk(
      'aa-repay-secondary',
      'Repayment Capacity — Secondary Sources',
      'The identified secondary source is adequately supported at the expected case; no downgrade triggers are breached and the supporting valuation inputs are verified.',
      [2],
    ),
    mk(
      'aa-portfolio',
      'Portfolio Management',
      'Required monitoring practices are adequate and timely: reviews completed on schedule, covenant and liquidity monitoring current.',
      [4],
    ),
    mk(
      'aa-reg-class',
      'US Regulatory Classification',
      'Pass classification appropriately assigned and supported by the leverage trajectory and repayment capacity over the projection period.',
      [5],
    ),
    mk(
      'aa-pd',
      'Probability of Default Assessment',
      'The PD rating applied was correctly derived using the appropriate rating model and standards.',
      [5],
    ),
    mk(
      'aa-lgd',
      'Loss Given Default Assessment',
      "The LGD applied was correctly derived and is appropriate for the facility's position in the capital structure.",
      [5],
    ),
    mk(
      'aa-traded',
      'Traded Products',
      'No traded products exposure to the counterparty.',
      [6],
      'na',
    ),
  ]
}

function completeReview(seed: SummarySeed): Review {
  const o = owner(seed.ownerId)
  const doc = `${seed.borrowerName.replace(/[^A-Za-z0-9]+/g, '_')}_Annual_Review.pdf`
  const conf = [0.96, 0.91, 0.89, 0.93, 0.9, 0.94]
  const sections: Section[] = VEYLAND_SECTIONS.map((s, i) => ({
    n: s.n,
    title: s.title,
    status: 'populated',
    items: [
      item({
        id: `${seed.id}-wi-${s.n}`,
        sectionN: s.n,
        name: s.n === 1 ? 'Company Overview' : s.title,
        via: 'tier1',
        page: 2 + i * 3,
        confidence: conf[i],
        content: {
          kind: 'prose',
          text: `${seed.borrowerName} — ${s.title.toLowerCase()} populated from the annual review (${seed.sector}).`,
        },
        evidence: [
          {
            quote: `${s.title} as presented in the annual review for ${seed.borrowerName}.`,
            sourceDoc: doc,
            sectionName: s.title,
            page: 2 + i * 3,
            imageKind: 'section',
          },
        ],
      }),
    ],
  }))
  return {
    id: seed.id,
    borrowerName: seed.borrowerName,
    rxm: seed.rxm,
    lob: seed.lob,
    ownerId: o.id,
    ownerName: o.name,
    status: 'ready',
    createdAt: seed.createdAt,
    openItems: 0,
    sectionsPopulated: 6,
    priorReviewId: seed.priorReviewId,
    repeatIndex: seed.repeatIndex,
    sector: seed.sector,
    ownership: seed.ownership ?? 'privately held',
    ratings: [],
    dealTypeChips: ['term loan'],
    runCompletedAt: seed.createdAt,
    documents: [
      { fileName: doc, kind: 'annual review', date: seed.createdAt.slice(0, 10), pages: 18 },
    ],
    story: {
      docsLine: `${doc} — annual review, ${seed.createdAt.slice(0, 10)}`,
      narrative: `${seed.borrowerName} (${seed.sector}) reviewed on a single annual-review document. All six sections populated; no open items.`,
      changes: [],
    },
    sections,
    attention: [],
    areas: completedAreas(seed.id),
    dispositions: [],
    confidenceFloor: CONFIDENCE_FLOOR,
    readOnly: o.id !== ME.id,
  }
}

const NAMED: SummarySeed[] = [
  {
    id: 'rev-farrowdale-2026-08',
    borrowerName: 'Farrowdale Logistics',
    rxm: 'RXM-8093',
    lob: 'IB Lending',
    ownerId: 'u-chen',
    createdAt: '2026-08-26T14:10:00Z',
    sector: 'Transportation & logistics',
    priorReviewId: 'rev-gen-22',
    repeatIndex: 2,
  },
  {
    id: 'rev-verloway-2026-08',
    borrowerName: 'Verloway AgriChem',
    rxm: 'RXM-2210',
    lob: 'Wealth Management',
    ownerId: 'u-alvarez',
    createdAt: '2026-08-24T11:00:00Z',
    sector: 'Agricultural chemicals',
  },
  {
    id: 'rev-ambervale-2026-08',
    borrowerName: 'Ambervale Foods Group',
    rxm: 'RXM-5120',
    lob: 'IB Lending',
    ownerId: ME.id,
    createdAt: '2026-08-21T15:20:00Z',
    sector: 'Packaged foods',
  },
  {
    id: EXPORT_FAILS_ID,
    borrowerName: 'Seldwyn Marine Finance',
    rxm: 'RXM-7712',
    lob: 'IB Lending',
    ownerId: ME.id,
    createdAt: '2026-08-12T10:45:00Z',
    sector: 'Marine finance',
    priorReviewId: 'rev-gen-21',
    repeatIndex: 2,
  },
  {
    id: 'rev-northgale-2026-07',
    borrowerName: 'Northgale Health Partners',
    rxm: 'RXM-4488',
    lob: 'IB Lending',
    ownerId: ME.id,
    createdAt: '2026-07-30T09:05:00Z',
    sector: 'Healthcare services',
  },
  {
    id: VEYLAND_PRIOR_ID,
    borrowerName: 'Veyland US Holdco LLC',
    rxm: 'RXM-6430',
    lob: 'IB Lending',
    ownerId: 'u-alvarez',
    createdAt: '2026-02-14T13:30:00Z',
    sector: 'Software (application hosting)',
    ownership: 'sponsor-owned',
  },
]

const GENERATED_NAMES: Array<[string, string, Lob]> = [
  ['Torvane Aggregates', 'Building materials', 'IB Lending'],
  ['Solmere Renewables', 'Power generation', 'IB Lending'],
  ['Harbelin Shipping', 'Shipping', 'IB Lending'],
  ['Corvale Ridge Mining', 'Metals & mining', 'IB Lending'],
  ['Pallowmere Senior Living', 'Senior housing', 'Wealth Management'],
  ['Quensbury Publishing', 'Publishing', 'IB Lending'],
  ['Brindlewater Utilities', 'Water utilities', 'IB Lending'],
  ['Ironmarsh Steel', 'Steel', 'IB Lending'],
  ['Larkstone Pharma', 'Pharmaceuticals', 'IB Lending'],
  ['Tidemoor Cold Storage', 'Cold-chain logistics', 'IB Lending'],
  ['Summerlode Resorts', 'Leisure', 'Wealth Management'],
  ['Greyfenn Real Estate Trust', 'Real estate', 'Wealth Management'],
  ['Orvalon Freight Systems', 'Freight', 'IB Lending'],
  ['Kestrelane Aerospace Components', 'Aerospace', 'IB Lending'],
  ['Maldenbrook Grocers', 'Grocery retail', 'IB Lending'],
  ['Vantorel Payments', 'Payments', 'Counterparty Credit Risk'],
  ['Redfenn Timber Holdings', 'Forestry', 'IB Lending'],
  ['Aurelock Dental Group', 'Dental services', 'Wealth Management'],
  ['Copperfen Telecom', 'Telecom', 'IB Lending'],
  ['Finmarrow Seafood Co.', 'Food processing', 'IB Lending'],
  ['Sternvale Capital', 'Asset management', 'Counterparty Credit Risk'],
  ['Seldwyn Marine Finance', 'Marine finance', 'IB Lending'],
  ['Farrowdale Logistics', 'Transportation & logistics', 'IB Lending'],
  ['Ambergill Vineyards', 'Wine', 'Wealth Management'],
  ['Norvale Insurance Brokers', 'Insurance brokerage', 'Wealth Management'],
  ['Silvermoor Auto Parts', 'Auto parts', 'IB Lending'],
  ['Fairbeck Hospitality', 'Hotels', 'Wealth Management'],
  ['Deltamere Energy Partners', 'Oil & gas', 'IB Lending'],
  ['Everfen Waste Services', 'Waste management', 'IB Lending'],
  ['Luxfell Data Centres', 'Data centres', 'IB Lending'],
  ['Wexbourne Chemicals', 'Specialty chemicals', 'IB Lending'],
  ['Portmaris Container Leasing', 'Equipment leasing', 'Counterparty Credit Risk'],
  ['Highfell Distillers', 'Spirits', 'Wealth Management'],
  ['Meadowvane Farms Cooperative', 'Agriculture', 'IB Lending'],
]

/**
 * One borrower, one RXM — the two vetted repeats in the pool are PRIOR
 * reviews of named borrowers and must carry the same identity (fixed
 * v1.5; previously they re-derived a fresh RXM).
 */
const RXM_OVERRIDES: Record<string, string> = {
  'Seldwyn Marine Finance': 'RXM-7712',
  'Farrowdale Logistics': 'RXM-8093',
}

function generated(): SummarySeed[] {
  // Deterministic spread: newest 2026-08-27, stepping back ~13 days each, so
  // the tail (index ≥ 28) falls outside the 12-month period filter.
  const start = Date.UTC(2026, 7, 27, 9, 0, 0)
  return GENERATED_NAMES.map(([name, sector, lob], i) => {
    const at = new Date(start - i * 13 * 86_400_000 - (i % 5) * 3_600_000).toISOString()
    const ownerId = OWNERS[(i * 3 + 1) % OWNERS.length].id
    return {
      id: `rev-gen-${i}`,
      borrowerName: name,
      rxm: RXM_OVERRIDES[name] ?? `RXM-${((3100 + i * 137) % 9000) + 1000}`,
      lob,
      ownerId,
      createdAt: at,
      sector,
    }
  })
}

/** Every ready review in the system, keyed by id. */
export function buildReviews(): Map<string, Review> {
  const map = new Map<string, Review>()
  map.set(VEYLAND.id, VEYLAND)
  for (const seed of [...NAMED, ...generated()]) map.set(seed.id, completeReview(seed))
  return map
}

export function summaryOf(r: Review): ReviewSummary {
  const {
    id,
    borrowerName,
    rxm,
    lob,
    ownerId,
    ownerName,
    status,
    createdAt,
    openItems,
    sectionsPopulated,
    priorReviewId,
    repeatIndex,
    sector,
  } = r
  return {
    id,
    borrowerName,
    rxm,
    lob,
    ownerId,
    ownerName,
    status,
    createdAt,
    openItems,
    sectionsPopulated,
    priorReviewId,
    repeatIndex,
    sector,
  }
}

// ---------------------------------------------------------------------------
// Documents
// ---------------------------------------------------------------------------

/**
 * The index store's documents: one record per file, with the extracted text
 * organized by the DOCUMENT's own sections (page ranges in mono). Powers the
 * Documents browse state, "Preview extracted text", and "Download original".
 */
export interface DocumentRecord extends DocumentText {
  lob: Lob
  counterparty: string
  /** RXM of the counterparty, when it maps to a known borrower. */
  rxm?: string
  docType: string
  date: string
}

export const DOCUMENTS: DocumentRecord[] = [
  {
    docId: 'doc-veyland-annual',
    fileName: VEYLAND_DOC_ANNUAL,
    lob: 'IB Lending',
    counterparty: 'Veyland US Holdco',
    rxm: 'RXM-6430',
    docType: 'annual review',
    date: '2026-03-31',
    pages: 21,
    parsedAt: '2026-08-28T09:35:00Z',
    extracted: true,
    sections: [
      {
        title: 'Executive Summary',
        pageStart: 1,
        pageEnd: 2,
        text: 'FY25 closed with revenue growth of 9% and EBITDA margins holding near 31%. The sponsor completed a $35mm voluntary prepayment against the Term Loan B in June; gross leverage ended the year at 5.6x. Management characterizes the renewal pipeline as healthy but concentrated in the enterprise tier.',
      },
      {
        title: 'Company Overview',
        pageStart: 3,
        pageEnd: 5,
        text: 'Veyland US Holdco LLC operates a managed application-hosting platform serving ~420 mid-market enterprise customers across North America. The company was acquired by Bramhurst Capital in 2023 in a $2.1bn LBO. Contract terms average 2.4 years with annual escalators.',
      },
      {
        title: 'Financial Performance',
        pageStart: 6,
        pageEnd: 9,
        text: 'Revenue of $612mm (+9% YoY); adjusted EBITDA of $190mm at a 31.0% margin. Capital expenditure held at 8% of revenue. Free cash flow conversion of 54% funded the June prepayment without revolver usage.',
      },
      {
        title: 'Capitalization',
        pageStart: 10,
        pageEnd: 11,
        text: 'Total debt outstanding of $1,240mm comprises a $1,240mm Term Loan B due 2030 and an undrawn $150mm revolving credit facility. A springing first-lien net leverage covenant of 6.5x is tested when revolver utilization exceeds 35% of commitments.',
      },
      {
        title: 'EV/DCF Summary',
        pageStart: 12,
        pageEnd: 13,
        text: 'The expected case discounts management projections at a WACC of 9.8%, implying an enterprise value of 8.6x LTM EBITDA. Downside case WACC of 10.6%. Expected-case EV coverage of total debt is 1.46x.',
      },
      {
        title: 'Risk Factors',
        pageStart: 14,
        pageEnd: 17,
        text: 'Customer concentration remains the principal risk: the top-10 customers represent approximately 34% of ARR. Renewal timing risk is noted for the enterprise tier, where procurement cycles have lengthened.',
      },
      {
        title: 'Covenant Schedule',
        pageStart: 18,
        pageEnd: 19,
        text: 'Springing first-lien net leverage covenant: 6.5x, tested at 35% revolver utilization. No maintenance covenants apply while the revolver remains below the test threshold.',
      },
      {
        title: 'Appendices',
        pageStart: 20,
        pageEnd: 21,
        text: 'Reconciliations of adjusted EBITDA and free cash flow; summary of hedging arrangements; organization chart.',
      },
    ],
  },
  {
    docId: 'doc-veyland-q3',
    fileName: VEYLAND_DOC_Q3,
    lob: 'IB Lending',
    counterparty: 'Veyland US Holdco',
    rxm: 'RXM-6430',
    docType: 'quarterly update',
    date: '2026-07-15',
    pages: 15,
    parsedAt: '2026-08-28T09:38:00Z',
    extracted: true,
    sections: [
      {
        title: 'Highlights',
        pageStart: 1,
        pageEnd: 2,
        text: 'Two enterprise renewals slipped from Q3 into Q4; management now guides to mid-single-digit revenue growth for FY26. The $35mm voluntary TLB prepayment completed in June was funded entirely from excess cash.',
      },
      {
        title: 'Operating Update',
        pageStart: 3,
        pageEnd: 7,
        text: 'Platform utilization and churn remain in line with plan. The delayed renewals are attributed to lengthened procurement cycles rather than competitive losses; both accounts remain on the platform month-to-month.',
      },
      {
        title: 'Renewal Pipeline',
        pageStart: 8,
        pageEnd: 10,
        text: 'The FY26 renewal cohort covers 28% of ARR. Management expects the two slipped renewals to close in Q4 at flat-to-modestly-lower pricing.',
      },
      {
        title: 'Financial Update',
        pageStart: 11,
        pageEnd: 13,
        text: 'LTM EBITDA of $210mm; gross leverage of 5.9x as of Q3-26, up from 5.6x at FY25 close on the revised EBITDA base. Covenant headroom narrows to 0.6x at the revised EBITDA.',
      },
      {
        title: 'Liquidity Summary',
        pageStart: 14,
        pageEnd: 15,
        text: 'The $150 million revolving credit facility remains undrawn, with $6.0 million utilized for standby letters of credit, leaving availability of approximately $144 million. No near-term maturities.',
      },
    ],
  },
  {
    docId: 'doc-seldwyn-fa',
    fileName: 'Seldwyn_Marine_Facility_Agreement.pdf',
    lob: 'IB Lending',
    counterparty: 'Seldwyn Marine Finance',
    rxm: 'RXM-7712',
    docType: 'facility agreement',
    date: '2026-05-02',
    pages: 68,
    parsedAt: '2026-08-12T10:20:00Z',
    extracted: true,
    sections: [
      {
        title: 'Definitions & Interpretation',
        pageStart: 1,
        pageEnd: 14,
        text: 'Defined terms for the revolving facility, including Availability, Letter of Credit Exposure, and the Borrowing Base as applied to the mortgaged fleet.',
      },
      {
        title: 'The Facility',
        pageStart: 15,
        pageEnd: 30,
        text: 'A senior secured revolving facility with a letter-of-credit sublimit, maturing 2031, secured by first-preferred mortgages over the financed vessels.',
      },
      {
        title: 'Availability & Letters of Credit',
        pageStart: 31,
        pageEnd: 45,
        text: 'Availability under the revolving facility shall be reduced by the aggregate face amount of letters of credit then outstanding. Clause 7.2 sets the mechanics of issuance, renewal and cash-collateralization.',
      },
      {
        title: 'Covenants',
        pageStart: 46,
        pageEnd: 68,
        text: 'Fleet-value maintenance tested semi-annually; minimum liquidity requirements; customary negative covenants.',
      },
    ],
  },
  {
    docId: 'doc-ambervale-annual',
    fileName: 'Ambervale_Foods_Annual_Review_FY25.pdf',
    lob: 'IB Lending',
    counterparty: 'Ambervale Foods Group',
    rxm: 'RXM-5120',
    docType: 'annual review',
    date: '2026-08-20',
    pages: 18,
    parsedAt: '2026-08-21T15:05:00Z',
    extracted: true,
    sections: [
      {
        title: 'Business Overview',
        pageStart: 1,
        pageEnd: 4,
        text: 'Ambervale Foods Group manufactures private-label packaged foods across three categories, with long-tenured grocery relationships and modest customer concentration.',
      },
      {
        title: 'Financial Summary',
        pageStart: 5,
        pageEnd: 8,
        text: 'Gross leverage sat inside the 6.5x springing covenant at FY25 close; the covenant was not tested, as the revolver was undrawn throughout the year. Margins recovered as input costs normalized.',
      },
      {
        title: 'Outlook',
        pageStart: 9,
        pageEnd: 18,
        text: 'Management guides to low-single-digit growth with a return to deleveraging from free cash flow.',
      },
    ],
  },
  {
    docId: 'doc-verloway-cs',
    fileName: 'Verloway_AgriChem_Credit_Memo.pdf',
    lob: 'Wealth Management',
    counterparty: 'Verloway AgriChem',
    rxm: 'RXM-2210',
    docType: 'credit submission',
    date: '2026-08-22',
    pages: 11,
    parsedAt: '2026-08-24T11:15:00Z',
    extracted: true,
    sections: [
      {
        title: 'Facility Overview',
        pageStart: 1,
        pageEnd: 4,
        text: 'A seasonal working-capital revolver sized to the spring planting cycle; availability peaks ahead of planting and steps down post-harvest.',
      },
      {
        title: 'Credit Assessment',
        pageStart: 5,
        pageEnd: 11,
        text: 'Cash conversion is strongly seasonal; the borrowing base is tested monthly against eligible receivables and inventory.',
      },
    ],
  },
  {
    docId: 'doc-vantorel-isda',
    fileName: 'Vantorel_Payments_ISDA_Schedule.pdf',
    lob: 'Counterparty Credit Risk',
    counterparty: 'Vantorel Payments',
    rxm: 'RXM-6155',
    docType: 'ISDA schedule',
    date: '2026-06-09',
    pages: 34,
    parsedAt: '2026-06-10T08:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Schedule to the ISDA Master Agreement',
        pageStart: 1,
        pageEnd: 18,
        text: 'Elections and amendments to the 2002 Master Agreement, including termination events and calculation agent provisions.',
      },
      {
        title: 'Credit Support Annex',
        pageStart: 19,
        pageEnd: 34,
        text: 'Threshold amount for Party B: USD 5,000,000; Minimum Transfer Amount: USD 250,000; daily valuation with USD cash as eligible collateral.',
      },
    ],
  },
  {
    docId: 'doc-veyland-cov',
    fileName: 'Veyland_Holdco_Covenant_Cert_2026-06.pdf',
    lob: 'IB Lending',
    counterparty: 'Veyland US Holdco',
    rxm: 'RXM-6430',
    docType: 'compliance certificate',
    date: '2026-06-30',
    pages: 4,
    parsedAt: '2026-06-30T16:20:00Z',
    extracted: true,
    sections: [
      {
        title: 'Covenant Compliance Certificate',
        pageStart: 1,
        pageEnd: 4,
        text: 'For the fiscal quarter ended 2026-06-30 the borrower certifies compliance with each covenant under the credit agreement. Springing first-lien net leverage covenant: not tested (revolver utilization below the 35% threshold). Gross leverage reported at 5.9x.',
      },
    ],
  },
  {
    docId: 'doc-veyland-ra2',
    fileName: 'Veyland_Holdco_Revolver_Amend_No2.pdf',
    lob: 'IB Lending',
    counterparty: 'Veyland US Holdco',
    rxm: 'RXM-6430',
    docType: 'credit agreement',
    date: '2026-05-12',
    pages: 38,
    parsedAt: '2026-05-12T11:05:00Z',
    extracted: true,
    sections: [
      {
        title: 'Amendment No. 2 to the Revolving Facility',
        pageStart: 1,
        pageEnd: 38,
        text: 'Extends the revolving facility maturity and resets the letter-of-credit sublimit. All other terms of the credit agreement remain in full force and effect.',
      },
    ],
  },
  {
    docId: 'doc-ambervale-q2u',
    fileName: 'Ambervale_Foods_Q2_Performance_Update.pdf',
    lob: 'IB Lending',
    counterparty: 'Ambervale Foods Group',
    rxm: 'RXM-5120',
    docType: 'quarterly update',
    date: '2026-07-20',
    pages: 18,
    parsedAt: '2026-07-20T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Covenant Compliance',
        pageStart: 1,
        pageEnd: 18,
        text: 'Gross first-lien net leverage of 6.1x as of quarter end, against the springing covenant of 6.5x tested when revolver utilization exceeds 35% of commitments. LTM EBITDA revised to $412mm following the Q2 restatement of the co-manufacturing segment.',
      },
    ],
  },
  {
    docId: 'doc-ambervale-cov',
    fileName: 'Ambervale_Foods_Covenant_Cert_2026-06.pdf',
    lob: 'IB Lending',
    counterparty: 'Ambervale Foods Group',
    rxm: 'RXM-5120',
    docType: 'compliance certificate',
    date: '2026-06-30',
    pages: 4,
    parsedAt: '2026-09-02T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Covenant Compliance Certificate',
        pageStart: 1,
        pageEnd: 4,
        text: 'Draft certificate for the fiscal quarter ended 2026-06-30 — unsigned, and prepared at the figures reported before the Q2 restatement. The executed certificate has not been provided.',
      },
    ],
  },
  {
    docId: 'doc-ambervale-ssl',
    fileName: 'Ambervale_Foods_Sponsor_Support_Letter.pdf',
    lob: 'IB Lending',
    counterparty: 'Ambervale Foods Group',
    rxm: 'RXM-5120',
    docType: 'letter',
    date: '2026-05-02',
    pages: 2,
    parsedAt: '2026-05-02T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Sponsor Support',
        pageStart: 1,
        pageEnd: 2,
        text: 'The sponsor confirms its intention to support working-capital needs through the current covenant period. The letter is not a guarantee.',
      },
    ],
  },
  {
    docId: 'doc-ambervale-q1u',
    fileName: 'Ambervale_Foods_Q1_Performance_Update.pdf',
    lob: 'IB Lending',
    counterparty: 'Ambervale Foods Group',
    rxm: 'RXM-5120',
    docType: 'quarterly update',
    date: '2026-04-18',
    pages: 16,
    parsedAt: '2026-04-18T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Financial Performance',
        pageStart: 1,
        pageEnd: 16,
        text: 'Gross leverage of 5.6x at Q1 close against the 6.5x covenant; headroom of 0.9x at the then-current EBITDA.',
      },
    ],
  },
  {
    docId: 'doc-torvane-ca',
    fileName: 'Torvane_Aggregates_Credit_Agreement_2026.pdf',
    lob: 'IB Lending',
    counterparty: 'Torvane Aggregates',
    rxm: 'RXM-4100',
    docType: 'credit agreement',
    date: '2026-02-11',
    pages: 54,
    parsedAt: '2026-02-11T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Financial Covenants',
        pageStart: 1,
        pageEnd: 54,
        text: 'Maximum first-lien net leverage of 5.25x through Q4 2027, stepping down to 4.75x thereafter; minimum interest coverage of 2.00x rising to 2.25x on the same schedule.',
      },
    ],
  },
  {
    docId: 'doc-orvalon-rm',
    fileName: 'Orvalon_Freight_Refinancing_Memo_2026.pdf',
    lob: 'IB Lending',
    counterparty: 'Orvalon Freight Systems',
    rxm: 'RXM-5744',
    docType: 'memo',
    date: '2026-06-05',
    pages: 22,
    parsedAt: '2026-06-05T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Refinancing Structure',
        pageStart: 1,
        pageEnd: 22,
        text: 'The refinancing closed in Q1 2026: the new revolving facility matures in 2029 and the term loan in 2031. Gross leverage falls to 3.1x at close; fixed-charge coverage of 2.4x at the pro-forma run rate. Renewal concentration in two customer contracts is the residual risk.',
      },
    ],
  },
  {
    docId: 'doc-redfenn-ar',
    fileName: 'Redfenn_Timber_Annual_Review_FY25.pdf',
    lob: 'IB Lending',
    counterparty: 'Redfenn Timber Holdings',
    rxm: 'RXM-6292',
    docType: 'annual review',
    date: '2025-11-30',
    pages: 20,
    parsedAt: '2025-11-30T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Business Overview',
        pageStart: 1,
        pageEnd: 20,
        text: 'Gross leverage of 5.2x at FY25 close. This review predates Amendment No. 1 to the facility agreement; covenant and pricing terms described here are superseded.',
      },
    ],
  },
  {
    docId: 'doc-redfenn-fa',
    fileName: 'Redfenn_Timber_Facility_Agreement_2024.pdf',
    lob: 'IB Lending',
    counterparty: 'Redfenn Timber Holdings',
    rxm: 'RXM-6292',
    docType: 'facility agreement',
    date: '2024-08-15',
    pages: 61,
    parsedAt: '2024-08-15T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Covenants',
        pageStart: 1,
        pageEnd: 61,
        text: 'Financial covenants as originally executed. Amendment No. 1 (2026) modifies this section; the amended agreement is not on system.',
      },
    ],
  },
  {
    docId: 'doc-northgale-q2u',
    fileName: 'Northgale_Health_Q2_Update.pdf',
    lob: 'IB Lending',
    counterparty: 'Northgale Health Partners',
    rxm: 'RXM-4488',
    docType: 'quarterly update',
    date: '2026-07-28',
    pages: 14,
    parsedAt: '2026-07-28T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Financial Update',
        pageStart: 1,
        pageEnd: 14,
        text: 'Gross leverage of 4.8x; covenant headroom of 1.4x at the current test. Payer-mix shift toward public reimbursement is monitored; no covenant pressure.',
      },
    ],
  },
  {
    docId: 'doc-northgale-ar',
    fileName: 'Northgale_Health_Annual_Review_FY25.pdf',
    lob: 'IB Lending',
    counterparty: 'Northgale Health Partners',
    rxm: 'RXM-4488',
    docType: 'annual review',
    date: '2026-01-20',
    pages: 19,
    parsedAt: '2026-01-20T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Business Overview',
        pageStart: 1,
        pageEnd: 19,
        text: 'Outpatient services platform with steady census growth; leverage trajectory stable across the projection period.',
      },
    ],
  },
  {
    docId: 'doc-farrowdale-fleet',
    fileName: 'Farrowdale_Logistics_Fleet_Report_2026.pdf',
    lob: 'IB Lending',
    counterparty: 'Farrowdale Logistics',
    rxm: 'RXM-8093',
    docType: 'report',
    date: '2026-06-14',
    pages: 9,
    parsedAt: '2026-06-14T12:00:00Z',
    extracted: true,
    sections: [
      {
        title: 'Fleet Utilization',
        pageStart: 1,
        pageEnd: 9,
        text: 'Fleet utilization recovered to 87% in Q2. Entity-level financials are reported at the parent; look-through to the borrowing entity is not provided in this report.',
      },
    ],
  },
  {
    docId: 'doc-farrowdale-q2',
    fileName: 'Farrowdale_Logistics_Q2_Update.pdf',
    lob: 'IB Lending',
    counterparty: 'Farrowdale Logistics',
    rxm: 'RXM-8093',
    docType: 'quarterly update',
    date: '2026-08-01',
    pages: 9,
    parsedAt: '2026-08-26T14:00:00Z',
    extracted: false,
    sections: [],
  },
]

/** A passage as stored; `snippetHtml` is produced at search time. */
export type DocumentPassage = Omit<DocumentHit, 'snippetHtml'>

export const PASSAGES: DocumentPassage[] = [
  {
    id: 'doc-veyland-q3-liq',
    docId: 'doc-veyland-q3',
    fileName: VEYLAND_DOC_Q3,
    lob: 'IB Lending',
    counterparty: 'Veyland US Holdco',
    rxm: 'RXM-6430',
    docType: 'quarterly update',
    date: '2026-07-15',
    extracted: true,
    snippet:
      'The $150 million revolving credit facility remains undrawn, with $6.0 million utilized for standby letters of credit, leaving availability of approximately $144 million.',
    sectionName: 'Liquidity Summary',
    page: 14,
    imageRef: 'img-veyland-q3-p14-liquidity',
    usedInReviewId: VEYLAND_ID,
    usedInBorrower: 'Veyland',
    usedInSectionN: 2,
  },
  {
    id: 'doc-veyland-annual-cov',
    docId: 'doc-veyland-annual',
    fileName: VEYLAND_DOC_ANNUAL,
    lob: 'IB Lending',
    counterparty: 'Veyland US Holdco',
    rxm: 'RXM-6430',
    docType: 'annual review',
    date: '2026-03-31',
    extracted: true,
    snippet:
      '…springing first-lien net leverage covenant tested when revolver utilization exceeds 35% of commitments…',
    sectionName: 'Capitalization',
    page: 10,
  },
  {
    id: 'doc-seldwyn-fa-72',
    docId: 'doc-seldwyn-fa',
    fileName: 'Seldwyn_Marine_Facility_Agreement.pdf',
    lob: 'IB Lending',
    counterparty: 'Seldwyn Marine Finance',
    rxm: 'RXM-7712',
    docType: 'facility agreement',
    date: '2026-05-02',
    extracted: true,
    snippet:
      '…availability under the revolving facility shall be reduced by the aggregate face amount of letters of credit then outstanding…',
    sectionName: 'Clause 7.2',
    page: 41,
  },
  {
    id: 'doc-veyland-annual-wacc',
    docId: 'doc-veyland-annual',
    fileName: VEYLAND_DOC_ANNUAL,
    lob: 'IB Lending',
    counterparty: 'Veyland US Holdco',
    rxm: 'RXM-6430',
    docType: 'annual review',
    date: '2026-03-31',
    extracted: true,
    snippet:
      'Expected case WACC 9.8%; downside case WACC 10.6%. EV/LTM EBITDA of 8.6x under the expected case.',
    sectionName: 'EV/DCF summary',
    page: 12,
    usedInReviewId: VEYLAND_ID,
    usedInBorrower: 'Veyland',
    usedInSectionN: 2,
  },
  {
    id: 'doc-ambervale-annual-lev',
    docId: 'doc-ambervale-annual',
    fileName: 'Ambervale_Foods_Annual_Review_FY25.pdf',
    lob: 'IB Lending',
    counterparty: 'Ambervale Foods Group',
    rxm: 'RXM-5120',
    docType: 'annual review',
    date: '2026-08-20',
    extracted: true,
    snippet:
      'Gross leverage sat inside the 6.5x springing covenant at FY25 close; the covenant was not tested, as the revolver was undrawn throughout the year.',
    sectionName: 'Financial Summary',
    page: 6,
    usedInReviewId: 'rev-ambervale-2026-08',
    usedInBorrower: 'Ambervale Foods',
    usedInSectionN: 2,
  },
  {
    id: 'doc-verloway-cs-passage',
    docId: 'doc-verloway-cs',
    fileName: 'Verloway_AgriChem_Credit_Memo.pdf',
    lob: 'Wealth Management',
    counterparty: 'Verloway AgriChem',
    rxm: 'RXM-2210',
    docType: 'credit submission',
    date: '2026-08-22',
    extracted: true,
    snippet:
      'Working-capital revolver availability is seasonal, peaking ahead of the spring planting cycle.',
    sectionName: 'Facility Overview',
    page: 3,
  },
  {
    id: 'doc-vantorel-isda-passage',
    docId: 'doc-vantorel-isda',
    fileName: 'Vantorel_Payments_ISDA_Schedule.pdf',
    lob: 'Counterparty Credit Risk',
    counterparty: 'Vantorel Payments',
    rxm: 'RXM-6155',
    docType: 'ISDA schedule',
    date: '2026-06-09',
    extracted: true,
    snippet: 'Threshold amount for Party B: USD 5,000,000; Minimum Transfer Amount: USD 250,000.',
    sectionName: 'Credit Support Annex',
    page: 22,
  },
  {
    id: 'doc-veyland-cov-passage',
    docId: 'doc-veyland-cov',
    fileName: 'Veyland_Holdco_Covenant_Cert_2026-06.pdf',
    lob: 'IB Lending',
    counterparty: 'Veyland US Holdco',
    rxm: 'RXM-6430',
    docType: 'compliance certificate',
    date: '2026-06-30',
    extracted: true,
    snippet:
      'For the fiscal quarter ended 2026-06-30 the borrower certifies compliance with each covenant under the credit agreement.',
    sectionName: 'Covenant Compliance Certificate',
    page: 1,
  },
  {
    id: 'doc-veyland-ra2-passage',
    docId: 'doc-veyland-ra2',
    fileName: 'Veyland_Holdco_Revolver_Amend_No2.pdf',
    lob: 'IB Lending',
    counterparty: 'Veyland US Holdco',
    rxm: 'RXM-6430',
    docType: 'credit agreement',
    date: '2026-05-12',
    extracted: true,
    snippet:
      'Extends the revolving facility maturity and resets the letter-of-credit sublimit; all other terms remain in full force and effect.',
    sectionName: 'Amendment No. 2 to the Revolving Facility',
    page: 1,
  },
  {
    id: 'doc-farrowdale-q2-passage',
    docId: 'doc-farrowdale-q2',
    fileName: 'Farrowdale_Logistics_Q2_Update.pdf',
    lob: 'IB Lending',
    counterparty: 'Farrowdale Logistics',
    rxm: 'RXM-8093',
    docType: 'quarterly update',
    date: '2026-08-01',
    extracted: false,
    snippet:
      'Fleet utilization recovered to 87% in Q2; fuel surcharge pass-through lagged by one quarter.',
    sectionName: 'Operating Review',
    page: 4,
  },
]
