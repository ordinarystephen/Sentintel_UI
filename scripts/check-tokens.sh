#!/usr/bin/env sh
# Color discipline (build-spec §3.1, Phase 0 acceptance): no raw color literals
# anywhere outside src/styles/tokens.css. Components use semantic Tailwind classes
# (bg-bg, text-ink, border-rule, ...) or var(--token); never hex/rgb/hsl.
set -eu
cd "$(dirname "$0")/.."
# why --exclude-dir=dev: src/dev/ holds dev-only instruments that are mounted
# behind import.meta.env.DEV and never ship. They are deliberately styled
# OUTSIDE the design system — a panel for testing the design system must not
# restyle itself when the thing under test changes, and it has to stay legible
# against whatever it is being used to judge. scripts/check-no-devtools.sh
# enforces that none of it reaches dist/.
if grep -rnE \
  --include='*.ts' --include='*.tsx' --include='*.css' --include='*.html' \
  --exclude='tokens.css' --exclude-dir='dev' \
  -e '#[0-9a-fA-F]{3,8}\b' -e '\brgba?\(' -e '\bhsla?\(' \
  src index.html; then
  echo "check:tokens FAILED — raw color literal outside src/styles/tokens.css" >&2
  exit 1
fi
echo "check:tokens OK — no raw color literals outside src/styles/tokens.css"
