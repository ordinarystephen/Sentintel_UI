/**
 * The handoff screenshot set (build-spec Phase 6) — written into docs/screenshots/
 * so the dev team can see every screen without running the app. Not part of
 * the normal e2e run: `npm run screenshots:docs` (sets DOCS_SHOTS=1).
 */
import { expect, test, type Page } from '@playwright/test'

test.skip(!process.env.DOCS_SHOTS, 'run with DOCS_SHOTS=1 (npm run screenshots:docs)')

const OUT = 'docs/screenshots'
const VEYLAND = '/crr/review/rev-veyland-2026-08'
const THEMES = [
  { name: 'stone-light', family: 'stone', dark: false },
  { name: 'stone-dark', family: 'stone', dark: true },
  { name: 'cobalt-light', family: 'cobalt', dark: false },
  { name: 'cobalt-dark', family: 'cobalt', dark: true },
]
async function prep(page: Page, family: string, dark: boolean) {
  // the handoff set shows the product: hide the dev-only Font Lab trigger
  // (mounted by `make dev` in its own root; never in a build)
  await page.addInitScript(() =>
    document.addEventListener('DOMContentLoaded', () => {
      const style = document.createElement('style')
      style.textContent = '#sentinel-font-lab { display: none !important; }'
      document.head.appendChild(style)
    }),
  )
  await page.addInitScript(
    ([pref]) => {
      localStorage.setItem('sentinel.theme', pref)
      localStorage.removeItem('sentinel.mock.state')
    },
    [JSON.stringify({ family, dark })],
  )
  await page.setViewportSize({ width: 1440, height: 1000 })
}
const settle = (page: Page) => page.waitForTimeout(900)

test('stone-light: every screen', async ({ page }) => {
  test.setTimeout(150_000)
  await prep(page, 'stone', false)
  await page.goto('/apps')
  await expect(page.getByRole('navigation', { name: 'Applications' })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/00-suite-landing.png` })

  await page.goto('/erm/runs/erm-run-2026-09-18-0912')
  await expect(page.getByRole('heading', { name: 'Portfolio monitor' })).toBeVisible()
  await page.getByRole('button', { name: /Population — why these borrowers/ }).click()
  await settle(page)
  await page.screenshot({ path: `${OUT}/18-erm-results.png` })

  await page.goto('/erm')
  await expect(page.getByRole('heading', { name: 'Start a portfolio analysis' })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/19-erm-start.png` })

  await page.goto('/erm/documents')
  await expect(page.getByText(/on system for this application/)).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/20-erm-documents.png` })

  await page.goto('/crr/policy')
  await page.getByLabel('Ask or search policies').fill('When must valuation inputs be re-verified?')
  await page.getByRole('button', { name: 'Ask' }).click()
  await expect(page.getByText('capability preview')).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/21-policy-search.png` })

  await page.goto('/erm')
  await page
    .getByRole('radiogroup', { name: 'Question mode' })
    .getByRole('radio', { name: 'Question set' })
    .click()
  await settle(page)
  await page.screenshot({ path: `${OUT}/22-cpea-question-sets.png` })

  await page.keyboard.press('ControlOrMeta+k')
  await expect(page.getByRole('dialog', { name: 'Search everything' })).toBeVisible()
  await page.waitForTimeout(400)
  await page.screenshot({ path: `${OUT}/23-command-palette.png` })
  await page.keyboard.press('Escape')

  await page.goto('/vantage/runs/vantage-run-2026-09-18-1432')
  await expect(page.getByText('Not in these documents')).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/24-vantage-answer.png`, fullPage: true })

  // ---- demo feedback round (v1.8) ----
  await page.goto('/inquiry')
  await page
    .getByRole('textbox', { name: 'Your question' })
    .fill('Which borrowers face refinancing risk in the next 12 months, and what drives it?')
  await page.getByRole('combobox', { name: 'Borrower search' }).fill('amber')
  await page.getByRole('option', { name: /Ambervale Foods Group/ }).click()
  await expect(page.getByTestId('borrower-chip')).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/25-inquiry-start-scoped.png`, fullPage: true })

  await page.goto('/inquiry/runs/inquiry-run-2026-09-24-0912')
  await expect(page.getByTestId('single-question-table')).toBeVisible()
  await page.locator('tr[data-rxm="RXM-6430"]').click()
  await settle(page)
  await page.screenshot({ path: `${OUT}/26-inquiry-results.png`, fullPage: true })

  await page.goto('/inquiry/runs')
  await expect(page.getByText('all stated')).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/27-inquiry-runs.png` })

  await page.goto('/erm')
  await page.getByRole('combobox', { name: 'Borrower search' }).fill('rxm-')
  await expect(page.getByRole('listbox', { name: 'Matching borrowers' })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/28-cpea-borrower-typeahead.png`, fullPage: true })
  await page.getByRole('option', { name: /Veyland US Holdco LLC/ }).click()
  await settle(page)
  await page.screenshot({ path: `${OUT}/29-cpea-borrower-scoped.png`, fullPage: true })

  await page.goto('/vantage')
  await page
    .getByLabel('Your question')
    .fill('Which exposures were above the single-name limit at year end?')
  await page
    .getByLabel('Add a file of questions')
    .last()
    .setInputFiles({
      name: 'Watchlist_Qs.xlsx',
      mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      buffer: Buffer.alloc(9_000, 1),
    })
  await expect(page.getByTestId('parsed-questions')).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/30-vantage-one-off-review.png`, fullPage: true })
  await page.getByRole('radio', { name: 'Question set' }).click()
  await settle(page)
  await page.screenshot({ path: `${OUT}/31-vantage-question-sets.png` })

  // the default set (Exposure limits sweep) fits the demo docset's answers
  await page
    .getByLabel('Upload documents')
    .last()
    .setInputFiles({
      name: 'Group_Lending_Policy_Extract.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(400_000, 1),
    })
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: '6 questions' })).toBeVisible({
    timeout: 15_000,
  })
  await settle(page)
  await page.screenshot({ path: `${OUT}/32-vantage-multi-answer.png`, fullPage: true })

  await page.goto('/crr')
  await expect(page.getByRole('link', { name: /Veyland US Holdco LLC/ })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/01-landing.png` })

  await page.getByLabel('Choose PDF files').setInputFiles([
    {
      name: 'Veyland_Holdco_Annual_Review_FY25.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(2_400_000, 1),
    },
    {
      name: 'Veyland_Holdco_Q3_Update.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(1_100_000, 1),
    },
  ])
  await page
    .getByLabel('Anything Sentinel should know?')
    .fill('What is revolver availability at close?')
  await settle(page)
  await page.screenshot({ path: `${OUT}/02-landing-with-files.png` })
  await page.getByRole('button', { name: /^Begin review/ }).click()
  await expect(page.getByRole('heading', { level: 2 })).toHaveText('Reading the documents')
  await settle(page)
  await page.screenshot({ path: `${OUT}/03-processing.png` })

  await page.goto(`${VEYLAND}#sec-2`)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veyland US Holdco LLC')
  await settle(page)
  await page.screenshot({ path: `${OUT}/04-review-top.png` })
  await page.evaluate(() => document.getElementById('canvas')!.scrollTo(0, 0))
  await settle(page)
  await page.screenshot({ path: `${OUT}/05-review-story-attention.png` })
  await page.goto(`${VEYLAND}#sec-2`)
  await settle(page)
  const rail = page.getByRole('complementary', { name: 'Context' })
  await expect(rail).toContainText('How this got here')
  await page.screenshot({ path: `${OUT}/06-review-workpaper-rail-why.png` })
  await rail.getByRole('tab', { name: 'Respond' }).click()
  await settle(page)
  await page.screenshot({
    path: `${OUT}/07-rail-respond.png`,
    clip: { x: 1128, y: 48, width: 312, height: 620 },
  })
  await rail.getByRole('tab', { name: /Debate/ }).click()
  await expect(rail).toContainText('Advocate')
  await settle(page)
  await page.screenshot({
    path: `${OUT}/08-rail-debate.png`,
    clip: { x: 1128, y: 48, width: 312, height: 620 },
  })
  await rail.getByRole('tab', { name: 'Prior' }).click()
  await expect(rail).toContainText('Since the')
  await settle(page)
  await page.screenshot({
    path: `${OUT}/09-rail-prior.png`,
    clip: { x: 1128, y: 48, width: 312, height: 620 },
  })
  await page.getByRole('button', { name: 'View source' }).last().click()
  await expect(page.getByRole('dialog')).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/10-source-modal.png` })
  await page.keyboard.press('Escape')

  await page.goto('/crr/reviews')
  await expect(page.getByRole('link', { name: /Veyland/ })).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/11-reviews-my.png` })
  await page.goto('/crr/reviews/all')
  await expect(page.getByText(/reviews · showing most recent/)).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/12-reviews-all.png` })
  await page.goto('/crr/documents?q=revolver+availability')
  await expect(page.getByText(/sorted by relevance/)).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/13-documents.png` })
  await page.goto('/crr/review/rev-seldwyn-2026-08')
  await page.getByRole('button', { name: 'Export Review' }).click()
  await expect(page.getByRole('alert').first()).toContainText('Export failed')
  await settle(page)
  await page.screenshot({ path: `${OUT}/14-export-error.png` })
  await page.goto('/crr/review/rev-farrowdale-2026-08')
  await expect(page.getByText(/Read-only/)).toBeVisible()
  await settle(page)
  await page.screenshot({ path: `${OUT}/15-read-only-review.png` })
})

for (const theme of THEMES.slice(1)) {
  test(`${theme.name}: review page + collapsed rail`, async ({ page }) => {
    await prep(page, theme.family, theme.dark)
    await page.goto(`${VEYLAND}#sec-2`)
    await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veyland US Holdco LLC')
    await settle(page)
    await page.screenshot({ path: `${OUT}/16-review-${theme.name}.png` })
  })
}
test('cobalt-light: collapsed rail', async ({ page }) => {
  await prep(page, 'cobalt', false)
  await page.addInitScript(() => localStorage.setItem('sentinel.rail.collapsed', 'true'))
  await page.goto(VEYLAND)
  await expect(page.getByRole('heading', { level: 1 })).toHaveText('Veyland US Holdco LLC')
  await settle(page)
  await page.screenshot({ path: `${OUT}/17-review-collapsed-rail-cobalt-light.png` })
})
