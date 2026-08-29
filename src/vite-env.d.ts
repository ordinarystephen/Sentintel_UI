/// <reference types="vite/client" />

interface ImportMetaEnv {
  /** Selects the API implementation: `mock` (default, in-repo) or `http` (dev team's). */
  readonly VITE_API?: 'mock' | 'http'
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
