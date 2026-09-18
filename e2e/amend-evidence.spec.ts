/**
 * Amend evidence + evidence manifest + RXM search keys (v1.4 round):
 * the add-document modal (both paths, required-rationale gating), the
 * manifest disclosure (origin chips, recorded why, Preview, structural on
 * every review), the amended state surviving reload (exercises the
 * STATE_VERSION 6 migration path), and RXM search in all three areas.
 */
import { expect, test, type Page } from '@playwright/test'

const VEYLAND = '/crr/review/rev-veyland-2026-08'
const manifest = (page: Page) => page.getByRole('button', { name: /Documents in this review/ })

async function fresh(page: Page) {
  // NOTE: no addInitScript for mock.state — it would re-clear on the
  // reload and defeat the persistence assertions. Clear once, then mount.
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto(VEYLAND)
  await page.evaluate(() => localStorage.removeItem('sentinel.mock.state'))
  await page.reload()
  await page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' }).waitFor()
}

test('repository path: search keys, rationale gating, manifest row with why; persists across reload', async ({
  page,
}) => {
  await fresh(page)
  await expect(manifest(page)).toContainText(/2 · run completed \d\d:\d\d/)

  await page.getByRole('button', { name: 'Add document' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a document to this review' })
  await expect(dialog).toBeVisible()
  await dialog.getByRole('tab', { name: 'From the repository' }).click()
  await expect(
    dialog.getByText('2 documents on system for RXM-6430 not yet in this review'),
  ).toBeVisible()

  // prefix-less RXM works here too; a non-matching key empties the list
  const search = dialog.getByLabel('Search the repository')
  await search.fill('6430')
  await expect(dialog.getByText(/2 documents on system/)).toBeVisible()
  await search.fill('northgale')
  await expect(dialog.getByText(/0 documents on system/)).toBeVisible()
  await search.fill('')

  const confirm = dialog.getByRole('button', { name: 'Add to review' })
  await expect(confirm).toBeDisabled()
  await dialog
    .locator('div', { hasText: 'Veyland_Holdco_Covenant_Cert_2026-06.pdf' })
    .getByRole('button', { name: 'Select', exact: true })
    .first()
    .click()
  await expect(confirm).toBeDisabled() // selection alone is not enough
  await dialog
    .getByLabel(/Why is this document being added/)
    .fill('Credit officer provided the June compliance certificate after the review opened')
  await expect(confirm).toBeEnabled()
  await confirm.click()

  // stays on the review; manifest shows amended state, then settles
  await expect(page.getByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' })).toBeVisible()
  await expect(manifest(page)).toContainText(
    /3 · evidence amended \d\d:\d\d · impacted checks re-running/,
  )
  await manifest(page).click()
  const rows = page.locator('#manifest-body')
  await expect(rows.getByText('Veyland_Holdco_Covenant_Cert_2026-06.pdf')).toBeVisible()
  await expect(rows.getByText(/added mid-review · \d\d:\d\d/)).toBeVisible()
  await expect(rows.getByText(/opening set/).first()).toBeVisible()
  await expect(
    rows.getByText(
      '“Credit officer provided the June compliance certificate after the review opened”',
    ),
  ).toBeVisible()
  // the settle window elapses (mock: 6s)
  await expect(manifest(page)).toContainText(/3 · evidence amended \d\d:\d\d$/, { timeout: 10_000 })

  // persists across reload — the amended shape survives under STATE_VERSION 6
  await page.reload()
  await page.getByRole('heading', { level: 1 }).waitFor()
  await expect(manifest(page)).toContainText(/3 · evidence amended/)
  await manifest(page).click()
  await expect(rows.getByText(/added mid-review/)).toBeVisible()

  // Preview from the manifest opens the extracted-text modal
  await rows.getByRole('button', { name: 'Preview' }).nth(2).click()
  await expect(
    page.getByRole('dialog', { name: /Veyland_Holdco_Covenant_Cert_2026-06\.pdf/ }),
  ).toBeVisible()
})

test('upload path: a dropped file gates the same way and lands as an amended row', async ({
  page,
}) => {
  await fresh(page)
  await page.getByRole('button', { name: 'Add document' }).click()
  const dialog = page.getByRole('dialog', { name: 'Add a document to this review' })
  const confirm = dialog.getByRole('button', { name: 'Add to review' })
  await expect(confirm).toBeDisabled()
  await dialog
    .getByLabel('Upload a document')
    .locator('input[type="file"]')
    .setInputFiles({
      name: 'Veyland_Site_Visit_Notes.pdf',
      mimeType: 'application/pdf',
      buffer: Buffer.alloc(400_000, 1),
    })
  await expect(dialog.getByText('Veyland_Site_Visit_Notes.pdf')).toBeVisible()
  await expect(confirm).toBeDisabled()
  await dialog
    .getByLabel(/Why is this document being added/)
    .fill('Site visit notes from the September meeting')
  await confirm.click()
  await expect(manifest(page)).toContainText(/3 · evidence amended/)
  await manifest(page).click()
  const rows = page.locator('#manifest-body')
  await expect(rows.getByText('Veyland_Site_Visit_Notes.pdf')).toBeVisible()
  await expect(rows.getByText('“Site visit notes from the September meeting”')).toBeVisible()
  // an uploaded (not yet parsed) document has no Preview: only the two
  // opening-set documents (whose text is on system) offer one
  await expect(rows.getByRole('button', { name: 'Preview' })).toHaveCount(2)
})

test('manifest is structural: present and collapsed on a read-only review', async ({ page }) => {
  await page.addInitScript(() => localStorage.removeItem('sentinel.mock.state'))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/crr/review/rev-farrowdale-2026-08')
  await page.getByRole('heading', { level: 1, name: 'Farrowdale Logistics' }).waitFor()
  await expect(manifest(page)).toContainText(/1 · run completed \d\d:\d\d/)
  await expect(page.getByRole('button', { name: 'Add document' })).toHaveCount(0) // read-only
})

test('RXM search keys: reviews list and documents screen, prefix-less included', async ({
  page,
}) => {
  await page.addInitScript(() => localStorage.removeItem('sentinel.mock.state'))
  await page.setViewportSize({ width: 1440, height: 1000 })
  await page.goto('/crr/reviews/all')
  const search = page.getByLabel('Search reviews')
  await expect(search).toHaveAttribute(
    'placeholder',
    'Search by borrower / counterparty name or RXM',
  )
  await search.fill('6430')
  await expect(page.getByText('2 reviews · showing most recent')).toBeVisible()
  await search.fill('rxm-8093')
  // one borrower, one RXM: BOTH Farrowdale reviews (current + prior) match
  await expect(page.getByRole('link', { name: /Farrowdale Logistics/ })).toHaveCount(2)

  await page.goto('/crr/documents')
  const dsearch = page.getByLabel('Search documents')
  await expect(dsearch).toHaveAttribute(
    'placeholder',
    'Search by borrower / counterparty name or RXM — or any keyword',
  )
  await dsearch.fill('6430')
  await expect(page.getByText(/passages? in/).first()).toBeVisible()
  // hits are Veyland passages (first match in a select option is hidden — assert a hit filename)
  await expect(page.getByText('Veyland_Holdco_Q3_Update.pdf').first()).toBeVisible()
})
