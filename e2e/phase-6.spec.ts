/**
 * Phase 6 verification: motion pass (settle stagger, dead under reduced
 * motion), keyboard/focus audit (skip link, modal focus trap), empty states.
 */
import { expect, test } from '@playwright/test'

const MERIDIAN = '/review/rev-meridian-2026-08'

test('screen content settles in with a stagger; reduced motion removes it', async ({ page }) => {
  await page.goto('/')
  await expect(page.getByRole('heading', { level: 1 })).toBeVisible()
  const anim = await page.evaluate(() => {
    const root = document.querySelector('.settle')!
    const kids = Array.from(root.children) as HTMLElement[]
    return kids.map((k) => [getComputedStyle(k).animationName, getComputedStyle(k).animationDelay])
  })
  expect(anim[0][0]).toBe('settle')
  expect(anim[0][1]).toBe('0s')
  expect(anim[1][1]).toBe('0.08s')

  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const reduced = await page.evaluate(
    () => getComputedStyle(document.querySelector('.settle > *')!).animationName,
  )
  expect(reduced).toBe('none')
})

test('skip link is the first Tab stop and moves focus to the canvas', async ({ page }) => {
  await page.goto('/reviews')
  await page.keyboard.press('Tab')
  const skip = page.getByRole('link', { name: 'Skip to content' })
  await expect(skip).toBeFocused()
  await expect(skip).toBeVisible()
  await page.keyboard.press('Enter')
  await expect(page).toHaveURL(/#canvas$/)
  expect(await page.evaluate(() => document.activeElement?.id)).toBe('canvas')
})

test('source modal traps focus and returns it on close', async ({ page }) => {
  await page.goto(MERIDIAN)
  const opener = page.getByRole('button', { name: 'View source' }).last()
  await opener.click()
  const close = page.getByRole('button', { name: 'Close' })
  await expect(close).toBeFocused()
  await page.keyboard.press('Tab')
  await expect(close).toBeFocused() // only focusable element: Tab wraps to itself
  await page.keyboard.press('Shift+Tab')
  await expect(close).toBeFocused()
  await page.keyboard.press('Escape')
  await expect(page.getByRole('dialog')).toHaveCount(0)
  await expect(opener).toBeFocused()
})

test('empty states are hand-written', async ({ page }) => {
  await page.goto('/review/rev-atlas-2026-08')
  await expect(
    page.getByText(
      'Nothing needs your attention. Every value was read above the confidence floor and no flags were raised.',
    ),
  ).toBeVisible()
  await page.goto('/reviews/all?q=zebra')
  await expect(
    page.getByText('No reviews match. Try a borrower name, a CL number, or a sector.'),
  ).toBeVisible()
  await page.goto('/documents?q=zebra')
  await expect(
    page.getByText('No passages match. Loosen a filter, or try different words.'),
  ).toBeVisible()
})
