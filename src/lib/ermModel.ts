/**
 * The ERM grading decision table (ratified 2026-09-18) and the row-level
 * computations that hang off it. THE CONTRACT: retrieval similarity never
 * grades; an answer is `stated` only with an entailing quote attached
 * (evidenceRefs non-empty), `derived` only with `inferredFrom` naming its
 * stated inputs, else `unsupported`. Grades live only on answers — a row
 * carries no grade, only a computed flag count. No composite scores, no
 * percentages, no RAG anywhere in ERM.
 */
import type { AnswerGrade, ErmAnswer } from '@/api/types'

/** The decision table, as a pure function over an answer's grounding. */
export function expectedGrade(a: {
  inferredFrom?: string[]
  evidenceRefs: ReadonlyArray<unknown>
}): AnswerGrade {
  if (a.inferredFrom && a.inferredFrom.length > 0) return 'derived'
  if (a.evidenceRefs.length > 0) return 'stated'
  return 'unsupported'
}

/** A row's flag count: the number of unsupported answers for that borrower. */
export function flagCount(answers: readonly ErmAnswer[], rxm: string): number {
  return answers.filter((a) => a.rxm === rxm && a.grade === 'unsupported').length
}

/** Grade totals for a whole answer store (the summary chips). */
export function gradeCounts(answers: readonly ErmAnswer[]): Record<AnswerGrade, number> {
  const out: Record<AnswerGrade, number> = { stated: 0, derived: 0, unsupported: 0 }
  for (const a of answers) out[a.grade]++
  return out
}
