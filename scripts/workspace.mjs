/**
 * Where is this app going to be served from — a laptop, or behind a workspace
 * proxy? Single source of truth for `make dev`, `make build` and vite.config.
 *
 * why detection is not keyed off platform environment variables: the first
 * version was, and the real target workspace exports none of them (verified
 * 2026-09-22 via `make doctor` in the container: node v22.17.1, flask
 * importable, zero platform-prefixed vars). Detection that guesses wrong is
 * worse than none — all three verbs then silently take the laptop path while
 * the terminal reports success. So: an explicit path or a pin wins, and
 * otherwise the prefix is worked out from what the container itself runs
 * (Discovery, below) — never inferred from a variable merely being present.
 */
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')

/** Gitignored, one line, written once per workspace. */
export const PIN_FILE = path.join(root, '.sentinel-workspace-path')

/**
 * Pins written under an earlier file name — v1.8.1 renamed the pin. Still
 * read (after PIN_FILE), so a workspace pinned before the rename keeps
 * working; `make doctor` asks for the rename. Same glob as .gitignore.
 */
export function legacyPinFiles() {
  try {
    return fs
      .readdirSync(root)
      .filter((f) => /^\..+-workspace-path$/.test(f) && f !== path.basename(PIN_FILE))
      .sort()
      .map((f) => path.join(root, f))
  } catch {
    return []
  }
}

/** The pinned value as written (PIN_FILE first, then any legacy pin), or ''. */
export function readPin() {
  for (const file of [PIN_FILE, ...legacyPinFiles()]) {
    try {
      const v = fs.readFileSync(file, 'utf8').trim()
      if (v) return v
    } catch {
      // absent or unreadable: try the next
    }
  }
  return ''
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

/**
 * The workspace path prefix, e.g. /u/me/proj/r/notebookSession/abc123.
 *
 * Order is deliberate: an explicit env var beats a pinned file beats
 * discovery. Discovery is last so that a value someone deliberately wrote
 * down is never silently overridden by a probe — but it runs unprompted, so
 * a fresh workspace needs no pinning at all.
 */
export function workspacePath() {
  const explicit = normaliseWorkspacePath(process.env.SENTINEL_WORKSPACE_PATH || '')
  if (explicit) return explicit
  const pinned = normaliseWorkspacePath(readPin())
  if (pinned) return pinned
  return discoverWorkspacePath()
}

/**
 * Build/serve for a proxied workspace?
 *
 * SENTINEL_TARGET wins both ways so a one-off run can force either mode.
 * Otherwise: an explicit path, a pin, or a discovered prefix means yes —
 * nothing weaker does.
 */
export function isWorkspace() {
  if (process.env.SENTINEL_TARGET === 'workspace') return true
  if (process.env.SENTINEL_TARGET === 'local') return false
  if (process.env.SENTINEL_WORKSPACE_PATH) return true
  if (readPin()) return true
  // why: a discovered prefix is itself proof we are behind a workspace proxy,
  // so a fresh container needs nothing pinned to get the right build.
  return Boolean(discoverWorkspacePath())
}

// ─────────────────────────────────────────────────────────────────────────────
// Discovery — work the prefix out instead of asking for it.
//
// A workspace has to know its own base path: the JupyterLab / VS Code server
// in the same container is itself served under it, so the value exists in the
// process table and in config on disk even when the platform exports no
// variable for it.
// Every probe is read-only, individually guarded, and returns '' rather than
// throwing, because a probe that crashes `make dev` is worse than no probe.
// ─────────────────────────────────────────────────────────────────────────────

/** base_url as the notebook/IDE server was actually launched with. */
function fromProcessTable() {
  let pids
  try {
    pids = fs.readdirSync('/proc').filter((d) => /^\d+$/.test(d))
  } catch {
    return '' // not Linux, or no procfs
  }
  const flags = [
    /--ServerApp\.base_url[= ]([^\s\0]+)/,
    /--NotebookApp\.base_url[= ]([^\s\0]+)/,
    /--base[-_]url[= ]([^\s\0]+)/,
    /--server-base-path[= ]([^\s\0]+)/,
    /--base-path[= ]([^\s\0]+)/,
  ]
  for (const pid of pids) {
    let cmd
    try {
      cmd = fs.readFileSync(`/proc/${pid}/cmdline`, 'utf8').replace(/\0/g, ' ')
    } catch {
      continue // process exited, or not ours to read
    }
    for (const re of flags) {
      const m = cmd.match(re)
      if (m && m[1] && m[1] !== '/') return m[1]
    }
  }
  return ''
}

/** base_url as written into Jupyter config by the platform. */
function fromJupyterConfig() {
  const home = process.env.HOME || ''
  const candidates = [
    home && path.join(home, '.jupyter', 'jupyter_server_config.py'),
    home && path.join(home, '.jupyter', 'jupyter_notebook_config.py'),
    '/etc/jupyter/jupyter_server_config.py',
    '/etc/jupyter/jupyter_notebook_config.py',
    '/opt/conda/etc/jupyter/jupyter_server_config.py',
  ].filter(Boolean)
  for (const file of candidates) {
    let text
    try {
      text = fs.readFileSync(file, 'utf8')
    } catch {
      continue
    }
    const m = text.match(/^\s*c\.(?:ServerApp|NotebookApp)\.base_url\s*=\s*['"]([^'"]+)['"]/m)
    if (m && m[1] && m[1] !== '/') return m[1]
  }
  return ''
}

/**
 * Any path-prefix-named variable whose value already looks like a workspace
 * path. The name filter is what keeps a laptop safe: PWD, INIT_CWD or PATH
 * under a directory called `r` or `proxy` would pass the shape test alone.
 * `*_HOST_PATH` covers a platform image that exports the run's host path —
 * as a bare path or a full URL (a URL is reduced to its path first).
 */
function fromEnvShapes() {
  const shape = /^\/[\w.-]+(?:\/[\w.-]+)*\/(?:r|notebookSession|proxy)(?:\/|$)/
  for (const [k, v] of Object.entries(process.env)) {
    if (!v || v.length > 300) continue
    if (!/^(JUPYTER|NB_|JPY|WORKSPACE|BASE_URL|NOTEBOOK)|HOST_PATH$/i.test(k)) continue
    // a URL is tested on its raw path; discoverAll normalises what comes back
    const p = v.match(/^[a-z][a-z0-9+.-]*:\/\/[^/?#]+([^?#]*)/i)?.[1] ?? v
    if (shape.test(p)) return p
  }
  return ''
}

/**
 * Every probe, in cost order, with the source name for `make doctor`.
 * Exported so the doctor can show what each one saw rather than just a verdict.
 */
export function discoverAll() {
  const probes = [
    ['environment (path-shaped var)', fromEnvShapes],
    ['process table (base_url flag)', fromProcessTable],
    ['jupyter config file', fromJupyterConfig],
  ]
  return probes.map(([source, fn]) => {
    try {
      return { source, value: normaliseWorkspacePath(fn()) }
    } catch {
      return { source, value: '' }
    }
  })
}

/** First probe that found something, or ''. */
export function discoverWorkspacePath() {
  const hit = discoverAll().find((r) => r.value)
  return hit ? hit.value : ''
}
