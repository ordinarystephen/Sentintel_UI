import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { Modal } from './Modal'

describe('Modal', () => {
  it('focuses the close button, traps Tab inside, closes on Esc and restores focus', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()
    const outside = document.createElement('button')
    outside.textContent = 'outside'
    document.body.appendChild(outside)
    outside.focus()
    render(
      <Modal title="Evidence" onClose={onClose} closeLabel="Close">
        <button>one</button>
        <button>two</button>
      </Modal>,
    )
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.tab()
    expect(screen.getByRole('button', { name: 'one' })).toHaveFocus()
    await user.tab()
    await user.tab() // wraps back to Close
    expect(screen.getByRole('button', { name: 'Close' })).toHaveFocus()
    await user.tab({ shift: true })
    expect(screen.getByRole('button', { name: 'two' })).toHaveFocus()
    await user.keyboard('{Escape}')
    expect(onClose).toHaveBeenCalled()
    outside.remove()
  })
})
