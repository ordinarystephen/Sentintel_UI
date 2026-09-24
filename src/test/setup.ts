import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { api } from '@/api'

// The real-Storage shim is installed by ./storage.ts, which runs FIRST
// (vite.config setupFiles order): this file's imports are hoisted, so a
// shim defined here would land after the api singleton had already
// captured the inert Node global as its storage.

afterEach(() => {
  cleanup()
  document.body.className = ''
  localStorage.clear()
  // Each test starts from pristine mock state (the API is a module singleton).
  if ('reset' in api && typeof api.reset === 'function') api.reset()
})
