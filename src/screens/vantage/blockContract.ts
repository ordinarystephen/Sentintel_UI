/**
 * The block-contract gates the renderer enforces (Vantage 2026-09-18):
 * a figure without a derivation must not render.
 */
import type { VantageFigure } from '@/api/types'

export function renderableFigures(items: VantageFigure[]): VantageFigure[] {
  return items.filter((f) => typeof f.derivation === 'string' && f.derivation.trim().length > 0)
}
