import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from '@/test/renderAt'

const VEYLAND = 'rev-veyland-2026-08'
const HALCYON = 'rev-seldwyn-2026-08'

describe('review page — read path', () => {
  it('renders sticky bar, sub line, story, attention and work paper from the seam', async () => {
    renderAt(`/crr/review/${VEYLAND}`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' }),
    ).toBeInTheDocument()
    expect(screen.getByText('RXM-6430')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Export Review' })).toBeInTheDocument()
    expect(screen.getByText(/Software \(application hosting\) · sponsor-owned/)).toBeInTheDocument()
    expect(screen.getByText("Moody's B1")).toBeInTheDocument()
    expect(screen.getByText('term loan B')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Documents in this review/ })).toHaveTextContent(
      /2 · run completed \d\d:\d\d/,
    )
    expect(
      screen.getByText(/Veyland is a sponsor-owned application-hosting platform/),
    ).toBeInTheDocument()
    expect(screen.getByText('prior 5.6x → current 5.9x')).toBeInTheDocument()
    expect(screen.getByText('4 open')).toBeInTheDocument()
    expect(screen.getByText('1 reviewed')).toBeInTheDocument()
    expect(screen.getByText('6 sections · 2 populated')).toBeInTheDocument()
    expect(
      screen.getByText('This tool augments your analysis; it is not the system of record.'),
    ).toBeInTheDocument()
    // no review "type" anywhere (document kinds like "annual review" are documents, not review types)
    expect(screen.queryByText(/thematic|target review|review type/i)).toBeNull()
  })

  it('attention rows deep-link to their sections and reviewed rows show the note', async () => {
    renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1 })
    const waccLink = screen.getByRole('link', { name: /Expected Case WACC 9.8% was read below/ })
    expect(waccLink).toHaveAttribute('href', `/crr/review/${VEYLAND}#sec-2`)
    const waccRow = waccLink.closest('li')!
    expect(within(waccRow).getByText('review required')).toBeInTheDocument()
    expect(within(waccRow).getByRole('link', { name: 'Section 2 →' })).toHaveAttribute(
      'href',
      `/crr/review/${VEYLAND}#sec-2`,
    )
    const headroomRow = screen
      .getByRole('link', { name: /Covenant headroom tightening/ })
      .closest('li')!
    expect(within(headroomRow).getByText('⚑ 0.78')).toBeInTheDocument()
    expect(
      screen.getByRole('link', { name: /Confirm the springing covenant/ }).closest('li'),
    ).toHaveTextContent('Reviewed — "confirmed at 35% utilization"')
  })

  it('work paper: Financials open by default with the flagged WACC, evidence with page on the quote line, stubbed factor', async () => {
    const user = userEvent.setup()
    renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1 })
    const sec2 = screen.getByRole('button', { name: /2.*Financials/ })
    expect(sec2).toHaveAttribute('aria-expanded', 'true')
    expect(within(sec2).getByText('1 review req.')).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: /1.*Borrower \/ Counterparty & Relationship Overview/ }),
    ).toHaveAttribute('aria-expanded', 'false')

    expect(screen.getByText('conf 41% · low')).toBeInTheDocument()
    expect(screen.getByText('⚠ review required')).toBeInTheDocument()
    expect(
      screen.getByText('Read below the OCR confidence floor — the Word export flags this value.'),
    ).toBeInTheDocument()
    expect(screen.getByText('conf 94%')).toBeInTheDocument()
    expect(screen.getByText(/Liquidity Summary ·/)).toHaveTextContent('p. 14')
    expect(screen.getByText('reasoning stubbed')).toBeInTheDocument()
    expect(screen.getByText('Verdict: —')).toBeInTheDocument()
    expect(screen.getByText('6 retrieved snippet(s)')).toBeInTheDocument()

    // pending section shows its feeder note when expanded
    const sec3 = screen.getByRole('button', { name: /3.*Underwriting & Documentation/ })
    await user.click(sec3)
    expect(sec3).toHaveAttribute('aria-expanded', 'true')
    expect(
      screen.getByText(
        'TO BE POPULATED. Feeders: credit approval memo, credit agreement, underwriting file.',
      ),
    ).toBeInTheDocument()
  })

  it('source modal opens from View source with provenance and closes on Esc', async () => {
    const user = userEvent.setup()
    renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1 })
    const buttons = screen.getAllByRole('button', { name: 'View source' })
    await user.click(buttons[buttons.length - 1]) // Liquidity evidence
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('Evidence — Liquidity Summary')
    expect(dialog).toHaveTextContent('Veyland_Holdco_Q3_Update.pdf · Liquidity Summary')
    expect(dialog).toHaveTextContent('page 14')
    expect(within(dialog).getByText('section image')).toBeInTheDocument()
    expect(within(dialog).getByRole('img', { name: 'Source image' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(screen.queryByRole('dialog')).toBeNull()
  })

  it('source modal degrades neutrally when no image is available', async () => {
    const user = userEvent.setup()
    renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1 })
    await user.click(screen.getAllByRole('button', { name: 'View source' })[0]) // WACC evidence, no imageRef
    const dialog = screen.getByRole('dialog')
    expect(dialog).toHaveTextContent('The source image isn’t available for this passage.')
    expect(within(dialog).getByText('page image')).toBeInTheDocument()
  })

  it('Export Review: success toasts the file name; the failing fixture shows the message in-app', async () => {
    const user = userEvent.setup()
    const first = renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('heading', { level: 1 })
    await user.click(screen.getByRole('button', { name: 'Export Review' }))
    expect(await screen.findByRole('status')).toHaveTextContent(
      'Exported RXM-6430_Veyland_US_Holdco_LLC_Review.docx',
    )
    first.unmount()

    renderAt(`/crr/review/${HALCYON}`)
    await screen.findByRole('heading', { level: 1, name: 'Seldwyn Marine Finance' })
    await user.click(screen.getByRole('button', { name: 'Export Review' }))
    const alerts = await screen.findAllByRole('alert')
    expect(
      alerts.some((a) =>
        a.textContent?.includes(
          'Export failed: the render service returned no document for RXM-7712',
        ),
      ),
    ).toBe(true)
  })

  it("another owner's review renders", async () => {
    renderAt('/crr/review/rev-farrowdale-2026-08')
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Farrowdale Logistics' }),
    ).toBeInTheDocument()
    expect(screen.getByText('6 sections · 6 populated')).toBeInTheDocument()
  })

  it('unknown review shows the API message', async () => {
    renderAt('/crr/review/nope')
    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('No review with id nope.'),
    )
  })
})
