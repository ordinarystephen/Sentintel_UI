import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// Node ≥ 22 exposes an experimental `localStorage` global that shadows jsdom's
// and is inert without --localstorage-file. Tests need a real Storage, so use
// jsdom's window.localStorage when it is one, else a small in-memory shim.
function memoryStorage(): Storage {
  const store = new Map<string, string>()
  return {
    get length() {
      return store.size
    },
    key: (i) => Array.from(store.keys())[i] ?? null,
    getItem: (k) => store.get(k) ?? null,
    setItem: (k, v) => void store.set(k, String(v)),
    removeItem: (k) => void store.delete(k),
    clear: () => store.clear(),
  }
}
const domStorage = (() => {
  try {
    const s = window.localStorage
    return typeof s?.clear === 'function' ? s : null
  } catch {
    return null
  }
})()
Object.defineProperty(globalThis, 'localStorage', {
  value: domStorage ?? memoryStorage(),
  configurable: true,
  writable: true,
})

afterEach(() => {
  cleanup()
  document.body.className = ''
  localStorage.clear()
})
