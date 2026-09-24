/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VANTAGE DEMO DATA (v1.7; v1.8 additions below the runs) — safe to edit,
 * same contract as fixtures.ts. v1.8: runs carry questions[] + one
 * section per question; Vantage's OWN question-set shelf (two sets); the
 * demo question file's parse; the compact answer pool many-question runs
 * rotate through. The concept's demo run ported verbatim, with borrower names reconciled
 * to the platform's canonical RXM identities (one borrower, one RXM:
 * RXM-4488 is Northgale Health Partners, RXM-8093 is Farrowdale
 * Logistics — the concept's "Systems"/"Partners" variants were
 * illustrative). All data fictional.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type {
  QuestionField,
  QuestionSet,
  VantageBlock,
  VantageCitation,
  VantageDocument,
  VantageRun,
} from '../types'

export const VANTAGE_DEMO_DOCS: VantageDocument[] = [
  { name: 'Exposure_Register_FY25.csv', kind: 'csv', meta: '42 rows', sizeBytes: 18_432 },
  { name: 'Group_Lending_Policy_Extract.pdf', kind: 'pdf', meta: '9 pages', sizeBytes: 1_258_291 },
  {
    name: 'Torvane_Facility_Amendment_No1.pdf',
    kind: 'pdf',
    meta: '14 pages',
    sizeBytes: 2_936_012,
  },
]

const ROWS_CITE: VantageCitation = {
  kind: 'tabular',
  file: 'Exposure_Register_FY25.csv',
  rows: [7, 18, 31],
  of: 42,
  columns: ['borrower', 'rxm_id', 'exposure_m', 'as_of'],
  rowData: [
    { n: 7, cells: ['Torvane Aggregates', 'RXM-4100', '38.2', '2025-12-31'] },
    { n: 18, cells: ['Northgale Health Partners', 'RXM-4488', '31.7', '2025-12-31'] },
    { n: 31, cells: ['Farrowdale Logistics', 'RXM-8093', '26.7', '2025-12-31'] },
  ],
}

export const VANTAGE_DEMO_QUESTION =
  'Which exposures were above the single-name limit at year end, and does the policy allow exceptions?'

export const VANTAGE_DEMO_BLOCKS: VantageBlock[] = [
  {
    type: 'prose',
    paragraphs: [
      'Three exposures exceeded the 25.0m single-name limit at year end: Torvane Aggregates, Northgale Health Partners, and Farrowdale Logistics. The policy does allow exceptions — a single-name exposure may exceed the limit with a documented exception approved by the Credit Committee. Of the three, only Torvane’s exception is documented in the papers provided.',
    ],
  },
  {
    type: 'figures',
    items: [
      {
        label: 'Above limit',
        value: '3 of 42',
        derivation: 'names in the register with exposure > 25.0m',
      },
      {
        label: 'Aggregate excess',
        value: '21.6m',
        derivation: 'computed: Σ(exposure − 25.0m) across the 3 names',
      },
    ],
    citations: [ROWS_CITE],
  },
  {
    type: 'table',
    columns: [
      { key: 'borrower', label: 'Borrower' },
      { key: 'rxm', label: 'RXM', kind: 'mono' },
      { key: 'exposure', label: 'Exposure', align: 'right', kind: 'num' },
      { key: 'over', label: 'Over limit by', align: 'right', kind: 'num' },
      { key: 'exception', label: 'Exception status' },
    ],
    rows: [
      {
        borrower: 'Torvane Aggregates',
        rxm: 'RXM-4100',
        exposure: '38.2m',
        over: '13.2m',
        exception: 'Documented — Amendment No. 1',
      },
      {
        borrower: 'Northgale Health Partners',
        rxm: 'RXM-4488',
        exposure: '31.7m',
        over: '6.7m',
        exception: { value: 'No approval found', warn: true },
      },
      {
        borrower: 'Farrowdale Logistics',
        rxm: 'RXM-8093',
        exposure: '26.7m',
        over: '1.7m',
        exception: { value: 'No approval found', warn: true },
      },
    ],
    citations: [{ ...ROWS_CITE, note: 'limit from policy §3.1' }],
  },
  {
    type: 'quote',
    text: 'A single-name exposure shall not exceed 25.0m without a documented exception approved by the Credit Committee, recorded with the rationale and a review date.',
    citations: [
      {
        kind: 'document',
        file: 'Group_Lending_Policy_Extract.pdf',
        section: '§3.1',
        page: 4,
        quote:
          'A single-name exposure shall not exceed 25.0m without a documented exception approved by the Credit Committee, recorded with the rationale and a review date.',
        imageKind: 'section',
        imageRef: 'img-policy-p4-limits',
      },
    ],
  },
  {
    type: 'prose',
    paragraphs: [
      'Torvane’s exception is recorded in Amendment No. 1: the Credit Committee approved a temporary limit of 40.0m through Q2 2027, with a scheduled step-back to the standard limit thereafter.',
    ],
    citations: [
      {
        kind: 'document',
        file: 'Torvane_Facility_Amendment_No1.pdf',
        section: '§2.4',
        page: 6,
        quote:
          'The Committee approves a temporary single-name limit of 40.0m for Torvane Aggregates through the fiscal quarter ending June 30, 2027, reverting thereafter.',
        imageKind: 'page',
      },
    ],
  },
  {
    type: 'absence',
    text: 'No exception approval appears for Northgale Health Partners or Farrowdale Logistics in the three documents provided. That is an absence in the papers, not a finding of non-approval — the record may exist elsewhere.',
  },
]

const Q_FIVE_LARGEST =
  'What were the five largest exposures at year end, and how did each move against FY24?'
const Q_TORVANE_AMENDMENTS =
  'Summarize every amendment made to the Torvane facility since origination.'
const Q_ADDBACKS = 'List the covenant definitions that reference EBITDA add-backs.'

/**
 * The Runs screen's history: the demo run + three older ones (one
 * cancelled). v1.8 shape: `questions[]` + one `{ question, blocks }`
 * section per question — every historical run here asked one question.
 */
export const VANTAGE_RUNS: VantageRun[] = [
  {
    runId: 'vantage-run-2026-09-18-1432',
    questions: [VANTAGE_DEMO_QUESTION],
    documents: VANTAGE_DEMO_DOCS,
    state: 'completed',
    sections: [{ question: VANTAGE_DEMO_QUESTION, blocks: VANTAGE_DEMO_BLOCKS }],
    startedAt: '2026-09-18T14:32:00Z',
  },
  {
    runId: 'vantage-run-2026-09-17-1010',
    questions: [Q_FIVE_LARGEST],
    documents: [
      { name: 'Exposure_Register_FY25.csv', kind: 'csv', meta: '42 rows', sizeBytes: 18_432 },
      { name: 'Exposure_Register_FY24.csv', kind: 'csv', meta: '40 rows', sizeBytes: 17_204 },
    ],
    state: 'completed',
    startedAt: '2026-09-17T10:10:00Z',
    sections: [
      {
        question: Q_FIVE_LARGEST,
        blocks: [
          {
            type: 'prose',
            paragraphs: [
              'The five largest year-end exposures were Veyland US Holdco (48.6m), Torvane Aggregates (38.2m), Northgale Health Partners (31.7m), Farrowdale Logistics (26.7m) and Ambervale Foods Group (24.9m). Three of the five increased against FY24; Ambervale and Veyland moved most.',
            ],
            citations: [
              {
                kind: 'tabular',
                file: 'Exposure_Register_FY25.csv',
                rows: [3, 7, 18, 31, 12],
                of: 42,
                columns: ['borrower', 'rxm_id', 'exposure_m', 'as_of'],
                rowData: [
                  { n: 3, cells: ['Veyland US Holdco LLC', 'RXM-6430', '48.6', '2025-12-31'] },
                  { n: 7, cells: ['Torvane Aggregates', 'RXM-4100', '38.2', '2025-12-31'] },
                  { n: 12, cells: ['Ambervale Foods Group', 'RXM-5120', '24.9', '2025-12-31'] },
                  { n: 18, cells: ['Northgale Health Partners', 'RXM-4488', '31.7', '2025-12-31'] },
                  { n: 31, cells: ['Farrowdale Logistics', 'RXM-8093', '26.7', '2025-12-31'] },
                ],
              },
            ],
          },
        ],
      },
    ],
  },
  {
    runId: 'vantage-run-2026-09-15-0930',
    questions: [Q_TORVANE_AMENDMENTS],
    documents: [
      {
        name: 'Torvane_Facility_Agreement_2026.pdf',
        kind: 'pdf',
        meta: '54 pages',
        sizeBytes: 5_204_112,
      },
      {
        name: 'Torvane_Facility_Amendment_No1.pdf',
        kind: 'pdf',
        meta: '14 pages',
        sizeBytes: 2_936_012,
      },
      { name: 'Torvane_Aggregates_Q1_Cert.pdf', kind: 'pdf', meta: '4 pages', sizeBytes: 402_113 },
      {
        name: 'Torvane_Board_Minutes_Extract.docx',
        kind: 'docx',
        meta: '6 pages',
        sizeBytes: 88_012,
      },
    ],
    state: 'completed',
    startedAt: '2026-09-15T09:30:00Z',
    sections: [
      {
        question: Q_TORVANE_AMENDMENTS,
        blocks: [
          {
            type: 'prose',
            paragraphs: [
              'One amendment has been executed since origination. Amendment No. 1 (2026) raises the single-name limit for Torvane to 40.0m through Q2 2027 with a scheduled step-back, and restates the covenant grid step-down dates.',
            ],
            citations: [
              {
                kind: 'document',
                file: 'Torvane_Facility_Amendment_No1.pdf',
                section: '§2.4',
                page: 6,
                quote:
                  'The Committee approves a temporary single-name limit of 40.0m for Torvane Aggregates through the fiscal quarter ending June 30, 2027, reverting thereafter.',
                imageKind: 'section',
              },
            ],
          },
        ],
      },
    ],
  },
  {
    runId: 'vantage-run-2026-09-12-1550',
    questions: [Q_ADDBACKS],
    documents: [
      {
        name: 'Torvane_Facility_Agreement_2026.pdf',
        kind: 'pdf',
        meta: '54 pages',
        sizeBytes: 5_204_112,
      },
    ],
    state: 'cancelled',
    startedAt: '2026-09-12T15:50:00Z',
    cancelledAt: '2026-09-12T15:50:40Z',
    sections: [],
  },
]

// ---------------------------------------------------------------------------
// Multi-question runs (v1.8). The mock answers ANY question with canned
// payloads (the v1.7 idiom — the answering engine is future work): a
// one-question run gets the demo answer exactly as v1.7 did; in a
// many-question run the first question gets the demo answer and the rest
// rotate through this pool of compact answers over the same demo docset,
// so every section exercises the block contract (prose + document
// citation, figures + rows used, and the absence block).
// ---------------------------------------------------------------------------

export const VANTAGE_ANSWER_POOL: VantageBlock[][] = [
  [
    {
      type: 'prose',
      paragraphs: [
        'The papers address this only through the limit framework: the policy extract sets the single-name rule and the approval route for exceptions, and the register supplies the year-end figures the rule is applied to. Nothing more specific is stated.',
      ],
      citations: [
        {
          kind: 'document',
          file: 'Group_Lending_Policy_Extract.pdf',
          section: '§3.1',
          page: 4,
          quote:
            'A single-name exposure shall not exceed 25.0m without a documented exception approved by the Credit Committee, recorded with the rationale and a review date.',
          imageKind: 'section',
          imageRef: 'img-policy-p4-limits',
        },
      ],
    },
  ],
  [
    {
      type: 'figures',
      items: [
        {
          label: 'Names in the register',
          value: '42',
          derivation: 'count of rows in Exposure_Register_FY25.csv',
        },
        {
          label: 'Largest exposure',
          value: '48.6m',
          derivation: 'max(exposure_m) across the register — Veyland US Holdco LLC',
        },
      ],
      citations: [
        {
          kind: 'tabular',
          file: 'Exposure_Register_FY25.csv',
          rows: [3],
          of: 42,
          columns: ['borrower', 'rxm_id', 'exposure_m', 'as_of'],
          rowData: [{ n: 3, cells: ['Veyland US Holdco LLC', 'RXM-6430', '48.6', '2025-12-31'] }],
        },
      ],
    },
  ],
  [
    {
      type: 'absence',
      text: 'Nothing in the three documents provided answers this directly. That is an absence in these papers, not a finding — the record may exist elsewhere.',
    },
  ],
]

// ---------------------------------------------------------------------------
// Vantage's question-set shelf (v1.8) — ITS OWN store, never CPEA's. The
// concept's two fixture sets; their questions are authored in the same
// voice as the demo (the concept names the sets, not their questions).
// ---------------------------------------------------------------------------

const field = (setId: string, i: number, label: string, question: string): QuestionField => ({
  id: `${setId}-q${i}`,
  label,
  question,
  outputType: 'text',
  visible: true,
  derivedAcceptable: true,
})

export const EXPOSURE_LIMITS_SWEEP: QuestionSet = {
  id: 'vqs-exposure-limits',
  name: 'Exposure limits sweep',
  description: '6 questions on single-name limits, exceptions and approval status.',
  fields: [
    field(
      'vqs-exposure-limits',
      1,
      'Above limit',
      'Which exposures exceed the single-name limit at the latest reporting date?',
    ),
    field(
      'vqs-exposure-limits',
      2,
      'Excess',
      'By how much does each exceeding exposure breach the limit?',
    ),
    field(
      'vqs-exposure-limits',
      3,
      'Exceptions allowed',
      'Does the policy permit exceptions to the single-name limit, and on what conditions?',
    ),
    field(
      'vqs-exposure-limits',
      4,
      'Approvals',
      'Which limit exceptions are documented, and who approved them?',
    ),
    field(
      'vqs-exposure-limits',
      5,
      'Expiry',
      'When does each approved exception expire or step back?',
    ),
    field(
      'vqs-exposure-limits',
      6,
      'Near limit',
      'Which exposures sit within 10% of the single-name limit?',
    ),
  ],
}

export const KEY_CUSTOMER_SCAN: QuestionSet = {
  id: 'vqs-key-customer',
  name: 'Key-customer scan',
  description: '4 questions locating key-customer mentions across a client’s documents.',
  fields: [
    field(
      'vqs-key-customer',
      1,
      'Key customers',
      'Which customers are named as key or material customers?',
    ),
    field(
      'vqs-key-customer',
      2,
      'Revenue share',
      'What share of revenue does each key customer represent?',
    ),
    field(
      'vqs-key-customer',
      3,
      'Renewals',
      'Do any contracts with key customers expire or renew within 12 months?',
    ),
    field(
      'vqs-key-customer',
      4,
      'Termination rights',
      'Is any change-of-control or termination right tied to a key customer?',
    ),
  ],
}

/** Vantage's fixture shelf, in card order (Exposure limits sweep selected by default). */
export const VANTAGE_QUESTION_SETS: QuestionSet[] = [EXPOSURE_LIMITS_SWEEP, KEY_CUSTOMER_SCAN]

// ---------------------------------------------------------------------------
// The question-file parse (v1.8). THE CONTRACT the mock declares: .xlsx
// (the first sheet) or .csv; the first column; one question per row; blank
// cells skipped; row order kept; no header row. Parsing is backend work — the mock reads no bytes: the
// demo file below parses to its fixture questions; any other file gets an
// honestly labeled placeholder list (see MESSAGES.parsePlaceholder).
// ---------------------------------------------------------------------------

/** Watchlist_Qs.xlsx → 14 questions (the first three are the concept's, verbatim). */
export const WATCHLIST_QS_FILE = 'Watchlist_Qs.xlsx'
export const WATCHLIST_QS: string[] = [
  'Has covenant headroom been recomputed at the revised EBITDA?',
  'Is there a springing condition on the revolver, and has it been triggered?',
  'Does the file reflect the most recent amendment?',
  'Which covenant is closest to its test level, and by how much?',
  'Has the borrower drawn on the revolver since the last review?',
  'Is the latest compliance certificate on file and signed?',
  'Are any reporting deliverables overdue?',
  'Has the sponsor provided an equity cure or a support letter?',
  'Do the EBITDA add-backs exceed the cap in the credit agreement?',
  'Is there a maturity or amortization step inside the next 12 months?',
  'Has the rating outlook changed since the last review?',
  'Were any waivers or consents granted this year?',
  'Does liquidity cover the next four quarters of debt service?',
  'What remediation has management committed to, and by when?',
]

/** Demo question files the mock "parses", by file name (case-insensitive). */
export const QUESTION_FILES: Record<string, string[]> = {
  [WATCHLIST_QS_FILE.toLowerCase()]: WATCHLIST_QS,
}
