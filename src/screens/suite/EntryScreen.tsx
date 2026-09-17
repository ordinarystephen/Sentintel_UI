/**
 * `/` — the entry decision point (entitlement routing, ratified 2026-09-17):
 * exactly one entitled app → straight to its home, no landing, no click.
 * Two or more → last-used app if `sentinel.lastApp` names an entitled one,
 * otherwise the landing page renders here. `/apps` bypasses the decision
 * and always shows the landing (it is the switcher's full-page form, not a
 * toll booth).
 */
import { Navigate } from 'react-router-dom'
import { appById, isAppId } from '@/apps'
import { useMe } from '@/api/hooks'
import { readLastApp } from '@/lib/lastApp'
import { SuiteLandingScreen } from './SuiteLandingScreen'

export function EntryScreen() {
  const me = useMe()
  if (!me.data) return null // resolves in one tick against the mock; no flash worth chrome
  const entitled = me.data.entitlements.filter(isAppId)
  if (entitled.length === 1) return <Navigate to={appById(entitled[0]).home} replace />
  const last = readLastApp()
  if (last && entitled.includes(last)) return <Navigate to={appById(last).home} replace />
  return <SuiteLandingScreen />
}
