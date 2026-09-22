/**
 * Where is this app going to be served from — a laptop, or behind a workspace
 * proxy? Single source of truth for `make dev`, `make build` and vite.config.
 *
 * why this is not auto-detected: the original version keyed off DOMINO_*
 * environment variables, and a real UBS Domino workspace exports NONE of them
 * (verified 2026-09-22 via `make doctor` in the container: node v22.17.1,
 * flask importable, zero DOMINO_* vars). Detection that guesses wrong is worse
 * than no detection, because all three verbs then silently take the laptop
 * path and the terminal reports success. So: pin it once, explicitly.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Gitignored, one line, written once per workspace. */
export const PIN_FILE = path.join(root, '.domino-workspace-path')

function readPin() {
  try {
    return fs.readFileSync(PIN_FILE, 'utf8').trim()
  } catch {
    return ''
  }
}

/**
 * Turn whatever was pasted into a bare path prefix.
 *
 * Accepts the full URL straight out of the address bar, a bare path, with or
 * without a trailing `/proxy/<port>/` — because asking someone to hand-edit a
 * URL into canonical form is how this breaks.
 */
export function normaliseWorkspacePath(raw) {
  let v = String(raw || '').trim()
  if (!v) return ''
  const asUrl = v.match(/^[a-z][a-z0-9+.-]*:\/\/[^/]+(\/.*)?$/i)
  if (asUrl) v = asUrl[1] || '/'
  v = v.split('?')[0].split('#')[0]
  v = v.replace(/\/proxy\/\d+\/?$/, '') // they pasted the proxied URL itself
  v = v.replace(/\/+$/, '')
  if (v && !v.startsWith('/')) v = `/${v}`
  return v
}

/** The workspace path prefix, e.g. /u/me/proj/r/notebookSession/abc123. */
export function workspacePath() {
  return normaliseWorkspacePath(
    process.env.SENTINEL_WORKSPACE_PATH || readPin() || process.env.DOMINO_RUN_HOST_PATH || '',
  )
}

/**
 * Build/serve for a proxied workspace?
 *
 * SENTINEL_TARGET wins both ways so a one-off run can force either mode.
 * Otherwise: a pinned path means yes. DOMINO_* is kept as a last resort for
 * images that do export it, but nothing depends on it any more.
 */
export function isWorkspace() {
  if (process.env.SENTINEL_TARGET === 'workspace') return true
  if (process.env.SENTINEL_TARGET === 'local') return false
  if (process.env.SENTINEL_WORKSPACE_PATH) return true
  if (readPin()) return true
  return Object.keys(process.env).some((k) => k.startsWith('DOMINO_'))
}
