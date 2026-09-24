/**
 * Regression: stale persisted mock state (the class of bug the clean-slate
 * suite could never see). Two scenarios:
 *  A. An old-SHAPE review under the CURRENT schema version (the exact v1.0
 *     bug: version not bumped) — guards must render it as "no zone", with
 *     the app fully usable and no crash page.
 *  B. A payload with an outdated version number — discarded on load; the
 *     fixtures (with the zones) win.
 */
import { expect, test } from '@playwright/test'

const VEYLAND = '/crr/review/rev-veyland-2026-08'
// Keep in sync with STATE_VERSION in src/api/mock/mockApi.ts.
const CURRENT_VERSION = 10

/** A minimal pre-v1.0-shaped Veyland override: no `areas`, no `referenceData`. */
const LEGACY_REVIEW = {
  id: 'rev-veyland-2026-08',
  borrowerName: 'Veyland US Holdco LLC (stale copy)',
  rxm: 'RXM-6430',
  lob: 'IB Lending',
  ownerId: 'u-me',
  ownerName: 'Stark, Tony',
  status: 'ready',
  createdAt: '2026-08-28T09:31:00Z',
  openItems: 0,
  sectionsPopulated: 1,
  sector: 'Software (application hosting)',
  ownership: 'sponsor-owned',
  ratings: [],
  dealTypeChips: [],
  runCompletedAt: '2026-08-28T09:42:00Z',
  documents: [],
  story: { docsLine: 'stale.pdf', narrative: 'A review persisted before v1.0.', changes: [] },
  sections: [
    { n: 1, title: 'Transaction & Company Overview', status: 'populated', items: [] },
    { n: 2, title: 'Financials', status: 'pending', feederNote: 'stale', items: [] },
    { n: 3, title: 'Capital Structure & Terms', status: 'pending', feederNote: 'stale', items: [] },
    { n: 4, title: 'Risk Rating Rationale', status: 'pending', feederNote: 'stale', items: [] },
    { n: 5, title: 'Covenants & Monitoring', status: 'pending', feederNote: 'stale', items: [] },
    { n: 6, title: 'Recommendation', status: 'pending', feederNote: 'stale', items: [] },
  ],
  attention: [],
  dispositions: [],
  confidenceFloor: 0.6,
  readOnly: false,
}

function seed(version: number) {
  return JSON.stringify({
    version,
    overrides: { 'rev-veyland-2026-08': LEGACY_REVIEW },
    processing: {},
    reRuns: {},
  })
}

test('A: old-shape review under the current version renders without zones and without crashing', async ({
  page,
}) => {
  const errors: string[] = []
  page.on('pageerror', (e) => errors.push(e.message))
  await page.addInitScript(
    ([payload]) => localStorage.setItem('sentinel.mock.state', payload),
    [seed(CURRENT_VERSION)],
  )
  await page.goto(VEYLAND)

  // the stale copy renders (proving it was NOT discarded), with both zones absent
  await expect(page.getByRole('heading', { level: 1 })).toHaveText(
    'Veyland US Holdco LLC (stale copy)',
  )
  await expect(page.getByRole('button', { name: /Areas of assessment/ })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Reference data/ })).toHaveCount(0)
  // not the router dev page, not our error card — the actual review screen
  await expect(page.getByText('This screen failed to render')).toHaveCount(0)
  await expect(page.getByText('Unexpected Application Error')).toHaveCount(0)

  // and the app stays usable: workpaper expands, navigation works
  await page.getByRole('button', { name: /2.*Financials/ }).click()
  await expect(page.getByText('stale', { exact: true }).first()).toBeVisible()
  await page
    .getByRole('navigation', { name: 'App navigation' })
    .getByRole('link', { name: 'Documents' })
    .click()
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Documents')
  expect(errors).toEqual([])
})

test('B: an outdated version number is discarded on load — fixtures (with the zones) win', async ({
  page,
}) => {
  await page.addInitScript(
    ([payload]) => localStorage.setItem('sentinel.mock.state', payload),
    [seed(CURRENT_VERSION - 1)],
  )
  await page.goto(VEYLAND)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veyland US Holdco LLC')
  await expect(page.getByRole('button', { name: /Areas of assessment/ })).toContainText('8 areas')
  await expect(page.getByRole('button', { name: /Reference data/ })).toBeVisible()
})
