/**
 * CPEA's route configuration (routes stay `/erm` — the CPEA rename is
 * presentation). CPEA runs the workflow with question sets ON, so this is
 * where the question-set control is wired in — and the ONLY route
 * configuration that does so.
 */
import { appById } from '@/apps'
import { CpeaQuestionSets } from './CpeaQuestionSets'
import { PORTFOLIO_COPY, type PortfolioApp } from './portfolioApp'
import { portfolioRoute } from './portfolioRoutes'

export const CPEA_APP: PortfolioApp = {
  id: 'erm',
  base: appById('erm').home,
  config: appById('erm').config,
  copy: PORTFOLIO_COPY.erm,
  slots: { QuestionSets: CpeaQuestionSets },
}

export const cpeaRoute = portfolioRoute(CPEA_APP)
