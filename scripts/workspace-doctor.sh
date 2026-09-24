#!/usr/bin/env sh
# Why this exists: in a workspace both paths to seeing the app — the dev server
# and the built-and-served SPA — can fail silently, and from the terminal both
# look like success. This prints evidence for each and ends with the URL to
# open. See docs/environment.md → "Target-environment workspaces".
set -eu
cd "$(dirname "$0")/.."

ok()  { printf '  ok    %s\n' "$*"; }
bad() { printf '  FAIL  %s\n' "$*"; }
note(){ printf '        %s\n' "$*"; }
hdr() { printf '\n=== %s ===\n' "$*"; }

printf 'Sentinel UI — workspace doctor\n'

# ---------------------------------------------------------------- mode
# Mirrors scripts/workspace.mjs. Never guessed: the real target workspace
# exports none of the platform's variables, so detection based on them
# silently picks the laptop path and reports success (verified 2026-09-22).
WS="$(node -e "import('./scripts/workspace.mjs').then(m=>console.log(m.workspacePath()))" 2>/dev/null || echo '')"
MODE="$(node -e "import('./scripts/workspace.mjs').then(m=>console.log(m.isWorkspace()?'workspace':'local'))" 2>/dev/null || echo 'local')"

hdr "Mode"
if [ "$MODE" = "workspace" ]; then
  ok "WORKSPACE — build and dev will target a proxy prefix"
  if [ -n "$WS" ]; then ok "workspace path: $WS"
  else
    bad "workspace mode is on but no path is pinned"
    note "Paste your workspace URL (address bar, verbatim):"
    note "  echo '<paste URL>' > .sentinel-workspace-path"
  fi
elif [ "${SENTINEL_TARGET:-}" = "local" ]; then
  ok "LOCAL — forced by SENTINEL_TARGET=local"
else
  ok "LOCAL — laptop defaults (this is correct on a laptop)"
  note ""
  note "IF YOU ARE IN A TARGET-ENVIRONMENT WORKSPACE, THIS IS WRONG and is why"
  note "nothing appears: no probe found the workspace prefix (see Discovery"
  note "below). Pin it once — paste the URL from your browser address bar:"
  note ""
  note "  echo '<paste your workspace URL>' > .sentinel-workspace-path"
  note ""
  note "Then re-run 'make build' (the current dist/ is built for local serving)."
fi

# ---------------------------------------------------------------- runtime
hdr "Runtime"
if command -v node >/dev/null 2>&1; then
  NODE_V="$(node --version)"; NODE_MAJOR="$(printf '%s' "$NODE_V" | sed 's/^v//; s/\..*//')"
  if [ "$NODE_MAJOR" -ge 22 ] 2>/dev/null; then ok "node $NODE_V"
  else bad "node $NODE_V is below the >= 22.12 floor — platform-team request"; fi
else bad "node not found on PATH"; fi
command -v npm >/dev/null 2>&1 && ok "npm $(npm --version)" || bad "npm not found on PATH"
[ -d node_modules/vite ] && ok "node_modules present" || bad "node_modules missing — run: make install"
if python -c "import flask" >/dev/null 2>&1 || python3 -c "import flask" >/dev/null 2>&1; then
  ok "flask importable (make run will work)"
else
  bad "flask not importable — 'make run' will fail. Run: make install"
fi

# ---------------------------------------------------------------- the build
hdr "Built SPA (what 'make run' would serve)"
if [ ! -d dist ] || [ ! -f dist/index.html ]; then
  bad "no usable dist/ — 'make run' serves the placeholder page. Run: make build"
else
  REF="$(grep -o 'src="[^"]*assets[^"]*"' dist/index.html | head -1 || true)"
  case "$REF" in
    *'"./assets'*)
      if [ "$MODE" = "workspace" ]; then ok "assets are RELATIVE ${REF} — survives any proxy prefix"
      else note "assets are relative ${REF} — built for a workspace, harmless locally"; fi ;;
    *'"/assets'*)
      # why: root-absolute is CORRECT locally and fatal behind a prefix — the
      # same artifact, judged by where it will actually be served.
      if [ "$MODE" = "workspace" ]; then
        bad "assets are ROOT-ABSOLUTE ${REF}"
        note "Behind a workspace prefix every asset 404s — blank page. Run: make build"
      else ok "assets are root-absolute ${REF} — correct for local serving"; fi ;;
    *) note "could not read an asset reference from dist/index.html" ;;
  esac
fi

# ---------------------------------------------------------------- ports
hdr "Ports"
for P in 5173 8082; do
  L=""
  if command -v ss >/dev/null 2>&1; then L="$(ss -ltn 2>/dev/null | grep -E "[:.]${P}[[:space:]]" || true)"
  elif command -v lsof >/dev/null 2>&1; then L="$(lsof -nP -iTCP:"${P}" -sTCP:LISTEN 2>/dev/null || true)"; fi
  [ -n "$L" ] && ok "something is listening on ${P}" || note "nothing on ${P}"
done

# ---------------------------------------------------------------- discovery
hdr "Discovery (working the prefix out instead of asking for it)"
node -e "
import('./scripts/workspace.mjs').then((m) => {
  for (const r of m.discoverAll()) {
    console.log('  ' + (r.value ? 'HIT ' : '--  ') + r.source.padEnd(32) + (r.value || ''))
  }
  const found = m.discoverWorkspacePath()
  const pinned = m.normaliseWorkspacePath(m.readPin())
  // the pin in force is the first non-empty one, current name first
  const fs = require('node:fs')
  const live = [m.PIN_FILE, ...m.legacyPinFiles()].find((f) => {
    try { return fs.readFileSync(f, 'utf8').trim() !== '' } catch { return false }
  })
  for (const f of m.legacyPinFiles()) {
    const name = f.split('/').pop()
    console.log('')
    if (f === live) {
      console.log('  RENAME   pin under a pre-v1.8.1 name (still read for now): ' + name)
      console.log('             mv ' + name + ' .sentinel-workspace-path')
    } else {
      console.log('  UNUSED   pin under a pre-v1.8.1 name, not read: ' + name)
      console.log('             rm ' + name)
    }
  }
  if (pinned && found && pinned !== found) {
    console.log('')
    console.log('  WARNING  pinned path and discovered path disagree:')
    console.log('             pinned:     ' + pinned)
    console.log('             discovered: ' + found)
    console.log('           A workspace session id changes when the workspace restarts,')
    console.log('           so a pin can go stale. The pin wins. If pages are blank,')
    console.log('           delete every pin (rm -f .*-workspace-path) and let discovery run.')
  } else if (!pinned && found) {
    console.log('')
    console.log('  Discovery succeeded — nothing needs pinning.')
  } else if (!pinned && !found) {
    console.log('')
    console.log('  No probe found a prefix. Pin it once:')
    console.log('    echo \'<paste your workspace URL>\' > .sentinel-workspace-path')
  }
}).catch((e) => console.log('  discovery unavailable: ' + e.message))
" 2>/dev/null || note "node could not run the discovery probes"

hdr "Environment hints"
HINTS="$(env | grep -iE '^(JUPYTER|NB_|WORKSPACE|PROXY|BASE_URL|JPY|NOTEBOOK|[A-Z0-9_]*HOST_PATH=)' | sort || true)"
if [ -n "$HINTS" ]; then printf '%s\n' "$HINTS" | sed 's/^/          /'
else note "no workspace-shaped variables in the environment"; fi

# ---------------------------------------------------------------- verdict
hdr "What to open"
if [ -n "$WS" ]; then
  printf '  make dev   -> <your-workspace-host>%s/proxy/<port it prints>/\n' "$WS"
  printf '  make run   -> <your-workspace-host>%s/proxy/8082/\n' "$WS"
else
  printf '  make dev   -> your workspace URL + /proxy/<port it prints>/\n'
  printf '  make run   -> your workspace URL + /proxy/8082/\n'
fi
printf '\n  Nothing opens by itself in a workspace — you have to visit the URL.\n\n'
exit 0
