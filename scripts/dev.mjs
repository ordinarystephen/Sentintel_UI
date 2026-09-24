#!/usr/bin/env node
/**
 * `make dev`, everywhere.
 *
 * On a laptop this is a bare Vite dev server — same behaviour as always.
 * For a proxied workspace, Vite's defaults are all wrong and none of them
 * announce themselves: it binds 127.0.0.1 (the proxy cannot reach it), it
 * rejects the proxy's Host header, and it serves at '/'. This picks a free
 * port itself, binds it where the proxy can see it, and prints the exact URL
 * to open, so the verb stays `make dev`.
 *
 * Which mode applies is decided by scripts/workspace.mjs — an explicit path,
 * a pin or a discovered prefix, never a guess.
 * See docs/environment.md → "Target-environment workspaces".
 */
import { spawn } from 'node:child_process'
import net from 'node:net'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { isWorkspace, workspacePath, PIN_FILE } from './workspace.mjs'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const viteBin = path.join(root, 'node_modules', 'vite', 'bin', 'vite.js')

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

async function startWorkspace() {
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

  if (ws) {
    // The prefix goes in the HTML; vite.config's proxyPrefixTolerance plugin
    // additionally answers un-prefixed requests, so this one setting works
    // whether the proxy strips its prefix or forwards it.
    env.VITE_BASE_PATH = `${ws}/proxy/${port}/`
    console.log(`\n  Workspace mode — binding 0.0.0.0:${port}`)
    console.log(`\n  Open:  <your-workspace-host>${ws}/proxy/${port}/\n`)
  } else {
    console.log(`\n  Workspace mode — binding 0.0.0.0:${port}`)
    console.log('\n  No workspace path pinned, so no base path is set. If the page is')
    console.log('  blank, paste your workspace URL (address bar, verbatim) into:')
    console.log(`\n    echo '<paste URL>' > ${path.relative(root, PIN_FILE)}\n`)
    console.log(`  Then re-run. Open:  <your workspace URL>/proxy/${port}/\n`)
  }

  spawn(process.execPath, [viteBin, '--host', '0.0.0.0', '--port', String(port)], {
    stdio: 'inherit',
    env,
  }).on('exit', (c) => process.exit(c ?? 0))
}

// why: dispatch last — startWorkspace() reads consts declared above it, and a
// call placed earlier would hit them in the temporal dead zone.
if (!isWorkspace()) {
  // Laptop: exactly what `npm run dev` has always done. No flags, no wrapper.
  spawn(process.execPath, [viteBin], { stdio: 'inherit' }).on('exit', (c) => process.exit(c ?? 0))
} else {
  await startWorkspace()
}
