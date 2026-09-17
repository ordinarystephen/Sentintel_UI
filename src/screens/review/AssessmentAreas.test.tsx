import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from '@/test/renderAt'

const VEYLAND = 'rev-veyland-2026-08'
const zoneHeader = () => screen.getByRole('button', { name: /Areas of assessment/ })

describe('areas of assessment', () => {
  it('renders between attention and work paper with badge + tally; folding keeps the header line', async () => {
    const user = userEvent.setup()
    renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' })
    expect(zoneHeader()).toHaveTextContent('1 pending')
    expect(zoneHeader()).toHaveTextContent('8 areas · 6 satisfactory · 1 n/a')
    expect(zoneHeader()).toHaveAttribute('aria-expanded', 'true')
    await user.click(zoneHeader())
    expect(zoneHeader()).toHaveAttribute('aria-expanded', 'false')
    expect(zoneHeader()).toHaveTextContent('1 pending') // folded summary never goes stale
  })

  it('pending row opens by default, names its blocker, links to the section, and takes a verdict that updates badge + tally live', async () => {
    const user = userEvent.setup()
    renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1 })
    const pendingRow = screen.getByRole('button', {
      name: /Repayment Capacity — Secondary Sources/,
    })
    expect(pendingRow).toHaveAttribute('aria-expanded', 'true')
    expect(pendingRow).toHaveTextContent('pending')
    expect(screen.getByText(/Expected Case WACC input remains unverified/)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Resolve in Section 2 →' })).toHaveAttribute(
      'href',
      `/crr/review/${VEYLAND}#sec-2`,
    )

    // a satisfactory row is closed; expanding shows its supporting link
    const pdRow = screen.getByRole('button', { name: /Probability of Default Assessment/ })
    expect(pdRow).toHaveAttribute('aria-expanded', 'false')
    await user.click(pdRow)
    expect(screen.getAllByRole('link', { name: 'Supporting: Section 5 →' }).length).toBeGreaterThan(
      0,
    )

    await user.click(screen.getByRole('button', { name: 'Satisfactory' }))
    await waitFor(() => expect(zoneHeader()).toHaveTextContent('8 areas · 7 satisfactory · 1 n/a'))
    expect(zoneHeader()).not.toHaveTextContent('pending')
    expect(
      within(
        screen.getByRole('button', { name: /Repayment Capacity — Secondary Sources/ }),
      ).getByText('satisfactory'),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Satisfactory' })).toBeNull()
  })

  it('the verdict survives a fresh mount (recorded like any disposition)', async () => {
    const user = userEvent.setup()
    const first = renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1 })
    await user.click(screen.getByRole('button', { name: 'Unsatisfactory' }))
    await waitFor(() => expect(zoneHeader()).toHaveTextContent('1 unsatisfactory'))
    first.unmount()
    renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1 })
    await waitFor(() =>
      expect(zoneHeader()).toHaveTextContent('8 areas · 6 satisfactory · 1 unsatisfactory · 1 n/a'),
    )
  })

  it('a completed review renders its fully-rated zone: no pending badge, 7 sat + 1 n/a', async () => {
    renderAt('/crr/review/rev-ambervale-2026-08')
    await screen.findByRole('heading', { level: 1, name: 'Ambervale Foods Group' })
    const header = screen.getByRole('button', { name: /Areas of assessment/ })
    expect(header).toHaveTextContent('8 areas · 7 satisfactory · 1 n/a')
    expect(header).not.toHaveTextContent('pending')
    expect(screen.queryByRole('button', { name: 'Satisfactory' })).toBeNull()
  })

  it('a read-only review shows ratings and reasons but no action buttons', async () => {
    const user = userEvent.setup()
    renderAt('/crr/review/rev-farrowdale-2026-08')
    await screen.findByRole('heading', { level: 1, name: 'Farrowdale Logistics' })
    const header = screen.getByRole('button', { name: /Areas of assessment/ })
    expect(header).toHaveTextContent('8 areas · 7 satisfactory · 1 n/a')
    // §4 is now also titled 'Portfolio Management' — target the AREA row (its name includes the rating)
    await user.click(screen.getByRole('button', { name: /Portfolio Management satisfactory/ }))
    expect(
      screen.getByText(/Required monitoring practices are adequate and timely/),
    ).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Satisfactory' })).toBeNull()
    expect(screen.queryByRole('button', { name: 'Unsatisfactory' })).toBeNull()
  })
})

describe('older-schema guard', () => {
  it('a review object missing `areas`/`referenceData` renders neither zone (absent feature, not a crash)', async () => {
    const { render, screen: scr } = await import('@testing-library/react')
    const { MemoryRouter } = await import('react-router-dom')
    const { AssessmentAreas } = await import('./AssessmentAreas')
    const { ReferenceDataBlock } = await import('./ReferenceDataBlock')
    const { ReviewScreenContext } = await import('./reviewContext')
    const { api } = await import('@/api')
    const legacy = (await api.getReview('rev-veyland-2026-08')) as import('@/api/types').Review
    // simulate a record persisted before v1.0: the fields simply aren't there
    delete (legacy as Partial<import('@/api/types').Review>).areas
    delete (legacy as Partial<import('@/api/types').Review>).referenceData
    const ctx = { reviewId: legacy.id, canEdit: true, actions: {} as never }
    render(
      <MemoryRouter>
        <ReviewScreenContext.Provider value={ctx}>
          <AssessmentAreas review={legacy} />
          <ReferenceDataBlock review={legacy} />
        </ReviewScreenContext.Provider>
      </MemoryRouter>,
    )
    expect(scr.queryByRole('button', { name: /Areas of assessment/ })).toBeNull()
    expect(scr.queryByRole('button', { name: /Reference data/ })).toBeNull()
  })
})

describe('reference data', () => {
  it('collapsed disclosure under the sub line; expands to the grid with origin chips; absent when a review has none', async () => {
    const user = userEvent.setup()
    const first = renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1 })
    const toggle = screen.getByRole('button', { name: /Reference data/ })
    expect(toggle).toHaveTextContent('upstream · as of 2026-08-15')
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
    await user.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')
    expect(screen.getByText('Reference number')).toBeInTheDocument()
    expect(screen.getByText(/3117-04/)).toBeInTheDocument()
    expect(screen.getAllByText('CRR')).toHaveLength(2)
    expect(screen.getAllByText('upstream')).toHaveLength(4)
    expect(screen.getByText(/TLB 71834/)).toBeInTheDocument()
    first.unmount()

    renderAt('/crr/review/rev-ambervale-2026-08')
    await screen.findByRole('heading', { level: 1, name: 'Ambervale Foods Group' })
    expect(screen.queryByRole('button', { name: /Reference data/ })).toBeNull()
  })
})
