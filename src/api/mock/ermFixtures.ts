/**
 * ═══════════════════════════════════════════════════════════════════════════
 * ERM DEMO DATA (v1.5) — safe to edit, same contract as fixtures.ts.
 * Question sets, the monitored borrower universe, the canonical run's
 * answers (ported from the ratified concept), population accounting, and
 * the historical runs. All names from the existing fictional pool; RXMs
 * are the REPO-CANONICAL identities (the concept's illustrative RXMs were
 * reconciled to canon — one borrower, one RXM, across every application).
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type {
  AnswerEvidenceRef,
  BorrowerRef,
  ErmAnswer,
  ErmRun,
  PopulationAccounting,
  PopulationCriteria,
  QuestionSet,
} from '../types'
import { expectedGrade } from '@/lib/ermModel'
import { DOCUMENTS } from './fixtures'

// ---------------------------------------------------------------------------
// Question sets
// ---------------------------------------------------------------------------

/** The 15 canonical fields + Covenant Headroom + Rating Direction = 17. */
export const QUARTERLY_PULSE: QuestionSet = {
  id: 'qs-quarterly-pulse',
  name: 'Quarterly credit pulse',
  description:
    '17 questions across leverage, liquidity, covenants, ratings, exposure and the coverage team.',
  fields: [
    {
      id: 'counterparty',
      label: 'Counterparty',
      question: 'Who is the borrower / counterparty (legal name)?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: false,
    },
    {
      id: 'team_lead',
      label: 'Team Lead (TL)',
      question: 'Who is the team lead responsible for this exposure?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'credit_officer',
      label: 'Credit Officer (CO)',
      question: 'Who is the credit officer of record?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: false,
    },
    {
      id: 'credit_analyst',
      label: 'Credit Analyst (CA)',
      question: 'Who is the covering credit analyst?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'sector',
      label: 'Sector / Industry',
      question: 'What sector and industry classification applies?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'pd',
      label: 'PD Rating',
      question: 'What is the current PD rating?',
      outputType: 'rating',
      visible: true,
      derivedAcceptable: false,
    },
    {
      id: 'reg',
      label: 'Regulatory Rating',
      question: 'What is the current regulatory classification?',
      outputType: 'rating',
      visible: false,
      derivedAcceptable: false,
    },
    {
      id: 'dscr',
      label: 'Debt Repayment Capacity',
      question: 'What debt service / repayment capacity is evidenced?',
      outputType: 'ratio',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'ev',
      label: 'EV Coverage',
      question: 'What enterprise-value coverage of debt is evidenced?',
      outputType: 'ratio',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'fccr',
      label: 'FCCR',
      question: 'What fixed-charge coverage ratio is evidenced?',
      outputType: 'ratio',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'lev',
      label: 'Gross Leverage',
      question: 'What is gross leverage at the latest reporting date?',
      outputType: 'ratio',
      visible: true,
      derivedAcceptable: false,
    },
    {
      id: 'hd',
      label: 'Covenant Headroom',
      question: 'What covenant headroom exists at the latest test?',
      outputType: 'ratio',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'rd',
      label: 'Rating Direction',
      question: 'What is the rating direction (positive / stable / negative)?',
      outputType: 'rating',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'cwl',
      label: 'CWL Flag',
      question: 'Is the borrower on the credit watch list?',
      outputType: 'flag',
      visible: false,
      derivedAcceptable: false,
    },
    {
      id: 'exp',
      label: 'Total Exposure',
      question: 'What is total committed exposure?',
      outputType: 'number',
      visible: false,
      derivedAcceptable: false,
    },
    {
      id: 'risk',
      label: 'Overall Risk',
      question: 'What overall risk assessment is evidenced?',
      outputType: 'rating',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'summary',
      label: 'Key Risk Summary',
      question: 'Summarize the key risks in one sentence.',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
  ],
}

export const COVENANT_SWEEP: QuestionSet = {
  id: 'qs-covenant-sweep',
  name: 'Covenant sweep',
  description: '5 questions on covenant tests, headroom and certificate currency.',
  fields: [
    {
      id: 'counterparty',
      label: 'Counterparty',
      question: 'Who is the borrower / counterparty (legal name)?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: false,
    },
    {
      id: 'lev',
      label: 'Gross Leverage',
      question: 'What is gross leverage at the latest reporting date?',
      outputType: 'ratio',
      visible: true,
      derivedAcceptable: false,
    },
    {
      id: 'hd',
      label: 'Covenant Headroom',
      question: 'What covenant headroom exists at the latest test?',
      outputType: 'ratio',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'cwl',
      label: 'CWL Flag',
      question: 'Is the borrower on the credit watch list?',
      outputType: 'flag',
      visible: true,
      derivedAcceptable: false,
    },
    {
      id: 'summary',
      label: 'Key Risk Summary',
      question: 'Summarize the key risks in one sentence.',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
  ],
}

export const WATCHLIST_DEEP_DIVE: QuestionSet = {
  id: 'qs-watchlist-deep-dive',
  name: 'Watchlist deep-dive',
  description:
    '8 questions for names already on the watchlist — triggers, mitigants, exit options.',
  fields: [
    {
      id: 'wl-trigger',
      label: 'Watch Trigger',
      question: 'What event or metric placed the borrower on the watchlist?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'wl-status',
      label: 'Trigger Status',
      question: 'Has the triggering condition improved, worsened or held since listing?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'wl-mitigants',
      label: 'Mitigants',
      question: 'What mitigants are in place and are they performing?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'wl-liquidity',
      label: 'Liquidity Runway',
      question: 'What liquidity runway is evidenced at the current burn?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'wl-sponsor',
      label: 'Sponsor Posture',
      question: 'What sponsor support is stated or evidenced?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'wl-exit',
      label: 'Exit Options',
      question: 'What exit or de-risking options are documented?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'wl-covenant',
      label: 'Covenant Position',
      question: 'What is the covenant position at the latest test?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'wl-next',
      label: 'Next Milestone',
      question: 'What is the next dated milestone the file commits to?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
  ],
}
export const SPONSOR_REFRESH: QuestionSet = {
  id: 'qs-sponsor-refresh',
  name: 'Sponsor & ownership refresh',
  description: '6 questions on sponsor support, ownership changes and guarantee scope.',
  fields: [
    {
      id: 'sp-owner',
      label: 'Ownership',
      question: 'Who owns the borrower and has ownership changed in the period?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'sp-sponsor',
      label: 'Sponsor',
      question: 'Who is the financial sponsor of record?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'sp-support',
      label: 'Support Evidence',
      question: 'What sponsor support is stated, and in what form?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'sp-guarantee',
      label: 'Guarantee Scope',
      question: 'What guarantees exist and what do they cover?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'sp-commitment',
      label: 'Committed Capital',
      question: 'What undrawn or committed sponsor capital is evidenced?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'sp-history',
      label: 'Support History',
      question: 'Has the sponsor injected capital before, and when?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
  ],
}
export const LIQUIDITY_STRESS: QuestionSet = {
  id: 'qs-liquidity-stress',
  name: 'Liquidity stress pulse',
  description: '7 questions on availability, maturities and revolver utilization under stress.',
  fields: [
    {
      id: 'lq-avail',
      label: 'Availability',
      question: 'What total liquidity availability is evidenced?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'lq-revolver',
      label: 'Revolver Utilization',
      question: 'What is revolver utilization and its trend?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'lq-maturities',
      label: 'Near Maturities',
      question: 'What maturities fall due inside 18 months?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'lq-burn',
      label: 'Cash Burn',
      question: 'What is the evidenced cash burn or build?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'lq-springing',
      label: 'Springing Tests',
      question: 'Would stress utilization spring any covenant test?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'lq-lc',
      label: 'LC Usage',
      question: 'What letters of credit reduce availability?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'lq-headroom',
      label: 'Stress Headroom',
      question: 'What liquidity headroom remains under the stated stress case?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
  ],
}
export const REG_CLASSIFICATION: QuestionSet = {
  id: 'qs-reg-classification',
  name: 'Regulatory classification sweep',
  description: '4 questions confirming regulatory ratings and classification currency.',
  fields: [
    {
      id: 'rc-class',
      label: 'Classification',
      question: 'What is the current regulatory classification?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'rc-basis',
      label: 'Classification Basis',
      question: 'What documented basis supports the classification?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'rc-date',
      label: 'Last Confirmed',
      question: 'When was the classification last confirmed?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'rc-change',
      label: 'Pending Changes',
      question: 'Is any classification change pending or indicated?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
  ],
}
export const DOC_CURRENCY: QuestionSet = {
  id: 'qs-doc-currency',
  name: 'Documentation currency check',
  description:
    '5 questions on amendments, waivers and whether the file reflects the latest agreement.',
  fields: [
    {
      id: 'dc-latest',
      label: 'Latest Agreement',
      question: 'Does the file hold the latest executed agreement?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'dc-amendments',
      label: 'Amendments',
      question: 'What amendments exist and are they on system?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'dc-waivers',
      label: 'Waivers',
      question: 'What waivers are active and when do they lapse?',
      outputType: 'text',
      visible: true,
      derivedAcceptable: true,
    },
    {
      id: 'dc-certs',
      label: 'Certificate Currency',
      question: 'Is the latest compliance certificate on file?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
    {
      id: 'dc-gaps',
      label: 'Known Gaps',
      question: 'What documentation gaps does the file itself acknowledge?',
      outputType: 'text',
      visible: false,
      derivedAcceptable: true,
    },
  ],
}

/** The 7 saved sets on the CPEA start screen, in card order. */
export const QUESTION_SETS: QuestionSet[] = [
  QUARTERLY_PULSE,
  COVENANT_SWEEP,
  WATCHLIST_DEEP_DIVE,
  SPONSOR_REFRESH,
  LIQUIDITY_STRESS,
  REG_CLASSIFICATION,
  DOC_CURRENCY,
]

// ---------------------------------------------------------------------------
// The ERM lens: the monitored borrower universe (repo-canonical RXMs)
// ---------------------------------------------------------------------------

export const ERM_BORROWERS: BorrowerRef[] = [
  { rxm: 'RXM-5120', name: 'Ambervale Foods Group' },
  { rxm: 'RXM-6430', name: 'Veyland US Holdco LLC' },
  { rxm: 'RXM-4100', name: 'Torvane Aggregates' },
  { rxm: 'RXM-5744', name: 'Orvalon Freight Systems' },
  { rxm: 'RXM-6292', name: 'Redfenn Timber Holdings' },
  { rxm: 'RXM-4488', name: 'Northgale Health Partners' },
  { rxm: 'RXM-8093', name: 'Farrowdale Logistics' },
]

export const ERM_CRITERIA: PopulationCriteria = {
  portfolio: 'IB Lending',
  subPortfolio: 'All sub-portfolios',
  region: 'All regions',
  asOf: 'Latest on system',
}

/** The 11 documents in the canonical run's scope, by fileName. */
export const ERM_RUN_SCOPE: string[] = [
  'Ambervale_Foods_Q2_Performance_Update.pdf',
  'Ambervale_Foods_Covenant_Cert_2026-06.pdf',
  'Ambervale_Foods_Annual_Review_FY25.pdf',
  'Veyland_Holdco_Annual_Review_FY25.pdf',
  'Veyland_Holdco_Q3_Update.pdf',
  'Redfenn_Timber_Annual_Review_FY25.pdf',
  'Redfenn_Timber_Facility_Agreement_2024.pdf',
  'Northgale_Health_Q2_Update.pdf',
  'Northgale_Health_Annual_Review_FY25.pdf',
  'Torvane_Aggregates_Credit_Agreement_2026.pdf',
  'Orvalon_Freight_Refinancing_Memo_2026.pdf',
]

/**
 * The Leveraged Lending slice's 7 documents: the in-scope files of ITS four
 * borrowers (Ambervale, Veyland, Northgale, Torvane). v1.8 fix — the
 * slice had been ERM_RUN_SCOPE.slice(0, 7), which named Redfenn's files
 * (not in the slice) and omitted Torvane's and Northgale's, whose answers
 * cite them; the displayed count (7) is unchanged.
 */
export const LEVERAGED_SCOPE: string[] = [
  'Ambervale_Foods_Q2_Performance_Update.pdf',
  'Ambervale_Foods_Covenant_Cert_2026-06.pdf',
  'Veyland_Holdco_Annual_Review_FY25.pdf',
  'Veyland_Holdco_Q3_Update.pdf',
  'Northgale_Health_Q2_Update.pdf',
  'Northgale_Health_Annual_Review_FY25.pdf',
  'Torvane_Aggregates_Credit_Agreement_2026.pdf',
]

export const ERM_POPULATION: PopulationAccounting = {
  criteria: ERM_CRITERIA,
  included: ERM_BORROWERS.filter((b) => b.rxm !== 'RXM-8093'),
  excluded: [
    {
      ref: { rxm: 'RXM-7712', name: 'Seldwyn Marine Finance' },
      reason: 'excluded — no documents on system as of the run',
    },
    {
      ref: { rxm: 'RXM-2210', name: 'Verloway AgriChem' },
      reason: 'excluded — outside selected portfolio (Wealth Management)',
    },
    {
      ref: { rxm: 'RXM-6429', name: 'Aurelock Dental Group' },
      reason: 'excluded — no exposure at the as-of date',
    },
  ],
  indeterminate: [
    {
      ref: { rxm: 'RXM-8093', name: 'Farrowdale Logistics' },
      reason:
        'indeterminate — insufficient look-through information; included in the count, flagged for review',
    },
  ],
}

export const LEVERAGED_CRITERIA: PopulationCriteria = {
  ...ERM_CRITERIA,
  subPortfolio: 'Leveraged Lending',
}

/**
 * The Leveraged Lending slice's accounting: its four borrowers included;
 * EVERY other monitored borrower excluded with a named reason (v1.8 fix —
 * the slice had dropped Redfenn, Orvalon and Farrowdale without naming
 * them; exclusions are named, never silent).
 */
export const LEVERAGED_POPULATION: PopulationAccounting = {
  criteria: LEVERAGED_CRITERIA,
  included: ERM_BORROWERS.filter((b) =>
    ['RXM-5120', 'RXM-6430', 'RXM-4100', 'RXM-4488'].includes(b.rxm),
  ),
  excluded: [
    ...ERM_POPULATION.excluded,
    ...ERM_BORROWERS.filter((b) => ['RXM-6292', 'RXM-5744', 'RXM-8093'].includes(b.rxm)).map(
      (ref) => ({ ref, reason: 'excluded — outside selected sub-portfolio (Leveraged Lending)' }),
    ),
  ],
  indeterminate: [],
}

// ---------------------------------------------------------------------------
// The canonical run's answers, ported from the ratified concept row-for-row.
// Compact spec: [value, conf, mark?] where mark 'inf' = derived (with its
// stated inputs), 'un' = unsupported (no evidence). The builder attaches
// default evidence to every grounded answer and lets the DECISION TABLE
// assign the grade — fixture data cannot diverge from the contract.
// ---------------------------------------------------------------------------

type Mark = 'inf' | 'un'
type Cell = [string, 'h' | 'm' | 'l', Mark?]
interface RowSpec {
  rxm: string
  name: string
  doc: { fileName: string; docId: string; section: string }
  f: Record<string, Cell>
  inferredInputs?: Record<string, string[]>
}

const CONF = { h: 'high', m: 'medium', l: 'low' } as const

const ROWS: RowSpec[] = [
  {
    rxm: 'RXM-6292',
    name: 'Redfenn Timber Holdings',
    doc: {
      fileName: 'Redfenn_Timber_Annual_Review_FY25.pdf',
      docId: 'doc-redfenn-ar',
      section: 'Business Overview',
    },
    inferredInputs: { team_lead: ['credit_officer'], summary: ['lev', 'pd'] },
    f: {
      counterparty: ['Redfenn Timber Holdings', 'h'],
      team_lead: ['N/A', 'l', 'inf'],
      credit_officer: ['R. Chen', 'm'],
      credit_analyst: ['N/A', 'l'],
      sector: ['Materials — Forestry (NACE 02.20)', 'h'],
      pd: ['B2', 'm'],
      reg: ['—', 'l', 'un'],
      dscr: ['—', 'l', 'un'],
      ev: ['—', 'l', 'un'],
      fccr: ['—', 'l', 'un'],
      lev: ['5.2x', 'm'],
      hd: ['—', 'l', 'un'],
      rd: ['—', 'l', 'un'],
      cwl: ['—', 'l', 'un'],
      exp: ['$310mm CMT', 'm'],
      risk: ['—', 'l', 'un'],
      summary: [
        'Stale document set: eight answers unsupported pending the amended agreement.',
        'm',
        'inf',
      ],
    },
  },
  {
    rxm: 'RXM-5744',
    name: 'Orvalon Freight Systems',
    doc: {
      fileName: 'Orvalon_Freight_Refinancing_Memo_2026.pdf',
      docId: 'doc-orvalon-rm',
      section: 'Refinancing Structure',
    },
    inferredInputs: { team_lead: ['credit_officer'], reg: ['pd', 'lev'] },
    f: {
      counterparty: ['Orvalon Freight Systems', 'h'],
      team_lead: ['T. Alvarez', 'm', 'inf'],
      credit_officer: ['M. Okafor', 'h'],
      credit_analyst: ['N/A', 'l'],
      sector: ['Industrials — Freight & Logistics (NACE 49.41)', 'h'],
      pd: ['Ba3', 'h'],
      reg: ['Pass', 'm', 'inf'],
      dscr: ['DSCR 1.9x LTM', 'm'],
      ev: ['2.6x', 'm'],
      fccr: ['2.4x', 'h'],
      lev: ['3.1x', 'h'],
      hd: ['2.3x', 'h'],
      rd: ['Stable', 'm'],
      cwl: ['No', 'h'],
      exp: ['$140mm CMT', 'h'],
      risk: ['Low', 'm'],
      summary: ['Post-refinancing leverage low; renewal concentration in two contracts.', 'h'],
    },
  },
  {
    rxm: 'RXM-6430',
    name: 'Veyland US Holdco LLC',
    doc: {
      fileName: 'Veyland_Holdco_Q3_Update.pdf',
      docId: 'doc-veyland-q3',
      section: 'Financial Update',
    },
    inferredInputs: { ev: ['lev', 'exp'], rd: ['summary', 'hd'] },
    f: {
      counterparty: ['Veyland US Holdco LLC', 'h'],
      team_lead: ['J. Lindqvist', 'h'],
      credit_officer: ['M. Okafor', 'h'],
      credit_analyst: ['R. Chen', 'm'],
      sector: ['TMT — Application Hosting (NACE 63.11)', 'h'],
      pd: ['B1', 'h'],
      reg: ['Pass', 'h'],
      dscr: ['DSCR 1.6x LTM', 'm'],
      // 8.6x EV/EBITDA ÷ 5.9x leverage — the annual review's own 1.46x (hygiene
      // sweep: the concept's 2.1x contradicted it and CRR's 1.5x trigger case)
      ev: ['1.46x', 'm', 'inf'],
      fccr: ['1.8x', 'h'],
      lev: ['5.9x', 'h'],
      hd: ['0.6x', 'h'],
      rd: ['Negative', 'm', 'inf'],
      cwl: ['No', 'h'],
      exp: ['$1,240mm TLB + $150mm RCF', 'h'],
      risk: ['Medium', 'm'],
      summary: [
        'Renewal-cycle slippage drives the revised expected case; covenant headroom 0.6x.',
        'h',
      ],
    },
  },
  {
    rxm: 'RXM-5120',
    name: 'Ambervale Foods Group',
    doc: {
      fileName: 'Ambervale_Foods_Q2_Performance_Update.pdf',
      docId: 'doc-ambervale-q2u',
      section: 'Covenant Compliance',
    },
    inferredInputs: { hd: ['lev'] },
    f: {
      counterparty: ['Ambervale Foods Group', 'h'],
      team_lead: ['J. Lindqvist', 'h'],
      credit_officer: ['M. Okafor', 'h'],
      credit_analyst: ['T. Alvarez', 'h'],
      sector: ['Consumer — Packaged Foods (NACE 10.89)', 'h'],
      pd: ['B1', 'h'],
      reg: ['Special Mention', 'h'],
      dscr: ['DSCR 1.3x LTM', 'h'],
      ev: ['1.9x', 'm'],
      fccr: ['1.5x', 'h'],
      lev: ['6.1x', 'h'],
      hd: ['0.4x', 'm', 'inf'],
      rd: ['Negative', 'h'],
      cwl: ['Yes', 'h'],
      exp: ['$820mm CMT', 'h'],
      risk: ['High', 'h'],
      summary: [
        'Covenant headroom 0.4x at revised EBITDA; June certificate not yet provided.',
        'h',
      ],
    },
  },
  {
    rxm: 'RXM-4100',
    name: 'Torvane Aggregates',
    doc: {
      fileName: 'Torvane_Aggregates_Credit_Agreement_2026.pdf',
      docId: 'doc-torvane-ca',
      section: 'Financial Covenants',
    },
    f: {
      counterparty: ['Torvane Aggregates', 'h'],
      team_lead: ['T. Alvarez', 'h'],
      credit_officer: ['R. Chen', 'h'],
      credit_analyst: ['N/A', 'l'],
      sector: ['Materials — Aggregates (NACE 08.12)', 'h'],
      pd: ['Ba2', 'h'],
      reg: ['Pass', 'h'],
      dscr: ['DSCR 2.1x LTM', 'h'],
      ev: ['2.8x', 'm'],
      fccr: ['2.0x', 'h'],
      lev: ['4.2x', 'h'],
      hd: ['1.1x', 'h'],
      rd: ['Stable', 'h'],
      cwl: ['No', 'h'],
      exp: ['$460mm CMT', 'h'],
      risk: ['Low', 'h'],
      summary: ['Headroom 1.1x and stable; step-down to 4.75x after Q4 2027.', 'h'],
    },
  },
  {
    rxm: 'RXM-4488',
    name: 'Northgale Health Partners',
    doc: {
      fileName: 'Northgale_Health_Q2_Update.pdf',
      docId: 'doc-northgale-q2u',
      section: 'Financial Update',
    },
    f: {
      counterparty: ['Northgale Health Partners', 'h'],
      team_lead: ['J. Lindqvist', 'h'],
      credit_officer: ['M. Okafor', 'h'],
      credit_analyst: ['T. Alvarez', 'm'],
      sector: ['Healthcare — Outpatient Services (NACE 86.22)', 'h'],
      pd: ['Ba3', 'h'],
      reg: ['Pass', 'h'],
      dscr: ['DSCR 1.7x LTM', 'h'],
      ev: ['2.4x', 'm'],
      fccr: ['1.9x', 'h'],
      lev: ['4.8x', 'h'],
      hd: ['1.4x', 'h'],
      rd: ['Stable', 'h'],
      cwl: ['No', 'h'],
      exp: ['$275mm CMT', 'h'],
      risk: ['Low', 'h'],
      summary: ['Headroom 1.4x; payer-mix shift monitored, no covenant pressure.', 'h'],
    },
  },
]

/**
 * A generated ref's page: 2 + the field's index, held inside the cited
 * section's page range on the document record (hygiene sweep — generated
 * pages had run past the section, and past the end of short documents).
 */
function refPage(r: RowSpec, i: number): number {
  const sec = DOCUMENTS.find((d) => d.docId === r.doc.docId)?.sections?.find(
    (x) => x.title === r.doc.section,
  )
  const p = 2 + i
  if (!sec || (p >= sec.pageStart && p <= sec.pageEnd)) return p
  return sec.pageStart + (i % (sec.pageEnd - sec.pageStart + 1))
}

function buildAnswers(rows: RowSpec[], set: QuestionSet): ErmAnswer[] {
  const out: ErmAnswer[] = []
  for (const r of rows) {
    for (const fd of set.fields) {
      const cell = r.f[fd.id]
      if (!cell) continue
      const [value, conf, mark] = cell
      const inferredFrom = mark === 'inf' ? (r.inferredInputs?.[fd.id] ?? ['lev']) : undefined
      const evidenceRefs: AnswerEvidenceRef[] =
        mark === 'un'
          ? []
          : [
              {
                fileName: r.doc.fileName,
                docId: r.doc.docId,
                sectionName: r.doc.section,
                page: refPage(r, set.fields.indexOf(fd)),
                quote:
                  mark === 'inf'
                    ? `Stated inputs for ${fd.label.toLowerCase()} as reported for ${r.name}.`
                    : `${fd.label}: ${value} — as reported for ${r.name}.`,
                imageKind: 'section',
              },
            ]
      const a: ErmAnswer = {
        rxm: r.rxm,
        questionId: fd.id,
        value,
        conf: CONF[conf],
        inferredFrom,
        evidenceRefs,
        grade: 'unsupported',
      }
      a.grade = expectedGrade(a)
      if (a.grade === 'unsupported') {
        a.limitations =
          'Documents on system predate Amendment No. 1 — the answer could not be grounded.'
        a.value = '—'
      }
      out.push(a)
    }
  }
  return out
}

export const ERM_ANSWERS: ErmAnswer[] = buildAnswers(ROWS, QUARTERLY_PULSE)

// Showcase detail: the Ambervale derived-headroom answer carries the full
// verification-modal content from the concept, verbatim.
{
  const a = ERM_ANSWERS.find((x) => x.rxm === 'RXM-5120' && x.questionId === 'hd')!
  a.value = '0.4x'
  a.rationale = {
    memoFacts:
      'Q2 update states gross leverage of 6.1x against the 6.5x covenant; the prior quarter reported 5.6x against the same test. Headroom computed from the stated figures.',
    basis:
      'The 0.4x figure is computed, not quoted — both inputs are directly stated, the subtraction is ours. Flagged medium confidence pending the covenant certificate.',
  }
  a.limitations =
    'The June compliance certificate has not been provided; the computed headroom is unverified against the certified figures.'
  a.evidenceRefs = [
    {
      fileName: 'Ambervale_Foods_Q2_Performance_Update.pdf',
      docId: 'doc-ambervale-q2u',
      sectionName: 'Covenant Compliance',
      page: 16,
      quote:
        'Gross first-lien net leverage of 6.1x as of quarter end, against the springing covenant of 6.5x tested when revolver utilization exceeds 35% of commitments.',
      imageKind: 'section',
      imageRef: 'img-ambervale-q2-p16-covenant',
    },
    {
      fileName: 'Ambervale_Foods_Q2_Performance_Update.pdf',
      docId: 'doc-ambervale-q2u',
      sectionName: 'Covenant Compliance',
      page: 9,
      quote:
        'LTM EBITDA revised to $412mm following the Q2 restatement of the co-manufacturing segment.',
      imageKind: 'page',
    },
  ]
}

// ---------------------------------------------------------------------------
// Runs — records, newest first. The canonical run is today's; two
// historical runs exercise the Runs screen and frozen revisits.
// ---------------------------------------------------------------------------

const sweepRows = ROWS.filter((r) =>
  ['RXM-5120', 'RXM-6430', 'RXM-4100', 'RXM-4488'].includes(r.rxm),
)

/** The August run: same population, older document set (10 docs), 4 unsupported. */
function augustAnswers(): ErmAnswer[] {
  const out = buildAnswers(ROWS, QUARTERLY_PULSE).map((a) => ({ ...a }))
  for (const a of out) {
    if (a.rxm !== 'RXM-6292') continue
    // In August only four Redfenn answers were ungrounded — and its derived
    // summary says so (today's run says eight).
    if (a.questionId === 'summary')
      a.value = 'Stale document set: four answers unsupported pending the amended agreement.'
    if (['reg', 'dscr', 'ev', 'fccr'].includes(a.questionId)) continue
    if (a.grade === 'unsupported') {
      a.evidenceRefs = [
        {
          fileName: 'Redfenn_Timber_Annual_Review_FY25.pdf',
          docId: 'doc-redfenn-ar',
          sectionName: 'Business Overview',
          page: 4,
          quote: `${a.questionId} as reported at FY25.`,
          imageKind: 'section',
        },
      ]
      a.value = 'As reported at FY25'
      a.grade = expectedGrade(a)
      delete a.limitations
    }
  }
  return out
}

export const ERM_RUNS: ErmRun[] = [
  {
    runId: 'erm-run-2026-09-18-0912',
    startedAt: '2026-09-18T09:12:00Z',
    questionSetId: QUARTERLY_PULSE.id,
    criteria: ERM_CRITERIA,
    state: 'completed',
    population: ERM_POPULATION,
    documents: ERM_RUN_SCOPE,
    answers: ERM_ANSWERS,
  },
  {
    runId: 'erm-run-2026-09-11-1430',
    startedAt: '2026-09-11T14:30:00Z',
    questionSetId: COVENANT_SWEEP.id,
    criteria: LEVERAGED_CRITERIA,
    state: 'completed',
    population: LEVERAGED_POPULATION,
    documents: LEVERAGED_SCOPE,
    answers: buildAnswers(sweepRows, COVENANT_SWEEP),
  },
  {
    runId: 'erm-run-2026-08-28-0900',
    startedAt: '2026-08-28T09:00:00Z',
    questionSetId: QUARTERLY_PULSE.id,
    criteria: ERM_CRITERIA,
    state: 'completed',
    population: ERM_POPULATION,
    // 10 documents: the June covenant certificate was not yet on system
    // (v1.8 fix — the slice had dropped the Orvalon memo its answers cite)
    documents: ERM_RUN_SCOPE.filter((f) => f !== 'Ambervale_Foods_Covenant_Cert_2026-06.pdf'),
    answers: augustAnswers(),
  },
]
