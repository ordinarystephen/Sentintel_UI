/**
 * THE INQUIRY ROUTE GUARD (demo feedback round — the build constraint):
 * Inquiry is CPEA with a configuration flag off, not copied screens — and
 * no question-set control may be reachable from Inquiry's route
 * configuration. This walks the STATIC import graph from
 * src/screens/inquiry/routes.ts (every `import … from` / `export … from`,
 * resolving `@/` and relative specifiers) and fails if any question-set
 * control module is in it.
 *
 * The walker is proven live against CPEA's route configuration, where the
 * control MUST be reachable — a walker that found nothing would otherwise
 * pass this guard vacuously.
 */
import fs from 'node:fs'
import path from 'node:path'
import { describe, expect, it } from 'vitest'
import { APPS } from '@/apps'
import { INQUIRY_APP } from './routes'

const SRC = path.resolve(path.dirname(new URL(import.meta.url).pathname), '../..')

/** The question-set control's modules — nothing Inquiry reaches may be one of these. */
const CONTROL = [
  'components/questionSets/QuestionSetControl.tsx',
  'components/questionSets/AddQuestionSetModal.tsx',
  'screens/erm/CpeaQuestionSets.tsx',
]

function resolve(from: string, spec: string): string | null {
  let base: string
  if (spec.startsWith('@/')) base = path.join(SRC, spec.slice(2))
  else if (spec.startsWith('.')) base = path.resolve(path.dirname(from), spec)
  else return null // a package — outside the app's own graph
  for (const candidate of [
    base,
    `${base}.ts`,
    `${base}.tsx`,
    path.join(base, 'index.ts'),
    path.join(base, 'index.tsx'),
  ])
    if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) return candidate
  throw new Error(`unresolved import "${spec}" from ${path.relative(SRC, from)}`)
}

/** Every app module statically reachable from `entry` (type-only imports included — stricter). */
function reachable(entry: string): Set<string> {
  const seen = new Set<string>()
  const queue = [path.join(SRC, entry)]
  const IMPORT = /(?:^|\n)\s*(?:import|export)\s[^;]*?\sfrom\s+['"]([^'"]+)['"]/g
  const BARE = /(?:^|\n)\s*import\s+['"]([^'"]+)['"]/g
  while (queue.length) {
    const file = queue.pop()!
    if (seen.has(file)) continue
    seen.add(file)
    const text = fs.readFileSync(file, 'utf8')
    for (const re of [IMPORT, BARE])
      for (const m of text.matchAll(re)) {
        const next = resolve(file, m[1])
        if (next && !seen.has(next)) queue.push(next)
      }
  }
  return new Set([...seen].map((f) => path.relative(SRC, f)))
}

describe('the Inquiry route guard', () => {
  it('no question-set control import is reachable from the Inquiry route configuration', () => {
    const graph = reachable('screens/inquiry/routes.ts')
    // the walk really covered the shared CPEA screens Inquiry mounts…
    expect(graph).toContain('screens/erm/ErmStartScreen.tsx')
    expect(graph).toContain('screens/erm/ErmResultsView.tsx')
    expect(graph).toContain('screens/erm/SingleQuestionTable.tsx')
    // …and reached no part of the question-set control
    expect(CONTROL.filter((m) => graph.has(m))).toEqual([])
    expect([...graph].filter((m) => m.includes('questionSets/'))).toEqual([])
  })

  it('the walker is live: CPEA’s route configuration DOES reach the control', () => {
    const graph = reachable('screens/erm/routes.ts')
    for (const m of CONTROL) expect(graph).toContain(m)
  })

  it('Inquiry is configuration, not a copy: the registry flag is off and no slot is wired', () => {
    expect(APPS.find((a) => a.id === 'inquiry')?.config).toEqual({ questionSets: false })
    expect(APPS.find((a) => a.id === 'erm')?.config).toEqual({ questionSets: true })
    expect(INQUIRY_APP.config.questionSets).toBe(false)
    expect(INQUIRY_APP.slots.QuestionSets).toBeUndefined()
    // no screens of its own: Inquiry's folder holds route configuration only
    const own = fs
      .readdirSync(path.join(SRC, 'screens/inquiry'))
      .filter((f) => !f.endsWith('.test.ts'))
    expect(own).toEqual(['routes.ts'])
  })
})
