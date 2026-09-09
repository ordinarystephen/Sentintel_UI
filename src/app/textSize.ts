/**
 * User text-size choice (masthead S/M/L) — the follow-on knob to the v1.2
 * type scale. SEPARATE from --root-size (the environment knob): the choice
 * is a class on <html> setting --user-scale, and base.css computes
 * html { font-size: calc(var(--root-size) * var(--user-scale)) }, so the
 * user's choice compounds with the low-DPI media step instead of fighting
 * it. S on a Retina Mac ≈ the original pre-v1.2 density, by design.
 *
 * The class lives on <html> (not <body> like the theme) because the html
 * font-size declaration cannot read a custom property set on its child.
 * index.html carries a tiny pre-paint copy of `applyTextSize`; keep the
 * key and class names in sync.
 */
export const SIZE_KEY = 'sentinel.textSize'

export type TextSize = 's' | 'm' | 'l'

export const DEFAULT_SIZE: TextSize = 'm'

/** Size → html class. M is the bare default, so it has no class. */
export const SIZES: ReadonlyArray<{ id: TextSize; htmlClass: string | null }> = [
  { id: 's', htmlClass: 'text-size-s' },
  { id: 'm', htmlClass: null },
  { id: 'l', htmlClass: 'text-size-l' },
]

export function readTextSize(): TextSize {
  try {
    const raw = localStorage.getItem(SIZE_KEY)
    if (raw && SIZES.some((s) => s.id === raw)) return raw as TextSize
  } catch {
    /* storage unavailable or corrupt → default */
  }
  return DEFAULT_SIZE
}

export function writeTextSize(size: TextSize): void {
  try {
    localStorage.setItem(SIZE_KEY, size)
  } catch {
    /* storage unavailable: the choice lives for the session only */
  }
}

export function applyTextSize(size: TextSize, root: HTMLElement = document.documentElement): void {
  for (const s of SIZES) if (s.htmlClass) root.classList.remove(s.htmlClass)
  const cls = SIZES.find((s) => s.id === size)?.htmlClass
  if (cls) root.classList.add(cls)
}
