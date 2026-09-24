/**
 * Inquiry (demo feedback round, concept r1) — the fourth application:
 * CPEA's workflow with question sets switched off, mounted at /inquiry.
 * The full arc (type a question → processing at the run URL → the
 * single-question results), deep entry, NO question-set UI anywhere, Runs
 * kept (history + the cancelled run, honestly), its own run store, and
 * Documents with both viewers and the borrower shortcut.
 */
import { expect, test, type Page } from '@playwright/test'

const DEMO = '/inquiry/runs/inquiry-run-2026-09-24-0912'
const DEMO_Q = 'Which borrowers face refinancing risk in the next 12 months, and what drives it?'

async function fresh(page: Page, path = '/inquiry') {
  // clear once, then reload — an addInitScript would wipe runs on every navigation
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(path)
  await page.evaluate(() => localStorage.removeItem('sentinel.mock.state'))
  await page.reload()
}

/** Nothing of the question-set control may appear on any Inquiry screen. */
async function expectNoQuestionSetUi(page: Page) {
  await expect(page.getByRole('radiogroup', { name: 'Question mode' })).toHaveCount(0)
  await expect(page.getByRole('radio', { name: 'Question set' })).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Add new/ })).toHaveCount(0)
  await expect(page.getByText('Question set', { exact: false })).toHaveCount(0)
  await expect(page.getByText('upload a question set')).toHaveCount(0)
  await expect(page.getByRole('tab', { name: 'By question' })).toHaveCount(0)
}

test('full arc: one typed question → processing at the run URL → results; refresh stays on the run', async ({
  page,
}) => {
  await fresh(page)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask a question of the portfolio' }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { name: 'Your question' })).toBeVisible()
  await expect(page.getByText('type it and go — nothing here is saved for reuse')).toBeVisible()
  await page
    .getByRole('textbox', { name: 'Your question' })
    .fill('Which borrowers depend on a single customer contract?')
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page).toHaveURL(/\/inquiry\/runs\/inquiry-run-/)
  await expect(page.getByRole('heading', { name: 'Running the analysis' })).toBeVisible()
  await expect(
    page.getByText('One-off question · IB Lending — 6 borrowers, 11 documents.'),
  ).toBeVisible()
  await expect(page.getByText('Running the question across 11 documents')).toBeVisible()
  await page.reload()
  await expect(
    page
      .getByRole('heading', { name: 'Running the analysis' })
      .or(page.getByRole('heading', { level: 1, name: 'Results' })),
  ).toBeVisible()
  await expect(page.getByRole('heading', { level: 1, name: 'Results' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByTestId('single-question-table')).toBeVisible()
  await expect(
    page.getByText('"Which borrowers depend on a single customer contract?"'),
  ).toBeVisible()
  const runUrl = page.url()
  // kept in INQUIRY's Runs — and never in CPEA's
  await page
    .getByRole('navigation', { name: 'Inquiry navigation' })
    .getByRole('link', { name: 'Runs' })
    .click()
  await expect(
    page.getByText('"Which borrowers depend on a single customer contract?"'),
  ).toBeVisible()
  await expect(page.getByRole('link', { name: 'View results' })).toHaveCount(5)
  await page.goto('/erm/runs')
  await expect(page.getByRole('heading', { name: 'Runs', exact: true })).toBeVisible()
  await expect(page.getByText(/single customer contract/)).toHaveCount(0)
  await expect(page.getByRole('link', { name: 'View results' })).toHaveCount(3)
  // and CPEA's run URL space does not resolve Inquiry's run
  await page.goto(runUrl.replace('/inquiry/', '/erm/'))
  await expect(page.getByTestId('single-question-table')).toHaveCount(0)
})

test('deep entry: the demo run renders its frozen single-question results', async ({ page }) => {
  await fresh(page, DEMO)
  await expect(page.getByRole('heading', { level: 1, name: 'Results' })).toBeVisible()
  await expect(page.getByText(`"${DEMO_Q}"`)).toBeVisible()
  await expect(page.getByText('One-off question')).toBeVisible()
  await expect(
    page.getByText(/6 borrowers analyzed · 11 documents · 1 question · 6 answers/),
  ).toBeVisible()
  await expect(page.getByText('4 stated')).toBeVisible()
  await expect(page.getByText('1 derived')).toBeVisible()
  await expect(page.getByText('1 unsupported').first()).toBeVisible()
  await expect(page.getByText(/Most attention needed:/)).toContainText(
    'Redfenn Timber Holdings — answer could not be grounded',
  )
  // the same population accounting as CPEA's
  const disclosure = page.getByRole('button', { name: /Population — why these borrowers/ })
  await expect(disclosure).toContainText('6 included · 3 excluded · 1 indeterminate')
  await disclosure.click()
  await expect(page.getByText('excluded — no documents on system as of the run')).toBeVisible()
  // Borrower · RXM · Flags · Answer; Redfenn first (most flags), amber em-dash
  const rows = page.locator('tr[data-rxm]')
  await expect(rows).toHaveCount(6)
  await expect(rows.first()).toHaveAttribute('data-rxm', 'RXM-6292')
  await rows.first().click()
  const x = page.locator('tr[data-expansion="RXM-6292"]')
  await expect(x).toContainText(
    'Answer could not be grounded — documents on system predate Amendment No. 1.',
  )
  await expect(x.getByText('unsupported', { exact: true })).toBeVisible()
  await expect(x.getByText(/^conf /)).toHaveCount(0)
  // the derived answer: Veyland, dotted underline + derivation title
  await expect(
    page.locator(
      'tr[data-rxm="RXM-6430"] [title="Derived from stated inputs — expand for the derivation"]',
    ),
  ).toContainText('Not near-term — the Q3 update states no near-term maturities')
  await expectNoQuestionSetUi(page)
})

test('no question-set UI anywhere in Inquiry', async ({ page }) => {
  await fresh(page)
  for (const path of ['/inquiry', '/inquiry/runs', DEMO, '/inquiry/documents']) {
    await page.goto(path)
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
    await expectNoQuestionSetUi(page)
  }
  // start is prompt-only — the textbox sits right under "Your question"
  await page.goto('/inquiry')
  await expect(page.getByRole('textbox', { name: 'Your question' })).toHaveAttribute(
    'placeholder',
    `What do you want to know? e.g. ${DEMO_Q}`,
  )
})

test('Runs: the history kept, a frozen revisit, the cancelled run honestly labeled', async ({
  page,
}) => {
  await fresh(page, '/inquiry/runs')
  await expect(page.getByRole('heading', { name: 'Runs', exact: true })).toBeVisible()
  await expect(
    page.getByText('Every question asked, kept — open any prior answer exactly as it stood.'),
  ).toBeVisible()
  const views = page.getByRole('link', { name: 'View results' })
  await expect(views).toHaveCount(4)
  await expect(page.getByText(`"${DEMO_Q}"`)).toBeVisible()
  await expect(page.getByText('all stated')).toBeVisible()
  const cancelledRow = page.locator('[data-run="inquiry-run-2026-09-12-0840"]')
  await expect(cancelledRow).toContainText(
    '"Summarize covenant pressure across the leveraged book."',
  )
  await expect(cancelledRow).toContainText('cancelled')
  await expect(cancelledRow).toContainText(
    'IB Lending · leveraged lending · all regions — 4 borrowers · 7 documents',
  )
  await cancelledRow.getByRole('link', { name: 'View results' }).click()
  await expect(
    page.getByText(/cancelled before completion — no answers were recorded/),
  ).toBeVisible()
  await expect(page.getByTestId('single-question-table')).toHaveCount(0)
  // a completed history run revisits frozen
  await page.goBack()
  await page
    .locator('[data-run="inquiry-run-2026-09-19-1604"]')
    .getByRole('link', { name: 'View results' })
    .click()
  await expect(
    page.getByText('"Where is our largest single-name exposure, and has it grown this year?"'),
  ).toBeVisible()
  await expect(page.locator('tr[data-rxm="RXM-6430"]')).toContainText('$1,390mm committed')
})

test('cancel mid-run: the run lands in Inquiry’s Runs as cancelled', async ({ page }) => {
  await fresh(page)
  await page.getByRole('textbox', { name: 'Your question' }).fill('Summarize covenant pressure.')
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page.getByRole('heading', { name: 'Running the analysis' })).toBeVisible()
  await page.getByRole('button', { name: 'Cancel run' }).click()
  await expect(page).toHaveURL(/\/inquiry\/runs$/)
  const row = page.locator('[data-run^="inquiry-run-"]').first()
  await expect(row).toContainText('"Summarize covenant pressure."')
  await expect(row).toContainText('cancelled')
})

test('Documents: the lens, both viewers, and the borrower shortcut pre-scopes Inquiry’s start', async ({
  page,
}) => {
  await fresh(page, '/inquiry/documents')
  await expect(
    page.getByText(
      'Everything on system this application can see — search it, and view any document’s extraction or raw pages.',
    ),
  ).toBeVisible()
  await expect(
    page.getByText('17 documents · 7 borrowers on system for this application', { exact: false }),
  ).toBeVisible()
  const row = page.locator('div', { hasText: 'Ambervale_Foods_Q2_Performance_Update.pdf' }).last()
  await row.getByRole('button', { name: 'View extraction' }).click()
  await expect(
    page.getByRole('dialog', { name: /Ambervale_Foods_Q2_Performance_Update\.pdf/ }),
  ).toBeVisible()
  await page.keyboard.press('Escape')
  await row.getByRole('button', { name: 'Raw document' }).click()
  const raw = page.getByRole('dialog', { name: /raw document/ })
  await expect(raw).toBeVisible()
  await expect(raw.getByText('page image')).toBeVisible()
  await page.keyboard.press('Escape')
  // the shortcut: Start, pre-scoped — Inquiry's own start, not CPEA's
  await page.getByRole('button', { name: 'Ask about this borrower →' }).first().click()
  await expect(page).toHaveURL(/\/inquiry$/)
  await expect(
    page.getByRole('heading', { level: 1, name: 'Ask a question of the portfolio' }),
  ).toBeVisible()
  await expect(page.getByTestId('borrower-chip')).toContainText('Ambervale Foods Group')
  await expect(page.getByTestId('scope-line')).toHaveText(
    'Will run against: Ambervale Foods Group (RXM-5120) — resolves to 1 borrower · 5 documents',
  )
})

// ---- review regressions (v1.8) ----

test('nothing typed: Inquiry asks in its own words — never offers a question set', async ({
  page,
}) => {
  await fresh(page)
  await page.getByRole('button', { name: 'Run analysis' }).click()
  await expect(page.getByRole('alert')).toHaveText('Type a question first.')
  await expect(page.getByText(/question set/i)).toHaveCount(0)
})

test('the evidence is reachable from the keyboard: row toggle → Detail & evidence', async ({
  page,
}) => {
  await fresh(page, DEMO)
  const toggle = page.getByRole('button', { name: 'Veyland US Holdco LLC', exact: true })
  await expect(toggle).toHaveAttribute('aria-expanded', 'false')
  await toggle.focus()
  await page.keyboard.press('Enter')
  await expect(toggle).toHaveAttribute('aria-expanded', 'true')
  await page.keyboard.press('Tab')
  await expect(page.getByRole('button', { name: 'Detail & evidence →' })).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(page.getByRole('dialog', { name: 'Veyland US Holdco LLC — answer' })).toBeVisible()
  // sort headers are buttons too
  await page
    .getByRole('columnheader', { name: /Borrower/ })
    .getByRole('button')
    .focus()
  await page.keyboard.press('Enter')
  await page.keyboard.press('Escape')
})
