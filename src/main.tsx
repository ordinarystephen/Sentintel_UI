import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import '@fontsource-variable/inter'
import '@fontsource-variable/source-serif-4'
import '@/styles/base.css'
import { App } from '@/app/App'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// why the dynamic import rather than a guarded <FontLab /> in the tree:
// `import.meta.env.DEV` is replaced with `false` at build time, so this whole
// branch is dead code and Rollup drops the lab AND its six candidate
// webfonts. A static import at the top of this file would keep the module
// graph alive and emit every font into dist/ — measured, not assumed.
// scripts/check-no-devtools.sh fails the build if that ever regresses.
if (import.meta.env.DEV) {
  void import('@/dev/mountFontLab').then((m) => m.mountFontLab())
}
