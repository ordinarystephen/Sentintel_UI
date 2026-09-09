import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from '@/test/renderAt'

const VEYLAND = 'rev-veyland-2026-08'
const rail = () => screen.getByRole('complementary', { name: 'Context' })
const heading = () => screen.findByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' })

describe('right context rail', () => {
  it('selects the first flagged item by default and shows §N Item Name with four tabs', async () => {
    renderAt(`/review/${VEYLAND}`)
    await heading()
    await waitFor(() => expect(rail()).toHaveTextContent('§2Expected Case WACC'))
    await waitFor(() =>
      expect(
        within(rail())
          .getAllByRole('tab')
          .map((t) => t.textContent),
      ).toEqual(['Why', 'Respond', 'Debate2', 'Prior']),
    )
    const wacc = screen.getByRole('button', { name: 'Select this item: Expected Case WACC' })
    expect(wacc).toHaveAttribute('aria-pressed', 'true')
    expect(
      screen
        .getAllByRole('button', { name: /^Select this item:/ })
        .filter((b) => b.getAttribute('aria-pressed') === 'true'),
    ).toHaveLength(1)
  })

  it('Why: resolution chain + applied policies for the selected item', async () => {
    renderAt(`/review/${VEYLAND}`)
    await heading()
    await waitFor(() => expect(rail()).toHaveTextContent('How this got here'))
    expect(rail()).toHaveTextContent('OCR read 9.8% below the confidence floor')
    await waitFor(() => expect(rail()).toHaveTextContent('PM-DEMO · §4.2'))
    expect(rail()).toHaveTextContent('POLICY · ib-lending/ev-support')
  })

  it('selection drives all tabs: clicking Liquidity switches the header, Why, Debate', async () => {
    const user = userEvent.setup()
    renderAt(`/review/${VEYLAND}`)
    await heading()
    await user.click(screen.getByRole('button', { name: 'Select this item: Liquidity' }))
    expect(rail()).toHaveTextContent('§2Liquidity')
    await waitFor(() => expect(rail()).toHaveTextContent('Tier 1 match'))
    expect(
      screen.getByRole('button', { name: 'Select this item: Expected Case WACC' }),
    ).toHaveAttribute('aria-pressed', 'false')
    await user.click(within(rail()).getByRole('tab', { name: /Debate/ }))
    await waitFor(() => expect(rail()).toHaveTextContent('Advocate'))
    expect(rail()).toHaveTextContent('~$144mm available against no near-term maturities')
    expect(rail()).toHaveTextContent('The analyst’s disposition decides')
  })

  it('Prior: deltas with worsening values, link to the prior review; hidden when there is no prior', async () => {
    const user = userEvent.setup()
    const first = renderAt(`/review/${VEYLAND}`)
    await heading()
    await user.click(await within(rail()).findByRole('tab', { name: 'Prior' }))
    await waitFor(() => expect(rail()).toHaveTextContent('Since the Feb 2026 review'))
    expect(rail()).toHaveTextContent('5.6x → 5.9x')
    expect(within(rail()).getByRole('link', { name: 'Open the Feb 2026 review' })).toHaveAttribute(
      'href',
      '/review/rev-veyland-2026-02',
    )
    first.unmount()

    renderAt('/review/rev-ambervale-2026-08')
    await screen.findByRole('heading', { level: 1, name: 'Ambervale Foods Group' })
    await waitFor(() => expect(within(rail()).getAllByRole('tab')).toHaveLength(3))
    expect(within(rail()).queryByRole('tab', { name: 'Prior' })).toBeNull()
  })

  it('Respond: clear with a reason strikes the item in place with the rationale chip; undo round-trips', async () => {
    const user = userEvent.setup()
    renderAt(`/review/${VEYLAND}`)
    await heading()
    await user.click(screen.getByRole('button', { name: 'Select this item: Liquidity' }))
    await user.click(within(rail()).getByRole('tab', { name: 'Respond' }))
    await user.click(within(rail()).getByRole('button', { name: 'Not applicable' }))
    // rationale is required: confirming empty shows the message and does not clear
    await user.click(within(rail()).getByRole('button', { name: 'Clear — Not applicable' }))
    expect(within(rail()).getByRole('alert')).toHaveTextContent('Add a one-line rationale')
    await user.type(
      within(rail()).getByRole('textbox', { name: 'Clear rationale' }),
      'Covered in the Q3 liquidity summary',
    )
    await user.click(within(rail()).getByRole('button', { name: 'Clear — Not applicable' }))
    const item = () => screen.getByRole('button', { name: 'Select this item: Liquidity' })
    await waitFor(() =>
      expect(item()).toHaveTextContent(
        'cleared — not applicable · struck on screen, omitted from the exported review',
      ),
    )
    expect(item()).toHaveTextContent('“Covered in the Q3 liquidity summary”')
    expect(item().className).toContain('opacity-45')
    expect(rail()).toHaveTextContent('cleared — not applicable')
    await user.click(within(rail()).getByRole('button', { name: 'undo' }))
    await waitFor(() => expect(item()).not.toHaveTextContent('cleared —'))
    expect(within(rail()).getByRole('button', { name: 'Incorrect' })).toBeInTheDocument()
  })

  it('Respond: Send & re-run flips the item to re-running, then lands the adjusted value and lifts the flag', async () => {
    const user = userEvent.setup()
    renderAt(`/review/${VEYLAND}`)
    await heading()
    await user.click(within(rail()).getByRole('tab', { name: 'Respond' }))
    await user.type(
      within(rail()).getByRole('textbox', { name: 'Respond to Sentinel' }),
      'Use 9.6% from the prior review',
    )
    await user.click(within(rail()).getByRole('button', { name: 'Send & re-run' }))
    const wacc = () => screen.getByRole('button', { name: 'Select this item: Expected Case WACC' })
    await waitFor(() => expect(wacc()).toHaveTextContent('re-running…'))
    await waitFor(() => expect(wacc()).toHaveTextContent('9.6%'), { timeout: 5000 })
    expect(wacc()).not.toHaveTextContent('⚠ review required')
    expect(wacc()).toHaveTextContent('conf 93%')
    expect(rail()).toHaveTextContent('Sent: “Use 9.6% from the prior review”')
  }, 10_000)

  it('Mark verified lifts the review-required treatment and resolves the attention row', async () => {
    const user = userEvent.setup()
    renderAt(`/review/${VEYLAND}`)
    await heading()
    await user.click(within(rail()).getByRole('tab', { name: 'Respond' }))
    await user.click(within(rail()).getByRole('button', { name: 'Mark verified' }))
    const wacc = () => screen.getByRole('button', { name: 'Select this item: Expected Case WACC' })
    await waitFor(() => expect(wacc()).not.toHaveTextContent('⚠ review required'))
    expect(within(wacc()).getByText('verified')).toBeInTheDocument()
    expect(
      screen.getByText(/Expected Case WACC 9.8% was read below/).closest('li'),
    ).toHaveTextContent('Reviewed — "Marked verified"')
  })

  it('is keyboard-reachable: arrow keys move between tabs; Enter selects an item', async () => {
    const user = userEvent.setup()
    renderAt(`/review/${VEYLAND}`)
    await heading()
    const why = await within(rail()).findByRole('tab', { name: 'Why' })
    why.focus()
    await user.keyboard('{ArrowRight}')
    expect(within(rail()).getByRole('tab', { name: 'Respond' })).toHaveAttribute(
      'aria-selected',
      'true',
    )
    expect(within(rail()).getByRole('tab', { name: 'Respond' })).toHaveFocus()
    const liq = screen.getByRole('button', { name: 'Select this item: Liquidity' })
    liq.focus()
    await user.keyboard('{Enter}')
    expect(liq).toHaveAttribute('aria-pressed', 'true')
  })

  it('read-only review: no dispositions, no clearing, and the rail says so', async () => {
    const user = userEvent.setup()
    renderAt('/review/rev-farrowdale-2026-08')
    await screen.findByRole('heading', { level: 1, name: 'Farrowdale Logistics' })
    expect(screen.getByText(/Read-only — this review belongs to R. Chen/)).toBeInTheDocument()
    await user.click(within(rail()).getByRole('tab', { name: 'Respond' }))
    expect(within(rail()).queryByRole('button', { name: 'Send & re-run' })).toBeNull()
    expect(within(rail()).queryByRole('button', { name: 'Not applicable' })).toBeNull()
    expect(rail()).toHaveTextContent('Read-only — this review belongs to R. Chen')
  })
})

describe('attention dispositions', () => {
  it('mark reviewed with a note, edit the note, un-review; dismiss is flags-only', async () => {
    const user = userEvent.setup()
    renderAt(`/review/${VEYLAND}`)
    await heading()
    expect(screen.queryByRole('button', { name: /^Dismiss flag: Expected Case WACC/ })).toBeNull()
    expect(
      screen.getByRole('button', { name: 'Dismiss flag: Covenant headroom tightening' }),
    ).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Mark reviewed: Customer concentration' }))
    await user.type(
      screen.getByRole('textbox', { name: 'Review note' }),
      'Concentration unchanged from FY24',
    )
    await user.click(screen.getByRole('button', { name: 'Save' }))
    const row = () => screen.getByText('Customer concentration').closest('li')!
    await waitFor(() =>
      expect(row()).toHaveTextContent('Reviewed — "Concentration unchanged from FY24"'),
    )
    expect(screen.getByText('3 open')).toBeInTheDocument()
    expect(screen.getByText('2 reviewed')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Edit note: Customer concentration' }))
    const input = screen.getByRole('textbox', { name: 'Review note' })
    await user.clear(input)
    await user.type(input, 'Edited note')
    await user.click(screen.getByRole('button', { name: 'Save' }))
    await waitFor(() => expect(row()).toHaveTextContent('Reviewed — "Edited note"'))

    await user.click(screen.getByRole('button', { name: 'Un-review: Customer concentration' }))
    await waitFor(() => expect(screen.getByText('4 open')).toBeInTheDocument())

    await user.click(
      screen.getByRole('button', { name: 'Dismiss flag: Covenant headroom tightening' }),
    )
    await waitFor(() =>
      expect(screen.getByText('Covenant headroom tightening').closest('li')).toHaveTextContent(
        'Dismissed',
      ),
    )
    expect(screen.getByText('3 open')).toBeInTheDocument()
  })
})
