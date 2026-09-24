/**
 * Inquiry's route configuration (demo feedback round, 2026-09-24): the
 * fourth application, for senior leadership — CPEA's workflow with ONE
 * configuration flag off (`questionSets: false` in the registry). Same
 * shell, same screens, same components as CPEA; its own home (`/inquiry`),
 * its own words (strings.inquiry, overrides only), its own run store.
 * It wires in NO question-set control: nothing reachable from this module
 * imports one (src/screens/inquiry/routeGuard.test.ts holds the line).
 */
import { appById } from '@/apps'
import { PORTFOLIO_COPY, type PortfolioApp } from '@/screens/erm/portfolioApp'
import { portfolioRoute } from '@/screens/erm/portfolioRoutes'

export const INQUIRY_APP: PortfolioApp = {
  id: 'inquiry',
  base: appById('inquiry').home,
  config: appById('inquiry').config,
  copy: PORTFOLIO_COPY.inquiry,
  slots: {},
}

export const inquiryRoute = portfolioRoute(INQUIRY_APP)
