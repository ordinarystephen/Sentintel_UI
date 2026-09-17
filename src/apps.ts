/**
 * The Sentinel application registry (suite round, ratified 2026-09-17).
 * Sentinel is a suite of applications on one platform; the app built so far
 * IS the CRR application. ERM and Vantage exist as landing-page entries
 * ("In design") — they have no routes and their cards are not links.
 * All user-facing names/descriptions live in strings.ts (suite block).
 */
import { strings } from '@/strings'

export type AppId = 'crr' | 'erm' | 'vantage'

export interface SentinelApp {
  id: AppId
  short: string
  full: string
  description: string
  status: 'active' | 'design'
  /** Route home for active apps; design-status apps have nowhere to go. */
  home: string
}

export const APPS: readonly SentinelApp[] = [
  {
    id: 'crr',
    short: strings.suite.apps.crr.short,
    full: strings.suite.apps.crr.full,
    description: strings.suite.apps.crr.description,
    status: 'active',
    home: '/crr',
  },
  {
    id: 'erm',
    short: strings.suite.apps.erm.short,
    full: strings.suite.apps.erm.full,
    description: strings.suite.apps.erm.description,
    status: 'design',
    home: '/erm',
  },
  {
    id: 'vantage',
    short: strings.suite.apps.vantage.short,
    full: strings.suite.apps.vantage.full,
    description: strings.suite.apps.vantage.description,
    status: 'design',
    home: '/vantage',
  },
]

export const isAppId = (v: unknown): v is AppId => APPS.some((a) => a.id === v)

export const appById = (id: AppId): SentinelApp => APPS.find((a) => a.id === id)!
