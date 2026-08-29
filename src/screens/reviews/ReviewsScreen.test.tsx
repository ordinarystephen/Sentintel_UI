import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from '@/test/renderAt'

describe('reviews — My', () => {
  it('lists my reviews with open-items badge or sections complete and a relative date', async () => {
    renderAt('/reviews')
    const meridian = await screen.findByRole('link', { name: /Meridian US Holdco LLC/ })
    expect(within(meridian).getByText('4 open')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Atlas Foods Group/ })).toHaveTextContent(
      '6/6 sections',
    )
    expect(screen.queryByRole('link', { name: /Crestline Logistics/ })).toBeNull()
    expect(screen.queryByLabelText('Line of business')).toBeNull()
  })
})

describe('reviews — All', () => {
  it('toolbar first, count line, read-only note, rows with owner / read-only / LOB / absolute timestamp / repeat chip', async () => {
    renderAt('/reviews/all')
    expect(screen.getByLabelText('Search reviews')).toBeInTheDocument()
    expect(screen.getByLabelText('Line of business')).toBeInTheDocument()
    expect(screen.getByLabelText('Owner')).toBeInTheDocument()
    expect(screen.getByLabelText('Period')).toBeInTheDocument()
    await screen.findByText(/^\d+ reviews · showing most recent$/)
    expect(
      screen.getByText('Team view — open any review to read it; editing stays with its owner.'),
    ).toBeInTheDocument()

    const meridian = screen.getAllByRole('link', { name: /Meridian US Holdco LLC/ })[0] // newest first
    expect(within(meridian).getByText('you')).toBeInTheDocument()
    expect(within(meridian).getByText('2nd in 12 mo')).toBeInTheDocument()
    expect(within(meridian).getByText('IB')).toBeInTheDocument()
    expect(within(meridian).getByText('2026-08-28')).toBeInTheDocument()
    const crestline = screen.getAllByRole('link', { name: /Crestline Logistics/ })[0]
    expect(within(crestline).getByText('R. Chen')).toBeInTheDocument()
    expect(within(crestline).getByText('read-only')).toBeInTheDocument()
    expect(
      within(screen.getByRole('link', { name: /Verdant AgriChem/ })).getByText('WM'),
    ).toBeInTheDocument()
  })

  it('filters execute against the seam and live in the URL', async () => {
    const user = userEvent.setup()
    renderAt('/reviews/all')
    await screen.findByText(/reviews · showing most recent/)
    await user.selectOptions(screen.getByLabelText('Line of business'), 'Wealth Management')
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Verdant AgriChem/ })).toBeInTheDocument(),
    )
    await waitFor(() => expect(screen.queryAllByRole('link', { name: /Meridian/ })).toHaveLength(0))
    const links = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href')?.startsWith('/review/'))
    expect(links.every((l) => l.textContent?.includes('WM'))).toBe(true)

    await user.selectOptions(screen.getByLabelText('Line of business'), 'all')
    await user.type(screen.getByLabelText('Search reviews'), 'cl6430')
    await waitFor(() =>
      expect(screen.getByText('2 reviews · showing most recent')).toBeInTheDocument(),
    )
    expect(screen.getAllByRole('link', { name: /Meridian US Holdco LLC/ })).toHaveLength(2)

    await user.clear(screen.getByLabelText('Search reviews'))
    await user.selectOptions(screen.getByLabelText('Owner'), 'u-chen')
    await waitFor(() => expect(screen.queryAllByRole('link', { name: /Meridian/ })).toHaveLength(0))
    await waitFor(() =>
      expect(screen.getAllByRole('link', { name: /Crestline Logistics/ })[0]).toBeInTheDocument(),
    )
    const rows = screen
      .getAllByRole('link')
      .filter((l) => l.getAttribute('href')?.startsWith('/review/'))
    expect(rows.every((l) => l.textContent?.includes('R. Chen'))).toBe(true)
  })

  it('period: last 12 months is the default; all time shows more', async () => {
    const user = userEvent.setup()
    renderAt('/reviews/all')
    const count = () =>
      Number(
        /^(\d+) reviews/.exec(
          screen.getByText(/reviews · showing most recent/).textContent ?? '',
        )?.[1],
      )
    await screen.findByText(/reviews · showing most recent/)
    const recent = count()
    await user.selectOptions(screen.getByLabelText('Period'), 'all')
    await waitFor(() => expect(count()).toBeGreaterThan(recent))
  })

  it('restores filters from the URL', async () => {
    renderAt('/reviews/all?lob=Wealth+Management&owner=u-alvarez')
    expect(screen.getByLabelText('Line of business')).toHaveValue('Wealth Management')
    await waitFor(() => expect(screen.getByLabelText('Owner')).toHaveValue('u-alvarez'))
    await waitFor(() =>
      expect(screen.getByRole('link', { name: /Verdant AgriChem/ })).toBeInTheDocument(),
    )
    expect(screen.queryByRole('link', { name: /Crestline/ })).toBeNull()
  })

  it('no matches shows a hand-written empty state', async () => {
    renderAt('/reviews/all?q=zebra')
    expect(
      await screen.findByText('No reviews match. Try a borrower name, a CL number, or a sector.'),
    ).toBeInTheDocument()
  })
})
