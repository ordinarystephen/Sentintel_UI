/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * VITE_BASE_PATH makes the build servable under a reverse-proxy path prefix
 * (e.g. the target environment): `VITE_BASE_PATH=/sentinel/ npm run build`. Defaults to '/'.
 * The router picks the prefix up via import.meta.env.BASE_URL (see router.tsx).
 * VITE_ROUTER=hash puts routes in the URL fragment, which no proxy rewrites.
 * VITE_ALLOWED_HOSTS (comma-separated, or 'all') lets the dev server accept
 * proxied hostnames; combine with `npm run dev -- --host 0.0.0.0`.
 * VITE_HMR_OVERLAY=off hides Vite's full-screen error overlay when a proxy
 * refuses the HMR websocket (the app still works; the error stays in console).
 * See docs/environment.md → "Running behind a proxy" and "Domino workspaces".
 */

// why: a Domino workspace exports DOMINO_* into every shell. Detecting it lets
// `make build` emit the combination already proven to work there (relative
// assets + hash routes, docs/environment.md → "Base path: plan A and plan B")
// without anyone having to remember two env vars. Explicit values always win.
const inDomino = Object.keys(process.env).some((k) => k.startsWith('DOMINO_'))

// Relative assets survive ANY prefix — stripped or forwarded — which is why
// this, not a guessed absolute '/proxy/<port>/', is the proven build. It must
// be paired with the hash router: with base './' there is no basename a
// history router could use.
const base = process.env.VITE_BASE_PATH || (inDomino ? './' : '/')
const router = process.env.VITE_ROUTER || (inDomino && base === './' ? 'hash' : '')

const allowedHosts = ((): true | string[] | undefined => {
  const raw = process.env.VITE_ALLOWED_HOSTS
  if (!raw) return undefined
  if (raw.trim() === 'all') return true
  return raw.split(',').map((h) => h.trim())
})()

export default defineConfig({
  base,
  // why: `define` rather than relying on env inheritance — router.tsx reads
  // import.meta.env.VITE_ROUTER, and this is the one value we derive rather
  // than receive, so it has to be injected explicitly to reach the bundle.
  define: router ? { 'import.meta.env.VITE_ROUTER': JSON.stringify(router) } : {},
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    allowedHosts,
    // why: HMR stays ON — a Domino workspace proxies websockets already (it
    // has to, for JupyterLab/VS Code), so hot reload usually survives. What
    // does not survive a proxy that won't upgrade is the *overlay*: Vite
    // covers the whole app with a full-screen "server connection lost" error
    // even though the page itself works fine. VITE_HMR_OVERLAY=off keeps the
    // app usable and leaves the failure in the console where it belongs.
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
