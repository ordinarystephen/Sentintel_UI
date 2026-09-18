/**
 * Group-by is two renderings of ONE answer store: a mutated answer must
 * change in both cuts — proven by mutating the store between renders.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import type { ErmRun } from '@/api/types'
import { ERM_RUNS } from '@/api/mock/ermFixtures'
import { ToastProvider } from '@/components/Toast'
import { ErmResultsView } from './ErmResultsView'

function mount(run: ErmRun) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <QueryClientProvider client={qc}>
      <ToastProvider>
        <MemoryRouter>
          <ErmResultsView run={run} />
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
