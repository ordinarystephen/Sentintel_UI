import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from '@/test/renderAt'

const HINT =
  '20 documents · 10 borrowers — click a borrower to expand · keyword queries still search every parsed passage'
const veylandGroup = () => screen.getByRole('button', { name: /Veyland US Holdco RXM-6430/ })
const q3Row = () =>
  screen.getByRole('button', { name: 'Select document: Veyland_Holdco_Q3_Update.pdf' })

describe('documents — browse state (no query): borrower groups', () => {
  it('groups by borrower, largest first open; rows carry filename, badge, date — no preview text', async () => {
    const user = userEvent.setup()
    renderAt('/crr/documents')
    expect(await screen.findByText(HINT)).toBeInTheDocument()
    // largest group (Ambervale, 5 docs) is open by default; others closed
    expect(screen.getByText('Ambervale_Foods_Q2_Performance_Update.pdf')).toBeInTheDocument()
    expect(screen.queryByText('Veyland_Holdco_Q3_Update.pdf')).toBeNull()
    await user.click(veylandGroup())
    const row = q3Row()
    expect(within(row).getByText('extracted')).toBeInTheDocument()
    expect(within(row).getByText('2026-07-15')).toBeInTheDocument()
    // no snippets, no marks, no per-passage provenance in browse
    expect(screen.queryByText(/revolving credit facility remains undrawn/)).toBeNull()
    expect(document.querySelector('mark')).toBeNull()
    // collapsing hides the group's rows again
    await user.click(veylandGroup())
    expect(screen.queryByText('Veyland_Holdco_Q3_Update.pdf')).toBeNull()
  })

  it('selects a single row and reveals the action bar; deep link + raw viewer included', async () => {
    const user = userEvent.setup()
    renderAt('/crr/documents')
    await screen.findByText(HINT)
    await user.click(veylandGroup())
    await user.click(q3Row())
    expect(q3Row()).toHaveAttribute('aria-pressed', 'true')
    expect(screen.getByRole('button', { name: 'Preview extracted text' })).toBeEnabled()
    expect(screen.getByRole('button', { name: 'Download original' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Raw document' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Used in Veyland review →' })).toHaveAttribute(
      'href',
      '/crr/review/rev-veyland-2026-08#sec-2',
    )
  })

  it('not-yet-extracted documents show the preview action disabled', async () => {
    const user = userEvent.setup()
    renderAt('/crr/documents')
    await screen.findByText(HINT)
    await user.click(screen.getByRole('button', { name: /Farrowdale Logistics RXM-8093/ }))
    await user.click(
      screen.getByRole('button', { name: 'Select document: Farrowdale_Logistics_Q2_Update.pdf' }),
    )
    const previewBtn = screen.getByRole('button', { name: 'Preview extracted text' })
    expect(previewBtn).toBeDisabled()
    expect(previewBtn).toHaveAttribute('title', 'Available once extraction completes')
    expect(screen.getByRole('button', { name: 'Download original' })).toBeEnabled()
  })

  it('preview modal: title, meta row, collapsible sections with page ranges, first open; Esc closes', async () => {
    const user = userEvent.setup()
    renderAt('/crr/documents')
    await screen.findByText(HINT)
    await user.click(veylandGroup())
    await user.click(q3Row())
    await user.click(screen.getByRole('button', { name: 'Preview extracted text' }))
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Veyland_Holdco_Q3_Update.pdf — extracted text')
    await waitFor(() => expect(dialog).toHaveTextContent('15 pages')) // seam data arrives async
    expect(dialog).toHaveTextContent('parsed 2026-08-28')
    expect(within(dialog).getByText('extracted')).toBeInTheDocument()
    expect(dialog).toHaveTextContent('5 sections')
    const first = within(dialog).getByRole('button', { name: /Highlights/ })
    expect(first).toHaveAttribute('aria-expanded', 'true')
    expect(dialog).toHaveTextContent('Two enterprise renewals slipped from Q3 into Q4')
    const liq = within(dialog).getByRole('button', { name: /Liquidity Summary/ })
    expect(liq).toHaveAttribute('aria-expanded', 'false')
    expect(liq).toHaveTextContent('pp. 14–15')
    await user.click(liq)
    expect(liq).toHaveAttribute('aria-expanded', 'true')
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })
})

describe('documents — search state (query non-empty)', () => {
  it('hit cards with matched passages and marked terms replace the grouped browse', async () => {
    const user = userEvent.setup()
    renderAt('/crr/documents')
    await screen.findByText(HINT)
    await user.type(screen.getByLabelText('Search documents'), 'revolver availability')
    await waitFor(() =>
      expect(
        screen.getByText(/passages in \d+ documents · sorted by relevance/),
      ).toBeInTheDocument(),
    )
    await waitFor(() =>
      expect(screen.getAllByRole('listitem')[0]).toHaveTextContent('Veyland_Holdco_Q3_Update.pdf'),
    )
    expect(screen.queryByRole('button', { name: /^Select document:/ })).toBeNull()
    const first = screen.getAllByRole('listitem')[0]
    expect(Array.from(first.querySelectorAll('mark')).map((m) => m.textContent)).toEqual(
      expect.arrayContaining(['revolving', 'availability']),
    )
    expect(within(first).getByText(/Liquidity Summary ·/)).toHaveTextContent('p. 14')
    expect(within(first).getByRole('link', { name: 'Used in Veyland review →' })).toHaveAttribute(
      'href',
      '/crr/review/rev-veyland-2026-08#sec-2',
    )
    expect(within(first).getByRole('button', { name: 'View source' })).toBeInTheDocument()
    // clearing the query returns to the grouped view
    await user.clear(screen.getByLabelText('Search documents'))
    expect(await screen.findByText(HINT)).toBeInTheDocument()
  })

  it('the counterparty filter narrows browse groups; advanced help toggles', async () => {
    const user = userEvent.setup()
    renderAt('/crr/documents')
    await screen.findByText(HINT)
    await user.selectOptions(screen.getByLabelText('Counterparty'), 'Verloway AgriChem')
    await waitFor(() =>
      expect(
        screen.getByRole('button', { name: /Verloway AgriChem RXM-2210/ }),
      ).toBeInTheDocument(),
    )
    expect(screen.queryByRole('button', { name: /Veyland US Holdco/ })).toBeNull()

    expect(screen.queryByText('must appear verbatim')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Advanced search' }))
    expect(screen.getByText('must appear verbatim')).toBeInTheDocument()
  })

  it('no matches shows a hand-written empty state', async () => {
    renderAt('/crr/documents?q=zebra')
    expect(
      await screen.findByText('No passages match. Loosen a filter, or try different words.'),
    ).toBeInTheDocument()
  })
})
