import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { BorrowerGroups } from './BorrowerGroups'

const groups = [
  { borrower: { rxm: 'RXM-5120', name: 'Ambervale Foods Group' }, docs: ['a.pdf', 'b.pdf'] },
  { borrower: { rxm: 'RXM-4100', name: 'Torvane Aggregates' }, docs: ['c.pdf'] },
]

describe('borrower groups: the header action (demo feedback round)', () => {
  it('runs for its own borrower and NEVER toggles the group', async () => {
    const user = userEvent.setup()
    const asked = vi.fn()
    render(
      <BorrowerGroups
        groups={groups}
        renderDoc={(d) => <p key={d}>{d}</p>}
        headerAction={(b) => (
          <button type="button" onClick={() => asked(b.rxm)}>
            ask {b.name}
          </button>
        )}
      />,
    )
    const ambervale = screen.getByRole('button', { name: /Ambervale Foods Group/, expanded: true })
    const torvane = screen.getByRole('button', { name: /Torvane Aggregates/, expanded: false })
    await user.click(screen.getByRole('button', { name: 'ask Ambervale Foods Group' }))
    await user.click(screen.getByRole('button', { name: 'ask Torvane Aggregates' }))
    expect(asked.mock.calls).toEqual([['RXM-5120'], ['RXM-4100']])
    // neither group changed state
    expect(ambervale).toHaveAttribute('aria-expanded', 'true')
    expect(torvane).toHaveAttribute('aria-expanded', 'false')
    expect(screen.getByText('a.pdf')).toBeInTheDocument()
    expect(screen.queryByText('c.pdf')).toBeNull()
  })

  it('without a header action the header is the one toggle button, as before', () => {
    render(<BorrowerGroups groups={groups} renderDoc={(d) => <p key={d}>{d}</p>} />)
    expect(screen.getAllByRole('button')).toHaveLength(2)
  })
})
