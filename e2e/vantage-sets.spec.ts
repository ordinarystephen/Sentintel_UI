/**
 * Vantage's two ask modes (demo feedback round, concept r3 pins V12/V13):
 * [One-off questions | Question set] over Vantage's OWN shelf; the .xlsx
 * one-off intake through the shared upload states → the parse-and-review
 * card (remove rows, remove the file, review all); "Save as a question
 * set" → the shared modal, prefilled → Vantage's shelf only; a run
 * carries one or many questions and the answer repeats its anatomy per
 * question; a single-question run renders exactly as v1.7 did.
 */
import fs from 'node:fs/promises'
import { expect, test, type Page } from '@playwright/test'

const DEMO = '/vantage/runs/vantage-run-2026-09-18-1432'
const XLSX = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
const WATCHLIST = { name: 'Watchlist_Qs.xlsx', mimeType: XLSX, buffer: Buffer.alloc(9_000, 1) }
const FIRST_THREE = [
  'Has covenant headroom been recomputed at the revised EBITDA?',
  'Is there a springing condition on the revolver, and has it been triggered?',
  'Does the file reflect the most recent amendment?',
]

async function fresh(page: Page, path = '/vantage') {
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(path)
  await page.evaluate(() => localStorage.removeItem('sentinel.mock.state'))
  await page.reload()
}

const count = (page: Page) => page.getByTestId('ask-count')
const dropQuestionFile = (page: Page, file = WATCHLIST) =>
  page.getByLabel('Add a file of questions').last().setInputFiles(file)
const attachDoc = (page: Page) =>
  page
    .getByLabel('Upload documents')
    .last()
    .setInputFiles({
      name: 'Register.csv',
      mimeType: 'text/csv',
      buffer: Buffer.from('a,b\n1,2\n'),
    })

test('mode toggle: One-off questions | Question set — Vantage’s own shelf, never CPEA’s', async ({
  page,
}) => {
  await fresh(page)
  await expect(page.getByRole('heading', { name: 'What to ask' })).toBeVisible()
  await expect(
    page.getByText('one-off questions, or a saved question set — every ask is a run, not a chat'),
  ).toBeVisible()
  const modes = page.getByRole('radiogroup', { name: 'Question mode' })
  await expect(modes.getByRole('radio', { name: 'One-off questions' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await page.getByLabel('Your question').fill('Kept across the toggle?')
  await expect(page.getByRole('button', { name: 'Add a file of questions' })).toContainText(
    'Or add a file of questions — drop an .xlsx here, one question per row. Runs once; nothing is saved.',
  )

  await modes.getByRole('radio', { name: 'Question set' }).click()
  await expect(page.getByLabel('Your question')).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Add new/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Exposure limits sweep/ })).toHaveAttribute(
    'aria-pressed',
    'true',
  )
  await expect(page.getByRole('button', { name: /Key-customer scan/ })).toBeVisible()
  // CPEA's shelf is not Vantage's
  await expect(page.getByRole('button', { name: /Quarterly credit pulse/ })).toHaveCount(0)
  await expect(count(page)).toHaveText('Exposure limits sweep · 6 questions · 0 documents attached')
  await page.getByRole('button', { name: /Key-customer scan/ }).click()
  await expect(count(page)).toHaveText('Key-customer scan · 4 questions · 0 documents attached')

  await modes.getByRole('radio', { name: 'One-off questions' }).click()
  await expect(page.getByLabel('Your question')).toHaveValue('Kept across the toggle?')
  await expect(count(page)).toHaveText('1 question · 0 documents attached')
})

test('xlsx drop → progress → the review card; remove rows, review all, remove the file', async ({
  page,
}) => {
  await fresh(page)
  await dropQuestionFile(page)
  const card = page.getByTestId('parsed-questions')
  await expect(card).toBeVisible()
  await expect(card).toContainText('Watchlist_Qs.xlsx')
  await expect(card.getByText('14 questions read')).toBeVisible()
  const rows = card.getByRole('listitem')
  await expect(rows).toHaveCount(3)
  for (const [i, q] of FIRST_THREE.entries()) await expect(rows.nth(i)).toContainText(`"${q}"`)
  await expect(count(page)).toHaveText('14 questions · 0 documents attached')
  // typed + file questions combine into ONE run
  await page.getByLabel('Your question').fill('Which exposures were above the limit?')
  await expect(count(page)).toHaveText('15 questions · 0 documents attached')

  // remove the second question: it is gone from the card and from the run
  await card.getByRole('button', { name: 'Remove question 2' }).click()
  await expect(rows.nth(1)).toContainText(`"${FIRST_THREE[2]}"`)
  await expect(count(page)).toHaveText('14 questions · 0 documents attached')
  // "review all before running": the rest open on request
  await card.getByRole('button', { name: '+ 10 more — review all before running' }).click()
  await expect(rows).toHaveCount(13)
  // the badge stays a fact about the file
  await expect(card.getByText('14 questions read')).toBeVisible()

  await card.getByRole('button', { name: 'Remove Watchlist_Qs.xlsx' }).click()
  await expect(card).toHaveCount(0)
  await expect(count(page)).toHaveText('1 question · 0 documents attached')
})

test('question-file intake uses the shared upload states: wrong type and over-limit named, amber', async ({
  page,
}, testInfo) => {
  await fresh(page)
  await dropQuestionFile(page, {
    name: 'notes.pdf',
    mimeType: 'application/pdf',
    buffer: Buffer.alloc(900, 1),
  })
  await expect(page.getByRole('alert')).toContainText('not a supported file type here')
  const big = testInfo.outputPath('Huge_Qs.xlsx')
  await fs.writeFile(big, Buffer.alloc(61 * 1024 * 1024, 1))
  await page.getByLabel('Add a file of questions').last().setInputFiles(big)
  await expect(page.getByRole('alert').filter({ hasText: 'Huge_Qs.xlsx' })).toContainText(
    '61 MB — over the 50 MB limit',
  )
  await expect(page.getByTestId('parsed-questions')).toHaveCount(0)
})

test('Save as a question set: the shared modal, prefilled → Vantage’s shelf only, persisted', async ({
  page,
}) => {
  await fresh(page)
  await dropQuestionFile(page)
  const card = page.getByTestId('parsed-questions')
  await card.getByRole('button', { name: 'Remove question 1' }).click()
  await card.getByRole('button', { name: 'Save as a question set' }).click()
  const modal = page.getByRole('dialog', { name: 'Add a question set' })
  await expect(modal).toContainText('Watchlist_Qs.xlsx')
  await expect(modal.getByText('13 of the 14 questions read from Watchlist_Qs.xlsx')).toBeVisible()
  await expect(modal.getByLabel('Title')).toHaveValue('Watchlist Qs')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toHaveCount(0)
  await expect(
    page.getByText('Saved “Watchlist Qs” to this application’s question sets.'),
  ).toBeVisible()
  await expect(card.getByText('Saved as a question set')).toBeVisible()
  await expect(card.getByRole('button', { name: 'Save as a question set' })).toHaveCount(0)

  // it lands on Vantage's shelf, carrying the 13 kept questions
  await page
    .getByRole('radiogroup', { name: 'Question mode' })
    .getByRole('radio', { name: 'Question set' })
    .click()
  const saved = page.getByRole('button', { name: /Watchlist Qs/ })
  await expect(saved).toContainText('13 questions from Watchlist_Qs.xlsx.')
  await saved.click()
  await expect(count(page)).toHaveText('Watchlist Qs · 13 questions · 0 documents attached')
  // …and survives a reload
  await page.reload()
  await page.getByRole('radio', { name: 'Question set' }).click()
  await expect(page.getByRole('button', { name: /Watchlist Qs/ })).toBeVisible()

  // it NEVER appears on CPEA's shelf
  await page.goto('/erm')
  await page
    .getByRole('radiogroup', { name: 'Question mode' })
    .getByRole('radio', { name: 'Question set' })
    .click()
  await expect(page.getByRole('button', { name: /Quarterly credit pulse/ })).toBeVisible()
  await expect(page.getByRole('button', { name: /Watchlist Qs/ })).toHaveCount(0)
})

test('a many-question run: one serif question heading per section, in order; follow-up is a new single-question run', async ({
  page,
}) => {
  await fresh(page)
  await attachDoc(page)
  await page.getByLabel('Your question').fill('Which exposures were above the limit?')
  await dropQuestionFile(page)
  await expect(count(page)).toHaveText('15 questions · 1 document attached')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page).toHaveURL(/\/vantage\/runs\/vantage-run-/)
  await expect(page.getByRole('heading', { name: 'Reading the documents' })).toBeVisible()
  await expect(page.getByText('Answering 15 questions…')).toBeVisible({ timeout: 10_000 })
  await expect(page.getByRole('heading', { level: 1, name: '15 questions' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByText('Answers', { exact: true })).toBeVisible()
  const headings = page.getByRole('heading', { level: 2 })
  await expect(headings).toHaveCount(15)
  await expect(headings.nth(0)).toHaveText('Which exposures were above the limit?')
  for (const [i, q] of FIRST_THREE.entries()) await expect(headings.nth(i + 1)).toHaveText(q)
  await expect(page.getByText('Q1 of 15')).toBeVisible()
  await expect(page.getByText('Q15 of 15')).toBeVisible()
  // the block contract, applied per section: the first carries the demo figures…
  const first = page.getByRole('region', { name: 'Which exposures were above the limit?' })
  await expect(first.getByText('3 of 42')).toBeVisible()
  // …and a later one its own absence block
  // (sections rotate prose → figures → absence after the first)
  const fourth = page.getByRole('region', { name: FIRST_THREE[2] })
  await expect(fourth.getByText('Not in these documents')).toBeVisible()

  // Runs rows show the question count
  await page.getByRole('link', { name: 'view in Runs' }).click()
  await expect(
    page.getByRole('button', { name: /Which exposures were above the limit\?.*15 questions/ }),
  ).toBeVisible()
  await page.getByRole('button', { name: /15 questions/ }).click()

  // the follow-up bar is unchanged: a NEW single-question run on the same docset
  await page.getByLabel('Ask another question').fill('And which of them are within 10%?')
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByRole('heading', { name: 'Reading the documents' })).toBeVisible()
  await expect(
    page.getByRole('heading', { level: 1, name: 'And which of them are within 10%?' }),
  ).toBeVisible({ timeout: 15_000 })
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
  await expect(page.getByText('Register.csv').first()).toBeVisible()
})

test('Question set mode runs the chosen set’s questions', async ({ page }) => {
  await fresh(page)
  await attachDoc(page)
  await page.getByRole('radio', { name: 'Question set' }).click()
  await page.getByRole('button', { name: /Key-customer scan/ }).click()
  await page.getByRole('button', { name: 'Ask', exact: true }).click()
  await expect(page.getByRole('heading', { level: 1, name: '4 questions' })).toBeVisible({
    timeout: 15_000,
  })
  await expect(page.getByRole('heading', { level: 2 }).first()).toHaveText(
    'Which customers are named as key or material customers?',
  )
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(4)
})

test('regression: the v1.7 single-question run renders exactly as before', async ({ page }) => {
  await fresh(page, DEMO)
  // eyebrow "Answer", the question IS the page heading, blocks directly beneath
  await expect(page.getByText('Answer', { exact: true })).toBeVisible()
  await expect(
    page.getByRole('heading', {
      level: 1,
      name: 'Which exposures were above the single-name limit at year end, and does the policy allow exceptions?',
    }),
  ).toBeVisible()
  await expect(page.getByRole('heading', { level: 2 })).toHaveCount(0)
  await expect(page.getByText(/Q1 of/)).toHaveCount(0)
  await expect(page.getByText('3 of 42')).toBeVisible()
  await expect(page.getByText('Not in these documents')).toBeVisible()
  await expect(page.getByText(/Runs as a new question against the same 3 documents/)).toBeVisible()
  // its Runs row now carries the question count
  await page.goto('/vantage/runs')
  await expect(
    page.getByRole('button', { name: /single-name limit at year end.*1 question.*3 documents/ }),
  ).toBeVisible()
})

// ---- review regressions (v1.8) ----

test('Add new on Vantage’s shelf: the dialog covers the viewport and Save works', async ({
  page,
}) => {
  await fresh(page)
  await page.getByRole('radio', { name: 'Question set' }).click()
  await page.getByRole('button', { name: /Add new/ }).click()
  const modal = page.getByRole('dialog', { name: 'Add a question set' })
  await expect(modal).toBeVisible()
  // the overlay is the viewport, not the question zone it was opened from
  const overlay = await modal.evaluate((el) => {
    const r = el.parentElement!.getBoundingClientRect()
    return { w: Math.round(r.width), h: Math.round(r.height), x: r.x, y: r.y }
  })
  expect(overlay).toEqual({ w: 1440, h: 1000, x: 0, y: 0 })
  await modal.getByLabel('Title').fill('Limit exceptions follow-up')
  await modal.getByRole('button', { name: 'Save' }).click()
  await expect(modal).toHaveCount(0)
  await expect(page.getByRole('button', { name: /Limit exceptions follow-up/ })).toBeVisible()
})

test('Ask waits while a question file is still being read — its questions are never dropped', async ({
  page,
}) => {
  await fresh(page)
  await attachDoc(page)
  await page.getByLabel('Your question').fill('Typed question?')
  await dropQuestionFile(page)
  await expect(count(page)).toHaveText('Reading Watchlist_Qs.xlsx…')
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeDisabled()
  await expect(page.getByTestId('parsed-questions')).toBeVisible()
  await expect(page.getByRole('button', { name: 'Ask', exact: true })).toBeEnabled()
  await expect(count(page)).toHaveText('15 questions · 1 document attached')
})

test('one question file at a time: a two-file drop reads the last, leaves no stray row', async ({
  page,
}) => {
  await fresh(page)
  const dt = await page.evaluateHandle(() => {
    const t = new DataTransfer()
    t.items.add(new File([new Uint8Array(900)], 'Watchlist_Qs.xlsx'))
    t.items.add(new File([new Uint8Array(900)], 'Other_Qs.xlsx'))
    return t
  })
  await page.getByRole('button', { name: 'Add a file of questions' }).dispatchEvent('drop', {
    dataTransfer: dt,
  })
  const card = page.getByTestId('parsed-questions')
  await expect(card).toContainText('Other_Qs.xlsx')
  // not the demo file: its placeholder list is labeled as such, never "read"
  await expect(card.getByText('3 placeholder questions')).toBeVisible()
  await expect(page.getByRole('list', { name: 'Question file' })).toHaveCount(0)
  // …and the save link is not offered once every row is removed
  for (let i = 0; i < 3; i++) await card.getByRole('button', { name: 'Remove question 1' }).click()
  await expect(card.getByRole('button', { name: 'Save as a question set' })).toHaveCount(0)
})

test('the mode radiogroup is keyboard-operable: one Tab stop, arrows switch', async ({ page }) => {
  await fresh(page)
  const oneOff = page.getByRole('radio', { name: 'One-off questions' })
  await expect(oneOff).toHaveAttribute('tabindex', '0')
  await expect(page.getByRole('radio', { name: 'Question set' })).toHaveAttribute('tabindex', '-1')
  await oneOff.focus()
  await page.keyboard.press('ArrowRight')
  await expect(page.getByRole('radio', { name: 'Question set' })).toBeFocused()
  await expect(page.getByRole('radio', { name: 'Question set' })).toHaveAttribute(
    'aria-checked',
    'true',
  )
  await expect(page.getByRole('button', { name: /Exposure limits sweep/ })).toBeVisible()
})
