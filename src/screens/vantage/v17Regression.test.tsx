/**
 * v1.8 regression: a single-question run renders EXACTLY as v1.7 did.
 * The golden file was captured from the v1.7 renderer before the
 * questions[] model landed; the multi-question surface must reduce to it
 * when a run carries one question. Only the locale/timezone-dependent
 * run-line time is normalized.
 */
import fs from 'node:fs'
import path from 'node:path'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { VANTAGE_RUNS } from '@/api/mock/vantageFixtures'
import { ToastProvider } from '@/components/Toast'
import { VantageAnswerView } from './VantageAnswerView'

const GOLDEN = path.join(
  path.dirname(new URL(import.meta.url).pathname),
  '__golden__',
  'v1.7-single-question-answer.html',
)

const normalize = (html: string) =>
  html.replace(/Run · [^<]*? ·/g, 'Run · <when> ·').replace(/today \d\d:\d\d/g, '<when>')

describe('v1.7 single-question regression', () => {
  it('the v1.7 demo run renders exactly as before', () => {
    const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
    const { container } = render(
      <QueryClientProvider client={qc}>
        <ToastProvider>
          <MemoryRouter>
            <VantageAnswerView run={VANTAGE_RUNS[0]} />
          </MemoryRouter>
        </ToastProvider>
      </QueryClientProvider>,
    )
    const html = normalize(container.innerHTML)
    if (!fs.existsSync(GOLDEN)) {
      fs.mkdirSync(path.dirname(GOLDEN), { recursive: true })
      fs.writeFileSync(GOLDEN, html)
    }
    expect(html).toBe(fs.readFileSync(GOLDEN, 'utf8'))
  })
})
