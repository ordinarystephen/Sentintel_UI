/**
 * ═══════════════════════════════════════════════════════════════════════════
 * INQUIRY DEMO DATA (v1.8) — safe to edit, same contract as fixtures.ts.
 * Inquiry is CPEA's workflow with question sets switched off, so its runs
 * are CPEA run records (ErmRun) with no question set: each asks ONE
 * question (`prompt`), and each answer carries `questionId: 'prompt'`.
 * The population, criteria and document scope are CPEA's canonical ones —
 * one borrower, one RXM, one truth across every application.
 *
 * Grades are NEVER typed here: every answer self-assigns through the
 * decision table (expectedGrade) — stated only with an entailing quote,
 * derived only with named stated inputs, else unsupported. All data
 * fictional; any resemblance to real entities is coincidental.
 * ═══════════════════════════════════════════════════════════════════════════
 */
import type { AnswerEvidenceRef, ErmAnswer, ErmRun } from '../types'
import { PROMPT_QUESTION_ID } from '../types'
import { expectedGrade } from '@/lib/ermModel'
import {
  ERM_CRITERIA,
  ERM_POPULATION,
  ERM_RUN_SCOPE,
  LEVERAGED_CRITERIA,
  LEVERAGED_POPULATION,
  LEVERAGED_SCOPE,
} from './ermFixtures'

type Conf = ErmAnswer['conf']

function ref(
  fileName: string,
  docId: string,
  sectionName: string,
  page: number,
  quote: string,
  imageKind: AnswerEvidenceRef['imageKind'] = 'section',
): AnswerEvidenceRef {
  return { fileName, docId, sectionName, page, quote, imageKind }
}

/** One borrower's answer to a one-question run, graded by the decision table. */
function answer(
  rxm: string,
  value: string,
  conf: Conf,
  evidenceRefs: AnswerEvidenceRef[],
  extra: Pick<ErmAnswer, 'inferredFrom' | 'rationale' | 'limitations'> = {},
): ErmAnswer {
  const a: ErmAnswer = {
    rxm,
    questionId: PROMPT_QUESTION_ID,
    value,
    conf,
    evidenceRefs,
    grade: 'unsupported',
    ...extra,
  }
  a.grade = expectedGrade(a)
  return a
}

const PREDATES_AMENDMENT =
  'Documents on system predate Amendment No. 1 — the answer could not be grounded.'

// ---------------------------------------------------------------------------
// The demo run (concept r1): refinancing risk — 4 stated · 1 derived · 1
// unsupported. Answer texts verbatim from the concept; the concept carries
// no per-borrower evidence, so the entailing quotes are authored against
// each borrower's documents on system.
// ---------------------------------------------------------------------------

export const INQUIRY_DEMO_QUESTION =
  'Which borrowers face refinancing risk in the next 12 months, and what drives it?'

export const INQUIRY_DEMO_ANSWERS: ErmAnswer[] = [
  answer(
    'RXM-6292',
    'Answer could not be grounded — documents on system predate Amendment No. 1.',
    'low',
    [],
    { limitations: PREDATES_AMENDMENT },
  ),
  answer(
    'RXM-5120',
    'Yes — the RCF matures Aug 2027 and the springing covenant is tested; refinancing at tighter terms is likely with headroom at 0.4x.',
    'high',
    [
      ref(
        'Ambervale_Foods_Q2_Performance_Update.pdf',
        'doc-ambervale-q2u',
        'Covenant Compliance',
        14,
        'The revolving credit facility matures in August 2027; utilization has exceeded 35% of commitments since May, so the springing covenant is tested at each quarter end.',
      ),
      ref(
        'Ambervale_Foods_Q2_Performance_Update.pdf',
        'doc-ambervale-q2u',
        'Covenant Compliance',
        16,
        'Gross first-lien net leverage of 6.1x as of quarter end, against the springing covenant of 6.5x tested when revolver utilization exceeds 35% of commitments.',
      ),
    ],
  ),
  answer(
    'RXM-6430',
    'Elevated — revolver renewal due Q2 2027; derived from the maturity schedule and the revised expected case, not stated as a plan.',
    'medium',
    [
      ref(
        'Veyland_Holdco_Annual_Review_FY25.pdf',
        'doc-veyland-annual',
        'Capitalization',
        11,
        'The $150mm revolving credit facility, as extended, terminates on June 30, 2027.',
      ),
      ref(
        'Veyland_Holdco_Q3_Update.pdf',
        'doc-veyland-q3',
        'Renewal Pipeline',
        8,
        'Management expects the two slipped renewals to close in Q4 at flat-to-modestly-lower pricing.',
        'page',
      ),
    ],
    {
      inferredFrom: ['revolver maturity (annual review)', 'revised expected case (Q3 update)'],
      rationale: {
        memoFacts:
          'The annual review puts the revolver’s termination date at June 30, 2027 — inside the 12-month window. The Q3 update revises the expected case downward on two slipped enterprise renewals.',
        basis:
          'The refinancing risk is inferred, not quoted: both inputs are stated, but no document states a renewal plan. Medium confidence until the lenders’ renewal terms are on system.',
      },
    },
  ),
  answer(
    'RXM-4100',
    'No — the term loan matures 2030; the temporary limit exception steps back Q2 2027 but carries no refinancing event.',
    'high',
    [
      ref(
        'Torvane_Aggregates_Credit_Agreement_2026.pdf',
        'doc-torvane-ca',
        'Financial Covenants',
        12,
        'The Term Loan shall be repaid in full on the Maturity Date, March 31, 2030; no scheduled amortization falls due before that date.',
      ),
    ],
  ),
  answer(
    'RXM-4488',
    'Low — no maturities inside 12 months; the nearest is the 2028 term loan.',
    'high',
    [
      ref(
        'Northgale_Health_Annual_Review_FY25.pdf',
        'doc-northgale-ar',
        'Business Overview',
        11,
        'The term loan matures in 2028; no other scheduled maturities fall before then.',
      ),
    ],
  ),
  answer('RXM-5744', 'No — refinanced in Q1 2026; nearest maturity 2029.', 'high', [
    ref(
      'Orvalon_Freight_Refinancing_Memo_2026.pdf',
      'doc-orvalon-rm',
      'Refinancing Structure',
      2,
      'The refinancing closed in Q1 2026: the new revolving facility matures in 2029 and the term loan in 2031.',
    ),
  ]),
]

/**
 * The canonical one-question payload a user-started prompt-only run
 * materializes on completion (CPEA or Inquiry) — the demo idiom: the
 * answering engine is future work, so any typed question gets these
 * answers for the borrowers in its population.
 */
export const PROMPT_RUN_ANSWERS: ErmAnswer[] = INQUIRY_DEMO_ANSWERS

// ---------------------------------------------------------------------------
// History: two completed runs + one cancelled (the concept draws one of
// each; the second completed run re-asks CPEA's placeholder example with
// the canonical headroom values, so the applications agree).
// ---------------------------------------------------------------------------

const EXPOSURE_QUESTION = 'Where is our largest single-name exposure, and has it grown this year?'

const EXPOSURE_ANSWERS: ErmAnswer[] = [
  answer(
    'RXM-6430',
    '$1,390mm committed ($1,240mm TLB + $150mm RCF) — the largest in the population; down $35mm this year on the June prepayment.',
    'high',
    [
      ref(
        'Veyland_Holdco_Annual_Review_FY25.pdf',
        'doc-veyland-annual',
        'Capitalization',
        10,
        'Total debt outstanding of $1,240mm comprises a $1,240mm Term Loan B due 2030 and an undrawn $150mm revolving credit facility.',
      ),
    ],
  ),
  answer('RXM-5120', '$820mm committed — unchanged this year.', 'high', [
    ref(
      'Ambervale_Foods_Q2_Performance_Update.pdf',
      'doc-ambervale-q2u',
      'Covenant Compliance',
      4,
      'Total commitments of $820mm are unchanged from the prior year end.',
      'page',
    ),
  ]),
  answer('RXM-4100', '$460mm committed — up from $410mm on the 2026 credit agreement.', 'high', [
    ref(
      'Torvane_Aggregates_Credit_Agreement_2026.pdf',
      'doc-torvane-ca',
      'Financial Covenants',
      2,
      'Aggregate commitments of $460mm, increased from $410mm under the facility this agreement replaces.',
    ),
  ]),
  answer('RXM-6292', '$310mm committed — unchanged since the 2024 facility agreement.', 'medium', [
    ref(
      'Redfenn_Timber_Facility_Agreement_2024.pdf',
      'doc-redfenn-fa',
      'Covenants',
      5,
      'Aggregate commitments under this agreement: $310mm.',
      'page',
    ),
  ]),
  answer('RXM-4488', '$275mm committed — unchanged this year.', 'high', [
    ref(
      'Northgale_Health_Q2_Update.pdf',
      'doc-northgale-q2u',
      'Financial Update',
      3,
      'Committed facilities of $275mm, unchanged since FY25 close.',
    ),
  ]),
  answer('RXM-5744', '$140mm committed — down from $185mm after the Q1 refinancing.', 'high', [
    ref(
      'Orvalon_Freight_Refinancing_Memo_2026.pdf',
      'doc-orvalon-rm',
      'Refinancing Structure',
      4,
      'Post-refinancing commitments total $140mm, against $185mm under the facilities repaid at close.',
    ),
  ]),
]

const HEADROOM_QUESTION = 'Which borrowers have covenant headroom below 1.0x at the latest test?'

const HEADROOM_ANSWERS: ErmAnswer[] = [
  answer(
    'RXM-5120',
    'Yes — 0.4x at the revised Q2 EBITDA, computed from the stated 6.1x leverage against the 6.5x covenant.',
    'medium',
    [
      ref(
        'Ambervale_Foods_Q2_Performance_Update.pdf',
        'doc-ambervale-q2u',
        'Covenant Compliance',
        16,
        'Gross first-lien net leverage of 6.1x as of quarter end, against the springing covenant of 6.5x tested when revolver utilization exceeds 35% of commitments.',
      ),
      ref(
        'Ambervale_Foods_Q2_Performance_Update.pdf',
        'doc-ambervale-q2u',
        'Financial Performance',
        9,
        'LTM EBITDA revised to $412mm following the Q2 restatement of the co-manufacturing segment.',
        'page',
      ),
    ],
    {
      inferredFrom: ['gross leverage 6.1x', 'covenant level 6.5x'],
      rationale: {
        memoFacts:
          'Q2 update states gross leverage of 6.1x against the 6.5x covenant. Headroom computed from the stated figures.',
        basis:
          'The 0.4x figure is computed, not quoted — both inputs are directly stated, the subtraction is ours.',
      },
      limitations:
        'The June compliance certificate has not been provided; the computed headroom is unverified against the certified figures.',
    },
  ),
  answer('RXM-6430', 'Yes — 0.6x at the revised EBITDA, as stated in the Q3 update.', 'high', [
    ref(
      'Veyland_Holdco_Q3_Update.pdf',
      'doc-veyland-q3',
      'Financial Update',
      11,
      'Covenant headroom narrows to 0.6x at the revised EBITDA.',
    ),
  ]),
  answer('RXM-4100', 'No — 1.1x against the 5.25x maximum.', 'high', [
    ref(
      'Torvane_Aggregates_Credit_Agreement_2026.pdf',
      'doc-torvane-ca',
      'Financial Covenants',
      13,
      'Maximum first-lien net leverage of 5.25x through Q4 2027, stepping down to 4.75x thereafter.',
    ),
  ]),
  answer('RXM-4488', 'No — 1.4x at the current test.', 'high', [
    ref(
      'Northgale_Health_Q2_Update.pdf',
      'doc-northgale-q2u',
      'Financial Update',
      6,
      'Gross leverage of 4.8x; covenant headroom of 1.4x at the current test.',
    ),
  ]),
  answer('RXM-5744', 'No — 2.3x after the refinancing.', 'high', [
    ref(
      'Orvalon_Freight_Refinancing_Memo_2026.pdf',
      'doc-orvalon-rm',
      'Refinancing Structure',
      7,
      'Pro-forma headroom of 2.3x against the leverage covenant at close.',
    ),
  ]),
  answer(
    'RXM-6292',
    'Answer could not be grounded — documents on system predate Amendment No. 1.',
    'low',
    [],
    { limitations: PREDATES_AMENDMENT },
  ),
]

/** Inquiry's run store — its own slice, never CPEA's Runs. Newest first. */
export const INQUIRY_RUNS: ErmRun[] = [
  {
    runId: 'inquiry-run-2026-09-24-0912',
    startedAt: '2026-09-24T09:12:00Z',
    prompt: INQUIRY_DEMO_QUESTION,
    criteria: ERM_CRITERIA,
    state: 'completed',
    population: ERM_POPULATION,
    documents: ERM_RUN_SCOPE,
    answers: INQUIRY_DEMO_ANSWERS,
  },
  {
    runId: 'inquiry-run-2026-09-19-1604',
    startedAt: '2026-09-19T16:04:00Z',
    prompt: EXPOSURE_QUESTION,
    criteria: ERM_CRITERIA,
    state: 'completed',
    population: ERM_POPULATION,
    documents: ERM_RUN_SCOPE,
    answers: EXPOSURE_ANSWERS,
  },
  {
    runId: 'inquiry-run-2026-09-16-1120',
    startedAt: '2026-09-16T11:20:00Z',
    prompt: HEADROOM_QUESTION,
    criteria: ERM_CRITERIA,
    state: 'completed',
    population: ERM_POPULATION,
    documents: ERM_RUN_SCOPE,
    answers: HEADROOM_ANSWERS,
  },
  {
    runId: 'inquiry-run-2026-09-12-0840',
    startedAt: '2026-09-12T08:40:00Z',
    prompt: 'Summarize covenant pressure across the leveraged book.',
    criteria: LEVERAGED_CRITERIA,
    state: 'cancelled',
    population: LEVERAGED_POPULATION,
    documents: LEVERAGED_SCOPE,
    answers: [],
    cancelledAt: '2026-09-12T08:40:50Z',
  },
]
