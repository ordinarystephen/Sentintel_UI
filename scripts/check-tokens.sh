#!/usr/bin/env sh
# Color discipline (build-spec §3.1, Phase 0 acceptance): no raw color literals
# anywhere outside src/styles/tokens.css. Components use semantic Tailwind classes
# (bg-bg, text-ink, border-rule, ...) or var(--token); never hex/rgb/hsl.
set -eu
cd "$(dirname "$0")/.."
if grep -rnE \
  --include='*.ts' --include='*.tsx' --include='*.css' --include='*.html' \
  --exclude='tokens.css' \
  -e '#[0-9a-fA-F]{3,8}\b' -e '\brgba?\(' -e '\bhsla?\(' \
  src index.html; then
  echo "check:tokens FAILED — raw color literal outside src/styles/tokens.css" >&2
  exit 1
fi
echo "check:tokens OK — no raw color literals outside src/styles/tokens.css"
