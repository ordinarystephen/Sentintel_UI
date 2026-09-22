#!/usr/bin/env node
/**
 * `make dev`, everywhere.
 *
 * On a laptop this is a bare Vite dev server — same behaviour as before.
 * Inside a Domino workspace, Vite's defaults are all wrong and none of them
 * announce themselves: it binds 127.0.0.1 (the proxy cannot reach it), it
 * rejects the proxy's Host header, and it serves at '/'. This picks a free
 * port itself, binds it where the proxy can see it, and prints the exact URL
 * to open, so the verb stays `make dev`.
 *
 * See docs/environment.md → "Domino workspaces".
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

// A workspace exports DOMINO_* into every shell; that is the whole detection.
const inDomino = Object.keys(process.env).some((k) => k.startsWith('DOMINO_'))

/**
 * Is `port` free? Probed on the IPv4 wildcard, IPv4 loopback AND IPv6 loopback.
 *
 * why all three: a dev server holds only the address it bound. macOS resolves
 * `localhost` to ::1, so a bare `vite` sits on [::1]:5173 and BOTH IPv4 probes
 * report the port free — we would then start a second server on the same port.
 * Only EADDRINUSE means occupied; a host with no IPv6 stack errors differently
 * and must not be read as busy.
 */
const bindable = (port, host) =>
  new Promise((resolve) => {
    const s = net.createServer()
    s.once('error', (e) => resolve(e.code !== 'EADDRINUSE'))
    s.once('listening', () => s.close(() => resolve(true)))
    s.listen(port, host)
  })

const isFree = async (port) => {
  for (const host of ['0.0.0.0', '127.0.0.1', '::1']) {
    if (!(await bindable(port, host))) return false
  }
  return true
}

/**
 * The workspace path prefix, e.g. /u/me/sentinel/r/notebookSession/abc123.
 * DOMINO_RUN_HOST_PATH is the usual source; SENTINEL_WORKSPACE_PATH and the
 * gitignored .domino-workspace-path let an operator pin it once when the
 * image does not export it.
 */
function workspacePath() {
  const saved = (() => {
    try {
      return fs.readFileSync(path.join(root, '.domino-workspace-path'), 'utf8').trim()
    } catch {
      return ''
    }
  })()
  const raw = process.env.SENTINEL_WORKSPACE_PATH || saved || process.env.DOMINO_RUN_HOST_PATH || ''
  return raw.replace(/\/+$/, '')
}

async function start() {
  let port = 0
  for (let p = 5173; p < 5223; p++) {
    if (await isFree(p)) {
      port = p
      break
    }
  }
  if (!port) {
    console.error('dev: no free port in 5173-5222. Clear one (pkill -f vite) and retry.')
    process.exit(2)
  }

  const ws = workspacePath()
  const env = { ...process.env, VITE_ALLOWED_HOSTS: 'all', VITE_HMR_OVERLAY: 'off' }

  // why: only set a base when we actually know the prefix. A WRONG absolute
  // base is worse than none — every asset 404s. With no base, the dev server
  // still works through any proxy that strips its own prefix before
  // forwarding; if yours does not, the page is blank and the note below says
  // exactly what to do about it.
  if (ws) env.VITE_BASE_PATH = `${ws}/proxy/${port}/`

  console.log(`\n  Domino workspace detected — binding 0.0.0.0:${port}\n`)
  if (ws) {
    console.log(`  Open:  <your-domino-host>${ws}/proxy/${port}/\n`)
  } else {
    console.log('  The workspace path is not exported here, so no base path is set.')
    console.log('  If the page loads, you are done. If it is BLANK, the proxy forwards')
    console.log('  its prefix and Vite needs to know it — copy everything after the')
    console.log('  hostname from your workspace URL and pin it once:\n')
    console.log('    echo /u/<you>/<project>/r/notebookSession/<id> > .domino-workspace-path\n')
    console.log(`  Then open:  <your-domino-host>/.../proxy/${port}/\n`)
  }

  spawn(process.execPath, [viteBin, '--host', '0.0.0.0', '--port', String(port)], {
    stdio: 'inherit',
    env,
  }).on('exit', (c) => process.exit(c ?? 0))
}

if (!inDomino) {
  // Laptop: exactly what `npm run dev` has always done. No flags, no wrapper.
  spawn(process.execPath, [viteBin], { stdio: 'inherit' }).on('exit', (c) => process.exit(c ?? 0))
} else {
  await start()
}
