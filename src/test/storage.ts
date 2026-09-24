/**
 * Test storage — runs BEFORE ./setup.ts (vite.config setupFiles order), so
 * the api singleton, created when setup.ts imports it, captures THIS
 * Storage (v1.8: the mock's sign-in switch and persistence read it).
 */
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
