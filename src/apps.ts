/**
 * The Sentinel application registry (suite round, ratified 2026-09-17;
 * fourth application 2026-09-24). Sentinel is a suite of applications on
 * one platform. Every entry is live. All user-facing names/descriptions
 * live in strings.ts (suite block).
 *
 * Inquiry is the platform's workflow-definition-plus-configuration litmus
 * made real: it is CPEA's workflow with one configuration flag off
 * (`questionSets: false`) — the same screen components read `config`, and
 * its route configuration never wires the question-set control in.
 */
import { strings } from '@/strings'

export type AppId = 'crr' | 'erm' | 'vantage' | 'inquiry'

/**
 * Per-application configuration the shared screen components read. An
 * application that shares another's workflow differs from it here, never
 * by copied screens.
 */
export interface AppConfig {
  /**
   * Saved question sets: the segmented ask-mode control, the saved-set
   * cards, and Add new. Off = prompt-only (type it and go; nothing saved).
   */
  questionSets: boolean
}

export interface SentinelApp {
  id: AppId
  short: string
  full: string
  description: string
  status: 'active' | 'design'
  /** Route home for active apps; design-status apps have nowhere to go. */
  home: string
  /**
   * Landing-card lead: 'short' (CRR's serif monogram) or 'full' (CPEA's
   * long serif name at reduced size, with the short label as the aside).
   */
  landingTitle?: 'short' | 'full'
  config: AppConfig
}

export const APPS: readonly SentinelApp[] = [
  {
    id: 'crr',
    short: strings.suite.apps.crr.short,
    full: strings.suite.apps.crr.full,
    description: strings.suite.apps.crr.description,
    status: 'active',
    home: '/crr',
    config: { questionSets: false },
  },
  {
    id: 'erm',
    short: strings.suite.apps.erm.short,
    full: strings.suite.apps.erm.full,
    description: strings.suite.apps.erm.description,
    status: 'active',
    home: '/erm',
    landingTitle: 'full',
    config: { questionSets: true },
  },
  {
    id: 'vantage',
    short: strings.suite.apps.vantage.short,
    full: strings.suite.apps.vantage.full,
    description: strings.suite.apps.vantage.description,
    status: 'active',
    home: '/vantage',
    config: { questionSets: true },
  },
  {
    id: 'inquiry',
    short: strings.suite.apps.inquiry.short,
    full: strings.suite.apps.inquiry.full,
    description: strings.suite.apps.inquiry.description,
    status: 'active',
    home: '/inquiry',
    // CPEA with question sets switched off — a clone by configuration.
    config: { questionSets: false },
  },
]

export const isAppId = (v: unknown): v is AppId => APPS.some((a) => a.id === v)

export const appById = (id: AppId): SentinelApp => APPS.find((a) => a.id === id)!
