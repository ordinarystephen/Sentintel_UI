/**
 * CPEA's question-set slot: the shared control bound to CPEA's OWN shelf,
 * with CPEA's mode labels ("Prompt only" | "Question set"). Wired in by
 * CPEA's route configuration only.
 */
import { QuestionSetControl } from '@/components/questionSets/QuestionSetControl'
import { strings } from '@/strings'
import type { PortfolioQuestionSetsProps } from './portfolioApp'

const s = strings.erm.start

export function CpeaQuestionSets({
  mode,
  onModeChange,
  selectedId,
  onSelect,
  prompt,
}: PortfolioQuestionSetsProps) {
  return (
    <QuestionSetControl
      store="erm"
      labels={{ oneOff: s.modePrompt, set: s.modeQset }}
      mode={mode}
      onModeChange={onModeChange}
      selectedId={selectedId}
      onSelect={onSelect}
    >
      {prompt}
    </QuestionSetControl>
  )
}
