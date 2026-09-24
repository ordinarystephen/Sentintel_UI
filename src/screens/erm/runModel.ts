/**
 * Run-shape helpers shared by the CPEA-workflow screens (v1.8).
 *
 * THE SHAPE SWITCH: a run with exactly ONE question renders the
 * single-question shape (Borrower · RXM · Flags · Answer, no group-by
 * toggle — with one question the two cuts are the same cut); more than
 * one renders the portfolio monitor, untouched. A prompt-only run (no
 * question set) always has exactly one question: its prompt.
 */
import { PROMPT_QUESTION_ID, type ErmRun, type PopulationCriteria } from '@/api/types'
import type { QuestionField, QuestionSet } from '@/api/types'
import { fmt } from '@/lib/fmt'

/** How a population names its scope on the start screen: the borrower, or the dropdown slice. */
export function scopeLabel(criteria: PopulationCriteria, borrowerScope: string): string {
  return criteria.borrower
    ? fmt(borrowerScope, { name: criteria.borrower.name, rxm: criteria.borrower.rxm })
    : `${criteria.portfolio} · ${criteria.subPortfolio} · ${criteria.region}`
}

/** The criteria as Runs rows print them (lower-cased tail), or the borrower. */
export function criteriaLine(criteria: PopulationCriteria, borrowerScope: string): string {
  return criteria.borrower
    ? fmt(borrowerScope, { name: criteria.borrower.name, rxm: criteria.borrower.rxm })
    : `${criteria.portfolio} · ${criteria.subPortfolio.toLowerCase()} · ${criteria.region.toLowerCase()}`
}

/** The short scope in sub-lines ("IB Lending", or the borrower). */
export function scopeShort(criteria: PopulationCriteria, borrowerScope: string): string {
  return criteria.borrower
    ? fmt(borrowerScope, { name: criteria.borrower.name, rxm: criteria.borrower.rxm })
    : criteria.portfolio
}

/**
 * A run's questions, in order: a set run asks its set's fields; a
 * prompt-only run asks exactly one — its prompt. `null` while the set is
 * unknown (still loading, or no longer on the shelf).
 */
export function runQuestions(
  run: Pick<ErmRun, 'questionSetId' | 'prompt'>,
  set: QuestionSet | undefined,
  answerLabel: string,
): QuestionField[] | null {
  if (!run.questionSetId)
    return [
      {
        id: PROMPT_QUESTION_ID,
        label: answerLabel,
        question: run.prompt ?? '',
        outputType: 'text',
        visible: true,
        derivedAcceptable: true,
      },
    ]
  return set ? set.fields : null
}

/** The shape switch: exactly one question → the single-question shape. */
export const isSingleQuestion = (questions: readonly QuestionField[]) => questions.length === 1
