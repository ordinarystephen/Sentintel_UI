/// <reference types="vitest/config" />
import { fileURLToPath, URL } from 'node:url'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

/**
 * VITE_BASE_PATH makes the build servable under a reverse-proxy path prefix
 * (e.g. Domino): `VITE_BASE_PATH=/sentinel/ npm run build`. Defaults to '/'.
 * The router picks the prefix up via import.meta.env.BASE_URL (see router.tsx).
 * VITE_ALLOWED_HOSTS (comma-separated) lets the dev server accept proxied
 * hostnames; combine with `npm run dev -- --host 0.0.0.0`.
 * See docs/environment.md → "Running behind a proxy".
 */
export default defineConfig({
  base: process.env.VITE_BASE_PATH || '/',
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: { '@': fileURLToPath(new URL('./src', import.meta.url)) },
  },
  server: {
    allowedHosts: process.env.VITE_ALLOWED_HOSTS
      ? process.env.VITE_ALLOWED_HOSTS.split(',')
      : undefined,
  },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
    css: false,
  },
})
