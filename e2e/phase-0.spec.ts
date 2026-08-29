/**
 * Phase 0 verification (build-spec §10): every theme at 1440px and one narrow
 * width, reduced-motion honored, theme controls keyboard-reachable + persisted.
 */
import { expect, test } from '@playwright/test'

const STORAGE_KEY = 'sentinel.theme'
const THEMES = [
  { name: 'stone-light', family: 'stone', dark: false, classes: [] as string[] },
  { name: 'stone-dark', family: 'stone', dark: true, classes: ['dark'] },
  { name: 'cobalt-light', family: 'cobalt', dark: false, classes: ['theme-cobalt'] },
  { name: 'cobalt-dark', family: 'cobalt', dark: true, classes: ['theme-cobalt', 'dark'] },
]
const WIDTHS = [1440, 900]

for (const theme of THEMES) {
  for (const width of WIDTHS) {
    test(`renders ${theme.name} at ${width}px`, async ({ page }) => {
      await page.addInitScript(([key, pref]) => localStorage.setItem(key, pref), [
        STORAGE_KEY,
        JSON.stringify({ family: theme.family, dark: theme.dark }),
      ] as const)
      await page.setViewportSize({ width, height: 1400 })
      await page.goto('/')
      await expect(page.getByRole('heading', { level: 1 })).toHaveText('Start a review')

      const bodyClasses = await page.evaluate(() => Array.from(document.body.classList).sort())
      expect(bodyClasses).toEqual([...theme.classes].sort())

      // Tokens actually reached the paint: the canvas background is the theme's --bg.
      // Polled, because body has a 200ms background transition (§3.3).
      const tokenBg = await page.evaluate(() => {
        const probe = document.createElement('div')
        probe.style.background = 'var(--bg)'
        document.body.appendChild(probe)
        const resolved = getComputedStyle(probe).backgroundColor
        probe.remove()
        return resolved
      })
      await expect
        .poll(() => page.evaluate(() => getComputedStyle(document.body).backgroundColor))
        .toBe(tokenBg)

      await page.screenshot({
        path: `e2e/screenshots/phase-0/${theme.name}-${width}.png`,
        fullPage: true,
      })
    })
  }
}

test('theme controls are keyboard-reachable and the choice survives reload', async ({ page }) => {
  await page.goto('/')
  const select = page.getByRole('combobox', { name: 'Theme' })
  const moon = page.getByRole('button', { name: 'Toggle dark mode' })

  await select.focus()
  await select.selectOption('cobalt')
  await page.keyboard.press('Tab')
  await expect(moon).toBeFocused()
  await page.keyboard.press('Enter')
  await expect(moon).toHaveAttribute('aria-pressed', 'true')
  const classesOf = () => page.evaluate(() => Array.from(document.body.classList).sort())
  expect(await classesOf()).toEqual(['dark', 'theme-cobalt'])

  await page.reload()
  await expect(moon).toHaveAttribute('aria-pressed', 'true')
  await expect(select).toHaveValue('cobalt')
  expect(await classesOf()).toEqual(['dark', 'theme-cobalt'])
})

test('reduced motion removes the theme transition', async ({ page }) => {
  await page.emulateMedia({ reducedMotion: 'reduce' })
  await page.goto('/')
  const duration = await page.evaluate(() => getComputedStyle(document.body).transitionDuration)
  expect(duration.split(',').every((d) => d.trim() === '0s')).toBe(true)

  await page.emulateMedia({ reducedMotion: 'no-preference' })
  await page.goto('/')
  const active = await page.evaluate(() => getComputedStyle(document.body).transitionDuration)
  expect(active).toContain('0.2s')
})
