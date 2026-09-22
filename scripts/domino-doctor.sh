#!/usr/bin/env sh
# Why this exists: in a Domino workspace both paths to seeing the app — the
# dev server and the built-and-served SPA — can fail silently, and from the
# terminal both look like success. This prints evidence for each, and ends
# with the exact URL to open. See docs/environment.md → "Domino workspaces".
set -eu
cd "$(dirname "$0")/.."

hdr() { printf '\n=== %s ===\n' "$*"; }
ok()  { printf '  ok    %s\n' "$*"; }
bad() { printf '  FAIL  %s\n' "$*"; }
note(){ printf '        %s\n' "$*"; }

printf 'Sentinel UI — workspace doctor\n'

# ---------------------------------------------------------------- runtime
hdr "Runtime"
if command -v node >/dev/null 2>&1; then
  NODE_V="$(node --version)"; NODE_MAJOR="$(printf '%s' "$NODE_V" | sed 's/^v//; s/\..*//')"
  if [ "$NODE_MAJOR" -ge 22 ] 2>/dev/null; then ok "node $NODE_V"
  else bad "node $NODE_V is below the >= 22.12 floor — platform-team request, do not work around it"; fi
else bad "node not found on PATH"; fi
command -v npm >/dev/null 2>&1 && ok "npm $(npm --version)" || bad "npm not found on PATH"
[ -d node_modules/vite ] && ok "node_modules present" || bad "node_modules missing — run: make install"
if python -c "import flask" >/dev/null 2>&1 || python3 -c "import flask" >/dev/null 2>&1; then
  ok "flask importable (make run will work)"
else
  bad "flask not importable — 'make run' will fail. Run: make install"
fi

# ---------------------------------------------------------------- workspace
hdr "Workspace"
DOMINO_VARS="$(env | grep -E '^DOMINO_' | sort || true)"
WS="${SENTINEL_WORKSPACE_PATH:-}"
[ -z "$WS" ] && [ -f .domino-workspace-path ] && WS="$(cat .domino-workspace-path)"
[ -z "$WS" ] && WS="${DOMINO_RUN_HOST_PATH:-}"
WS="$(printf '%s' "$WS" | sed 's#/*$##')"
if [ -n "$DOMINO_VARS" ]; then
  ok "Domino workspace detected"
  printf '%s\n' "$DOMINO_VARS" | sed 's/^/          /'
else
  note "no DOMINO_* variables — 'make dev' and 'make build' will use laptop defaults"
fi
if [ -n "$WS" ]; then
  ok "workspace path: $WS"
else
  note "workspace path unknown (DOMINO_RUN_HOST_PATH not exported)."
  note "Pin it once if pages come up blank:"
  note "  echo /u/<you>/<project>/r/notebookSession/<id> > .domino-workspace-path"
fi

# ---------------------------------------------------------------- the build
hdr "Built SPA (what 'make run' would serve)"
if [ ! -d dist ]; then
  bad "no dist/ — 'make run' will serve the placeholder page, not the app."
  note "Run: make build"
elif [ ! -f dist/index.html ]; then
  bad "dist/ exists but has no index.html — rebuild: make build"
else
  REF="$(grep -o 'src="[^"]*assets[^"]*"' dist/index.html | head -1 || true)"
  case "$REF" in
    *'"./assets'*)
      ok "assets are RELATIVE — survives any proxy prefix ${REF}" ;;
    *'"/assets'*)
      # why: root-absolute is CORRECT on a laptop and fatal behind a prefix —
      # the same artifact, judged by where it will be served.
      if [ -n "$DOMINO_VARS" ]; then
        bad "assets are ROOT-ABSOLUTE ${REF}"
        note "Behind a workspace prefix every asset 404s and the page is blank."
        note "This dist/ was built outside the workspace. Rebuild here: make build"
      else
        ok "assets are root-absolute ${REF} — correct for local serving"
      fi ;;
    *) note "could not read an asset reference from dist/index.html" ;;
  esac
fi

# ---------------------------------------------------------------- ports
hdr "Ports"
show_port() {
  _p="$1"; _l=""
  if command -v ss >/dev/null 2>&1; then _l="$(ss -ltn 2>/dev/null | grep -E "[:.]${_p}[[:space:]]" || true)"
  elif command -v lsof >/dev/null 2>&1; then _l="$(lsof -nP -iTCP:"${_p}" -sTCP:LISTEN 2>/dev/null || true)"; fi
  if [ -n "$_l" ]; then ok "something is listening on ${_p}"; else note "nothing on ${_p}"; fi
}
show_port 5173
show_port 8082

# ---------------------------------------------------------------- verdict
hdr "What to open"
if [ -n "$WS" ]; then
  printf '  make dev   -> <your-domino-host>%s/proxy/<port it prints>/\n' "$WS"
  printf '  make run   -> <your-domino-host>%s/proxy/8082/\n' "$WS"
else
  printf '  make dev   -> your workspace URL + /proxy/<port it prints>/\n'
  printf '  make run   -> your workspace URL + /proxy/8082/\n'
fi
printf '\n  Nothing opens by itself in a workspace — you have to visit the URL.\n\n'
exit 0
