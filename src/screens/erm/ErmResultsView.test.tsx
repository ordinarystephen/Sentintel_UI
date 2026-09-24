/**
 * Group-by is two renderings of ONE answer store: a mutated answer must
 * change in both cuts — proven by mutating the store between renders.
 *
 * v1.8 — THE SHAPE SWITCH: a run with exactly one question renders the
 * single-question shape (Borrower · RXM · Flags · Answer, no group-by
 * toggle) in CPEA and Inquiry alike; more than one renders the monitor.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { api } from '@/api'
import type { ErmRun } from '@/api/types'
import { ERM_RUNS } from '@/api/mock/ermFixtures'
import { INQUIRY_RUNS } from '@/api/mock/inquiryFixtures'
import { ToastProvider } from '@/components/Toast'
import { INQUIRY_APP } from '@/screens/inquiry/routes'
import { ErmResultsView } from './ErmResultsView'
import { PortfolioAppContext, type PortfolioApp } from './portfolioApp'
import { CPEA_APP } from './routes'

function mount(run: ErmRun, app: PortfolioApp = CPEA_APP) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter>
          <PortfolioAppContext.Provider value={app}>
            <ErmResultsView run={run} />
          </PortfolioAppContext.Provider>
        </MemoryRouter>
      </ToastProvider>
    </QueryClientProvider>,
  )
}

describe('group-by: one answer store, two cuts', () => {
  it('a mutated answer changes in the by-borrower table AND the by-question view', async () => {
    const user = userEvent.setup()
    const run: ErmRun = structuredClone(ERM_RUNS[0])
    const a = run.answers.find((x) => x.rxm === 'RXM-5120' && x.questionId === 'hd')!
    a.value = '0.2x (mutated)'

    const view = mount(run)
    // by borrower: the cell reflects the mutation
    expect(await screen.findByText('0.2x (mutated)')).toBeInTheDocument()
    // by question: the same record, same mutation
    await user.click(screen.getByRole('tab', { name: 'By question' }))
    expect(screen.getByText('0.2x (mutated)')).toBeInTheDocument()
    // and the summary chips recompute from the same store (87/7/8 intact)
    expect(screen.getByText('87 stated')).toBeInTheDocument()
    expect(screen.getByText('7 derived')).toBeInTheDocument()
    view.unmount()
  })
})

const headers = () =>
  within(screen.getByTestId('single-question-table'))
    .getAllByRole('columnheader')
    .map((h) => h.textContent?.replace(/ [↓↑]$/, ''))

describe('the shape switch: single-question vs multi-question results', () => {
  it('Inquiry’s one-question run: Borrower · RXM · Flags · Answer, no group-by toggle', async () => {
    mount(structuredClone(INQUIRY_RUNS[0]), INQUIRY_APP)
    expect(await screen.findByTestId('single-question-table')).toBeInTheDocument()
    expect(headers()).toEqual(['Borrower', 'RXM', 'Flags', 'Answer'])
    expect(screen.queryByRole('tab', { name: 'By borrower' })).toBeNull()
    expect(screen.queryByRole('tab', { name: 'By question' })).toBeNull()
    expect(screen.queryByTestId('erm-monitor')).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Results')
    expect(screen.getByText('One-off question')).toBeInTheDocument()
    expect(
      screen.getByText(
        '"Which borrowers face refinancing risk in the next 12 months, and what drives it?"',
      ),
    ).toBeInTheDocument()
    // 4 stated · 1 derived · 1 unsupported; most flags first (Redfenn)
    expect(screen.getByText('4 stated')).toBeInTheDocument()
    expect(screen.getByText('1 derived')).toBeInTheDocument()
    const rows = screen.getAllByRole('row').filter((r) => r.hasAttribute('data-rxm'))
    expect(rows[0]).toHaveAttribute('data-rxm', 'RXM-6292')
    expect(rows).toHaveLength(6)
  })

  it('CPEA renders the SAME single-question shape for its own prompt-only runs', async () => {
    const run = structuredClone(INQUIRY_RUNS[0])
    run.runId = 'erm-run-prompt'
    mount(run, CPEA_APP)
    expect(await screen.findByTestId('single-question-table')).toBeInTheDocument()
    expect(headers()).toEqual(['Borrower', 'RXM', 'Flags', 'Answer'])
    expect(screen.queryByRole('tab', { name: 'By question' })).toBeNull()
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Portfolio monitor')
  })

  it('a question SET of exactly one question takes the single shape too (the rule is the count)', async () => {
    const set = await api.addQuestionSet('erm', {
      name: 'One-liner',
      description: '',
      questions: ['Is the latest compliance certificate on file?'],
    })
    const run = structuredClone(ERM_RUNS[0])
    run.questionSetId = set.id
    run.answers = run.population.included.map((b) => ({
      rxm: b.rxm,
      questionId: set.fields[0].id,
      value: 'Yes',
      grade: 'stated' as const,
      conf: 'high' as const,
      evidenceRefs: [
        { fileName: 'x.pdf', sectionName: 'S', page: 1, quote: 'Certificate on file.' },
      ],
    }))
    mount(run, CPEA_APP)
    expect(await screen.findByTestId('single-question-table')).toBeInTheDocument()
    expect(screen.getByText('One-liner · 1 question')).toBeInTheDocument()
    expect(screen.getByText('all stated')).toBeInTheDocument()
  })

  it('multi-question runs are untouched: the toggle and the monitor, no single table', async () => {
    mount(structuredClone(ERM_RUNS[0]), CPEA_APP)
    expect(await screen.findByTestId('erm-monitor')).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'By borrower' })).toBeInTheDocument()
    expect(screen.getByRole('tab', { name: 'By question' })).toBeInTheDocument()
    expect(screen.queryByTestId('single-question-table')).toBeNull()
    expect(screen.getByText('Quarterly credit pulse · 17 questions')).toBeInTheDocument()
    expect(screen.getByText(/102 answers/)).toBeInTheDocument()
  })
})
