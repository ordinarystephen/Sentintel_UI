#!/usr/bin/env sh
# The Font Lab is a dev instrument. It is mounted behind `import.meta.env.DEV`
# so Vite eliminates it as dead code — but "should be tree-shaken" is an
# assumption, and the whole point of the guard is that the lab and the six
# candidate webfonts it lazily imports never reach a shipped bundle. Check it.
# Runs after `npm run build`, as part of `npm run verify`.
set -eu
cd "$(dirname "$0")/.."

if [ ! -d dist ]; then
  echo "check:no-devtools SKIPPED — no dist/ (run npm run build first)" >&2
  exit 0
fi

FAIL=0

# 1. No lab source in any emitted asset.
if grep -rl -e 'Font Lab' -e 'sentinel.fontlab' -e 'reset to shipped tokens' dist >/dev/null 2>&1; then
  echo "check:no-devtools FAILED — Font Lab strings found in dist/:" >&2
  grep -rl -e 'Font Lab' -e 'sentinel.fontlab' -e 'reset to shipped tokens' dist >&2
  FAIL=1
fi

# 2. No candidate webfont files. The two shipped faces (inter, source-serif-4)
#    are expected; anything else means a lab-only font was emitted.
STRAY="$(find dist -type f \( -name '*.woff2' -o -name '*.woff' \) \
  ! -name 'inter-*' ! -name 'source-serif-4-*' 2>/dev/null || true)"
if [ -n "$STRAY" ]; then
  echo "check:no-devtools FAILED — non-shipped font files in dist/:" >&2
  printf '%s\n' "$STRAY" >&2
  FAIL=1
fi

# 3. No candidate family names referenced in CSS/JS.
for FAMILY in 'IBM Plex Sans' 'Public Sans' 'Source Sans 3' 'Lora' 'Newsreader' 'JetBrains Mono'; do
  if grep -rl "$FAMILY" dist >/dev/null 2>&1; then
    echo "check:no-devtools FAILED — candidate family '$FAMILY' referenced in dist/" >&2
    FAIL=1
  fi
done

[ "$FAIL" -eq 0 ] || exit 1
echo "check:no-devtools OK — no dev-only code or candidate fonts in dist/"
