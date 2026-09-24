/**
 * Group-by is two renderings of ONE answer store: a mutated answer must
 * change in both cuts — proven by mutating the store between renders.
 *
 * v1.8 — THE SHAPE SWITCH: a run with exactly one question renders the
 * single-question shape (Borrower · RXM · Flags · Answer, no group-by
 * toggle) in CPEA and Inquiry alike; more than one renders the monitor.
 *
 * Keyboard (hygiene sweep): the monitor's rows are Tab stops that Enter /
 * Space expand, Detail & evidence follows its row and gets focus back from
 * the modal, and every header is a sort button (the shared SortHeader).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { fireEvent, render, screen, within } from '@testing-library/react'
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

const dataRows = () =>
  within(screen.getByTestId('erm-monitor'))
    .getAllByRole('row')
    .filter((r) => r.hasAttribute('data-rxm'))

describe('keyboard: the multi-question monitor', () => {
  it('rows are Tab stops; Enter expands (aria-expanded + aria-controls), Space collapses', async () => {
    const user = userEvent.setup()
    mount(structuredClone(ERM_RUNS[0]))
    await screen.findByTestId('erm-monitor')
    for (const r of dataRows()) {
      expect(r).toHaveAttribute('tabindex', '0')
      expect(r).toHaveAttribute('aria-expanded', 'false')
      expect(r).not.toHaveAttribute('aria-controls')
    }
    const row = dataRows()[0]
    expect(row).toHaveAttribute('data-rxm', 'RXM-6292') // most flags first
    // a focused row announces its borrower, not an empty "row"
    expect(row).toHaveAccessibleName('Redfenn Timber Holdings')
    row.focus()
    await user.keyboard('{Enter}')
    expect(row).toHaveAttribute('aria-expanded', 'true')
    const x = document.querySelector('[data-expansion="RXM-6292"]')!
    expect(x.id).not.toBe('')
    expect(row).toHaveAttribute('aria-controls', x.id)
    // Space is handled (default prevented — no canvas scroll) and toggles back
    expect(fireEvent.keyDown(row, { key: ' ' })).toBe(false)
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(row).not.toHaveAttribute('aria-controls')
    expect(document.querySelector('[data-expansion="RXM-6292"]')).toBeNull()
  })

  it('keys pressed inside the row (not on it) keep their own behaviour', async () => {
    mount(structuredClone(ERM_RUNS[0]))
    await screen.findByTestId('erm-monitor')
    const row = dataRows()[0]
    expect(fireEvent.keyDown(within(row).getAllByRole('cell')[0], { key: 'Enter' })).toBe(true)
    expect(row).toHaveAttribute('aria-expanded', 'false')
    expect(document.querySelector('[data-expansion]')).toBeNull()
  })

  it('Detail & evidence is the next Tab stop; the modal hands focus back to it on Escape', async () => {
    const user = userEvent.setup()
    mount(structuredClone(ERM_RUNS[0]))
    await screen.findByTestId('erm-monitor')
    const [row, next] = dataRows()
    row.focus()
    await user.keyboard('{Enter}')
    await user.tab()
    const detail = screen.getByRole('button', { name: 'Detail & evidence →' })
    expect(detail).toHaveFocus()
    await user.keyboard('{Enter}')
    const dialog = screen.getByRole('dialog', {
      name: /^Redfenn Timber Holdings — covenant headroom/,
    })
    expect(within(dialog).getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
    expect(detail).toHaveFocus()
    await user.tab({ shift: true })
    expect(row).toHaveFocus()
    await user.tab()
    await user.tab()
    expect(next).toHaveFocus()
  })

  it('every header is a sort button: Enter / Space sort, aria-sort follows, focus stays', async () => {
    const user = userEvent.setup()
    mount(structuredClone(ERM_RUNS[0]))
    const table = await screen.findByTestId('erm-monitor')
    const ths = within(table).getAllByRole('columnheader')
    for (const th of ths) expect(within(th).getByRole('button')).toBeInTheDocument()
    const borrower = within(table).getByRole('columnheader', { name: /^Borrower/ })
    const flags = within(table).getByRole('columnheader', { name: /^Flags/ })
    expect(flags).toHaveAttribute('aria-sort', 'descending')
    expect(borrower).not.toHaveAttribute('aria-sort')
    const button = within(borrower).getByRole('button')
    button.focus()
    await user.keyboard('{Enter}') // a new column starts descending
    expect(borrower).toHaveAttribute('aria-sort', 'descending')
    expect(flags).not.toHaveAttribute('aria-sort')
    expect(dataRows()[0]).toHaveAttribute('data-rxm', 'RXM-6430') // Veyland
    await user.keyboard(' ')
    expect(borrower).toHaveAttribute('aria-sort', 'ascending')
    expect(dataRows()[0]).toHaveAttribute('data-rxm', 'RXM-5120') // Ambervale
    expect(button).toHaveFocus()
  })
})
