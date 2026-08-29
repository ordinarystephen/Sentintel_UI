import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from '@/test/renderAt'

describe('documents', () => {
  it('renders the heading, toolbar and all passages when there is no query', async () => {
    renderAt('/documents')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Documents')
    expect(
      screen.getByText(
        'Search everything Sentinel has read — every document, every parsed passage.',
      ),
    ).toBeInTheDocument()
    expect(screen.getByLabelText('Search documents')).toBeInTheDocument()
    expect(screen.getByLabelText('Line of business')).toBeInTheDocument()
    expect(screen.getByLabelText('Counterparty')).toBeInTheDocument()
    expect(screen.getByLabelText('Document type')).toBeInTheDocument()
    expect(
      await screen.findByText(/passages in \d+ documents · most recent first/),
    ).toBeInTheDocument()
  })

  it('search marks matched terms, shows provenance, a source modal, and the review deep link', async () => {
    const user = userEvent.setup()
    renderAt('/documents')
    await screen.findByText(/passages in/)
    await user.type(screen.getByLabelText('Search documents'), 'revolver availability')
    await waitFor(() =>
      expect(
        screen.getByText(/passages in \d+ documents · sorted by relevance/),
      ).toBeInTheDocument(),
    )
    // the full query settles with the Meridian Q3 liquidity passage ranked first
    await waitFor(() =>
      expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Meridian_Holdco_Q3_Update.pdf'),
    )
    const first = screen.getAllByRole('listitem')[0]
    expect(within(first).getByText('extracted')).toBeInTheDocument()
    expect(within(first).getByText('Counterparty · Meridian US Holdco')).toBeInTheDocument()
    expect(within(first).getByText('Type · quarterly update')).toBeInTheDocument()
    const marks = first.querySelectorAll('mark')
    expect(Array.from(marks).map((m) => m.textContent)).toEqual(
      expect.arrayContaining(['revolving', 'availability']),
    )
    expect(within(first).getByText(/Liquidity Summary ·/)).toHaveTextContent('p. 14')
    expect(within(first).getByRole('link', { name: 'Used in Meridian review →' })).toHaveAttribute(
      'href',
      '/review/rev-meridian-2026-08#sec-2',
    )

    await user.click(within(first).getByRole('button', { name: 'View source' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Evidence — Liquidity Summary')
    expect(dialog).toHaveTextContent('page 14')
    expect(within(dialog).getByRole('img', { name: 'Source image' })).toBeInTheDocument()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('filters hit the seam and live in the URL; advanced help toggles', async () => {
    const user = userEvent.setup()
    renderAt('/documents?lob=Wealth+Management')
    await waitFor(() =>
      expect(screen.getByText('1 passage in 1 document · most recent first')).toBeInTheDocument(),
    )
    expect(screen.getByText('Verdant_AgriChem_Credit_Submission.pdf')).toBeInTheDocument()
    await user.selectOptions(screen.getByLabelText('Line of business'), 'all')
    await user.selectOptions(screen.getByLabelText('Document type'), 'facility agreement')
    await waitFor(() =>
      expect(screen.getByText('Halcyon_Marine_Facility_Agreement.pdf')).toBeInTheDocument(),
    )
    expect(screen.getAllByRole('listitem')).toHaveLength(1)

    expect(screen.queryByText('must appear verbatim')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Advanced search' }))
    expect(screen.getByText('must appear verbatim')).toBeInTheDocument()
  })

  it('no matches shows a hand-written empty state', async () => {
    renderAt('/documents?q=zebra')
    expect(
      await screen.findByText('No passages match. Loosen a filter, or try different words.'),
    ).toBeInTheDocument()
  })
})
