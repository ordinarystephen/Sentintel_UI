/**
 * ═══════════════════════════════════════════════════════════════════════════
 * VANTAGE DEMO DATA (v1.7) — safe to edit, same contract as fixtures.ts.
 * The concept's demo run ported verbatim, with borrower names reconciled
 * to the platform's canonical RXM identities (one borrower, one RXM:
 * RXM-4488 is Northgale Health Partners, RXM-8093 is Farrowdale
 * Logistics — the concept's "Systems"/"Partners" variants were
 * illustrative). All data fictional.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { VantageBlock, VantageCitation, VantageDocument, VantageRun } from '../types'

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

/** The Runs screen's history: the demo run + three older ones (one cancelled). */
export const VANTAGE_RUNS: VantageRun[] = [
  {
    runId: 'vantage-run-2026-09-18-1432',
    question: VANTAGE_DEMO_QUESTION,
    documents: VANTAGE_DEMO_DOCS,
    state: 'completed',
    blocks: VANTAGE_DEMO_BLOCKS,
    startedAt: '2026-09-18T14:32:00Z',
  },
  {
    runId: 'vantage-run-2026-09-17-1010',
    question:
      'What were the five largest exposures at year end, and how did each move against FY24?',
    documents: [
      { name: 'Exposure_Register_FY25.csv', kind: 'csv', meta: '42 rows', sizeBytes: 18_432 },
      { name: 'Exposure_Register_FY24.csv', kind: 'csv', meta: '40 rows', sizeBytes: 17_204 },
    ],
    state: 'completed',
    startedAt: '2026-09-17T10:10:00Z',
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
  {
    runId: 'vantage-run-2026-09-15-0930',
    question: 'Summarize every amendment made to the Torvane facility since origination.',
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
  {
    runId: 'vantage-run-2026-09-12-1550',
    question: 'List the covenant definitions that reference EBITDA add-backs.',
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
    blocks: [],
  },
]
