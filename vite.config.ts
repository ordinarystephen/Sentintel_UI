/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig, type Plugin } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { isWorkspace } from './scripts/workspace.mjs'

/**
 * VITE_BASE_PATH makes the build servable under a reverse-proxy path prefix:
 * `VITE_BASE_PATH=/sentinel/ npm run build`. Defaults to '/' locally.
 * The router picks the prefix up via import.meta.env.BASE_URL (see router.tsx).
 * VITE_ROUTER=hash puts routes in the URL fragment, which no proxy rewrites.
 * VITE_ALLOWED_HOSTS (comma-separated, or 'all') lets the dev server accept
 * proxied hostnames; combine with `npm run dev -- --host 0.0.0.0`.
 * VITE_HMR_OVERLAY=off hides Vite's full-screen error overlay when a proxy
 * refuses the HMR websocket (the app still works; the error stays in console).
 * SENTINEL_TARGET=workspace|local forces the mode scripts/workspace.mjs picks.
 * See docs/environment.md → "Domino workspaces".
 */
const workspace = isWorkspace()

// Relative assets survive ANY prefix — stripped or forwarded — which is why
// this, not a guessed absolute '/proxy/<port>/', is the proven build. It must
// be paired with the hash router: with base './' there is no basename a
// history router could use.
const base = process.env.VITE_BASE_PATH || (workspace ? './' : '/')
const router = process.env.VITE_ROUTER || (workspace && base === './' ? 'hash' : '')

const allowedHosts = ((): true | string[] | undefined => {
  const raw = process.env.VITE_ALLOWED_HOSTS
  if (!raw) return undefined
  if (raw.trim() === 'all') return true
  return raw.split(',').map((h) => h.trim())
})()

/**
 * Make the DEV server answer on both `/thing` and `<prefix>/thing`.
 *
 * why: a workspace proxy either strips `<workspace>/proxy/<port>/` before
 * forwarding or passes the whole path through, and we cannot tell from
 * inside. The dev server has no relative-base escape hatch (Vite rewrites a
 * relative base to '/' in serve mode), so its HTML must carry the absolute
 * prefix — which then 404s under a proxy that strips. Prepending the base to
 * any request that arrives without it covers the stripping case too, so one
 * config works behind either kind.
 *
 * Runs before Vite's internal middlewares, which is what configureServer does
 * by default.
 */
function proxyPrefixTolerance(prefix: string): Plugin {
  const clean = prefix.replace(/\/+$/, '')
  return {
    name: 'sentinel:proxy-prefix-tolerance',
    configureServer(server) {
      if (!clean || clean === '') return
      server.middlewares.use((req, _res, next) => {
        const url = req.url || '/'
        if (url !== clean && !url.startsWith(`${clean}/`)) {
          req.url = clean + (url.startsWith('/') ? url : `/${url}`)
        }
        next()
      })
    },
  }
}

const devBase = process.env.VITE_BASE_PATH || ''

export default defineConfig({
  base,
  // why: `define` rather than env inheritance — router.tsx reads
  // import.meta.env.VITE_ROUTER, and this is the one value we derive rather
  // than receive, so it has to be injected explicitly to reach the bundle.
  define: router ? { 'import.meta.env.VITE_ROUTER': JSON.stringify(router) } : {},
  plugins: [react(), tailwindcss(), proxyPrefixTolerance(devBase)],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    allowedHosts,
    // why: HMR stays ON — a workspace proxy carries websockets for JupyterLab
    // already, so hot reload usually survives. What does not survive a proxy
    // that won't upgrade is the *overlay*: Vite covers the whole app with a
    // full-screen "server connection lost" error even though the page works.
    // (Note `hmr: false` is not the knob for this — the client still connects.)
    hmr: process.env.VITE_HMR_OVERLAY === 'off' ? { overlay: false } : undefined,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
