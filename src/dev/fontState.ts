/**
 * Font Lab state — the testable half, deliberately free of React.
 *
 * Every typographic surface in the app resolves through three custom
 * properties (src/styles/tokens.css), so trying a typeface is an override of
 * those three on <html> and nothing else needs to know.
 *
 * Dev-only instrument. Shipping a typeface is a separate, small change:
 * install it as a real dependency and edit tokens.css.
 */

export type FontRole = 'body' | 'display' | 'mono'

/** The custom property each role drives. */
export const ROLE_VARS: Record<FontRole, string> = {
  body: '--font-body',
  display: '--font-display',
  mono: '--font-mono',
}

/**
 * `default` leaves rendering to the OS. On a non-retina display that means
 * ClearType/subpixel rendering, which is *sturdier* than `antialiased` —
 * the latter is a retina-era habit that thins stems and is a common reason
 * type looks weak on a 1x monitor. Exposed so it can be judged, not assumed.
 */
export type Smoothing = 'default' | 'antialiased'

export type FontChoice = {
  [K in FontRole]?: string
} & { smoothing?: Smoothing }

export const STORAGE_KEY = 'sentinel.fontlab.v1'

/** Write the choice onto the element as inline custom properties. */
export function applyFontChoice(choice: FontChoice, root: HTMLElement): void {
  for (const role of Object.keys(ROLE_VARS) as FontRole[]) {
    const stack = choice[role]
    if (stack) root.style.setProperty(ROLE_VARS[role], stack)
    else root.style.removeProperty(ROLE_VARS[role])
  }
  if (choice.smoothing === 'antialiased') {
    root.style.setProperty('-webkit-font-smoothing', 'antialiased')
    root.style.setProperty('-moz-osx-font-smoothing', 'grayscale')
  } else {
    root.style.removeProperty('-webkit-font-smoothing')
    root.style.removeProperty('-moz-osx-font-smoothing')
  }
}

/** Remove every override, returning the page to the shipped tokens. */
export function resetFontChoice(root: HTMLElement): void {
  applyFontChoice({}, root)
}

/**
 * Persisted choice, or {}.
 *
 * why the try/catch: storage throws outright in a private window or with
 * site data blocked, and a dev instrument must never be the reason a screen
 * fails to render.
 */
export function loadFontChoice(): FontChoice {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return {}
    const parsed: unknown = JSON.parse(raw)
    if (!parsed || typeof parsed !== 'object') return {}
    return parsed as FontChoice
  } catch {
    return {}
  }
}

export function saveFontChoice(choice: FontChoice): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(choice))
  } catch {
    /* not worth surfacing in a dev tool */
  }
}

/**
 * How to read a devicePixelRatio, in words that suggest an action.
 *
 * DPR is device pixels per CSS pixel. Below 1 the browser is drawing the page
 * *smaller* than 1:1 — glyphs get downscaled, hinting is discarded, and
 * everything looks soft no matter which typeface is loaded. That is worth
 * saying out loud, because it is easy to blame the font for it. A fractional
 * value (1.25, 1.5, 0.9) means browser zoom or fractional OS scaling, which
 * softens type for the same reason.
 */
export function describeDensity(dpr: number): { label: string; hint: string; warn: boolean } {
  // 0.8999999761581421 -> "0.9". Raw floats are what the browser reports.
  const label = `${Number(dpr.toFixed(2))}x`
  if (dpr < 1) {
    return {
      label,
      hint: 'below 1:1 — the page is being scaled DOWN and all type is softened. Reset browser zoom (Ctrl+0 / Cmd+0).',
      warn: true,
    }
  }
  if (dpr >= 2)
    return { label, hint: 'retina — type will look better here than on a 1x monitor.', warn: false }
  if (!Number.isInteger(dpr)) {
    return {
      label,
      hint: 'fractional scaling — zoom or OS scaling is resampling glyphs. 100% zoom is sharper.',
      warn: true,
    }
  }
  return {
    label,
    hint: 'standard density — judge weight carefully, this is the honest case.',
    warn: false,
  }
}
