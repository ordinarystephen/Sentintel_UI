/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Selects the API implementation: `mock` (default, in-repo) or `http` (dev team's). */
  readonly VITE_API?: 'mock' | 'http'
  /** Router mode: 'browser' (default, history API + basename) or 'hash' (target-environment fallback). */
  readonly VITE_ROUTER?: 'browser' | 'hash'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
