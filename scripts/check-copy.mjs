// Advisory sweep: flags user-facing text hardcoded in components instead of
// src/strings.ts. Scans src/app, src/components, src/screens (styleguide and
// *.test.* excluded — the styleguide is a type specimen by design).
// Run: node scripts/check-copy.mjs   (exits 1 if anything is flagged)
import { readdirSync, readFileSync, statSync } from 'node:fs'
import { join } from 'node:path'

const ROOTS = ['src/app', 'src/components', 'src/screens']
const SKIP = /styleguide|\.test\.|__pycache__/
const files = []
function walk(d) {
  for (const e of readdirSync(d)) {
    const f = join(d, e)
    if (SKIP.test(f)) continue
    if (statSync(f).isDirectory()) walk(f)
    else if (/\.(tsx|ts)$/.test(f)) files.push(f)
  }
}
ROOTS.forEach(walk)

const findings = []
for (const f of files) {
  const lines = readFileSync(f, 'utf8').split('\n')
  lines.forEach((line, i) => {
    const trimmed = line.trim()
    // comments are not rendered copy
    if (trimmed.startsWith('*') || trimmed.startsWith('//') || trimmed.startsWith('/*')) return
    // 1. Wordy attribute literals (aria-label="...", placeholder="...", title="...", label="...", alt="...")
    const attr = line.match(/(aria-label|placeholder|title|label|alt)="([^"]*[A-Za-z]{3}[^"]*)"/)
    if (attr) findings.push(`${f}:${i + 1}: attribute ${attr[1]}="${attr[2]}"`)
    // 2. JSX text nodes containing words (3+ letters), not expressions — .tsx only
    if (!f.endsWith('.tsx')) return
    const jsx = line.match(/>\s*([^<>{}\n]*[A-Za-z]{3}[^<>{}\n]*?)\s*</)
    if (jsx) findings.push(`${f}:${i + 1}: JSX text "${jsx[1].trim()}"`)
  })
}
if (findings.length) {
  console.error('User-facing text outside src/strings.ts:\n' + findings.join('\n'))
  process.exit(1)
}
console.log(`check:copy OK — no hardcoded user-facing text in ${files.length} files`)
