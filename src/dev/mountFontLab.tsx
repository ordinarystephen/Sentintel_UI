/**
 * Mounts the Font Lab into its own React root, outside the app tree.
 *
 * why a separate root and a separate module: main.tsx reaches this only via
 * `await import()` inside an `import.meta.env.DEV` branch. Vite replaces that
 * flag with `false` when building, the branch becomes dead code, and Rollup
 * drops this module and everything it pulls in — including the six candidate
 * webfonts. A static `import { FontLab }` at the top of main.tsx does NOT
 * achieve that: the guard removes the render, but the module graph survives
 * and every font is emitted into dist/ anyway. That regression is what
 * scripts/check-no-devtools.sh exists to catch.
 *
 * The panel is position: fixed and holds no app state, so living outside the
 * app's root costs nothing and keeps the product tree clean.
 */
import { createRoot } from 'react-dom/client'
import { FontLab } from './FontLab'

export function mountFontLab(): void {
  const host = document.createElement('div')
  host.id = 'sentinel-font-lab'
  document.body.appendChild(host)
  createRoot(host).render(<FontLab />)
}
