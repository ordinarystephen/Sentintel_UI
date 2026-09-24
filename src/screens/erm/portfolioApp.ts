/**
 * The CPEA workflow as a configurable application (demo feedback round,
 * 2026-09-24): "a clone by configuration, not a second codebase". The
 * shared screens in this folder (start · processing · results · runs ·
 * documents) serve every application that runs this workflow — CPEA and
 * Inquiry — and read WHICH application they are from this context:
 *
 *  - `config`  the registry's app config (src/apps.ts). `questionSets:
 *               false` = prompt-only: no segmented modes, no shelf.
 *  - `base`    the route home (`/erm`, `/inquiry`) — every link and
 *               navigation is relative to it.
 *  - `copy`    CPEA's words (strings.erm) with the application's own
 *               overrides laid over them (strings.inquiry holds ONLY the
 *               words that differ).
 *  - `slots`   capabilities the screens render but do not import. The
 *               question-set control is wired in by CPEA's route
 *               configuration only; Inquiry's route configuration never
 *               reaches it (guarded by src/screens/inquiry/routeGuard.test).
 */
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import type { AppConfig } from '@/apps'
import type { PortfolioAppId, QuestionSetStore } from '@/api/types'
import { strings } from '@/strings'

/** strings.erm with its literal types widened, so an overlay may say something else. */
type Widen<T> = { [K in keyof T]: T[K] extends string ? string : Widen<T[K]> }
export type PortfolioCopy = Widen<typeof strings.erm>
type CopyOverlay = { [K in keyof PortfolioCopy]?: Partial<PortfolioCopy[K]> }

function overlay(base: PortfolioCopy, over: CopyOverlay): PortfolioCopy {
  const out = { ...base }
  for (const key of Object.keys(over) as Array<keyof PortfolioCopy>)
    out[key] = { ...base[key], ...over[key] } as never
  return out
}

/** Each application's words: CPEA's own; Inquiry = CPEA's with its overrides. */
export const PORTFOLIO_COPY: Record<PortfolioAppId, PortfolioCopy> = {
  erm: strings.erm,
  inquiry: overlay(strings.erm, strings.inquiry),
}

/** What the start screen hands the question-set slot (the one-off pane is the prompt box). */
export interface PortfolioQuestionSetsProps {
  mode: 'oneoff' | 'set'
  onModeChange: (mode: 'oneoff' | 'set') => void
  selectedId: string
  onSelect: (setId: string) => void
  prompt: ReactNode
}

export interface PortfolioSlots {
  /** Present only in route configurations that wire the question-set control in. */
  QuestionSets?: ComponentType<PortfolioQuestionSetsProps>
}

export interface PortfolioApp {
  id: PortfolioAppId
  base: string
  config: AppConfig
  copy: PortfolioCopy
  slots: PortfolioSlots
}

/** The application's question-set shelf — `null` when question sets are off (Inquiry). */
export const shelfOf = (app: PortfolioApp): QuestionSetStore | null =>
  app.config.questionSets && app.id === 'erm' ? 'erm' : null

export const PortfolioAppContext = createContext<PortfolioApp | null>(null)

export function usePortfolioApp(): PortfolioApp {
  const app = useContext(PortfolioAppContext)
  if (!app) throw new Error('usePortfolioApp: render inside a portfolio application shell')
  return app
}
