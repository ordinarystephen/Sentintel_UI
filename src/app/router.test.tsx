import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from '@/test/renderAt'

const VEYLAND = 'rev-veyland-2026-08'

const nav = () => screen.getByRole('navigation', { name: 'App navigation' })
const h1 = () => screen.getByRole('heading', { level: 1 })

describe('suite entry (entitlement routing)', () => {
  it('/ with multiple entitlements and no last-used app renders the suite landing', async () => {
    renderAt('/')
    expect(await screen.findByRole('navigation', { name: 'Applications' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /CRR.*Credit Risk Review.*Open/s })).toHaveAttribute(
      'href',
      '/crr',
    )
    // All three applications are live (v1.7): three cards, none in design
    expect(
      screen.getByRole('link', { name: /Credit Portfolio Event Assessment.*CPEA.*Open/s }),
    ).toHaveAttribute('href', '/erm')
    expect(screen.getByRole('link', { name: /Vantage.*P&C.*Open/s })).toHaveAttribute(
      'href',
      '/vantage',
    )
    expect(screen.queryByText('In design')).toBeNull()
    expect(screen.getAllByRole('link')).toHaveLength(3)
  })

  it('/ redirects to the last-used entitled app', async () => {
    localStorage.setItem('sentinel.lastApp', 'crr')
    try {
      renderAt('/')
      expect(
        await screen.findByRole('heading', { level: 1, name: 'Start a review' }),
      ).toBeInTheDocument()
    } finally {
      localStorage.removeItem('sentinel.lastApp')
    }
  })

  it('/apps always renders the landing, even with a last-used app recorded', async () => {
    localStorage.setItem('sentinel.lastApp', 'crr')
    try {
      renderAt('/apps')
      expect(await screen.findByRole('navigation', { name: 'Applications' })).toBeInTheDocument()
    } finally {
      localStorage.removeItem('sentinel.lastApp')
    }
  })

  it('entering the CRR shell records it as the last-used app', async () => {
    renderAt('/crr/reviews')
    await screen.findByRole('heading', { level: 1 })
    expect(localStorage.getItem('sentinel.lastApp')).toBe('crr')
    localStorage.removeItem('sentinel.lastApp')
  })
})

describe('routes', () => {
  it.each([
    ['/crr', 'Start a review', 'Home'],
    ['/crr/reviews', 'Reviews', 'My reviews'],
    ['/crr/reviews/all', 'Reviews', 'All reviews'],
    ['/crr/documents', 'Documents', 'Documents'],
    ['/crr/policy', 'Policy search', 'Policy library'],
  ])('%s renders its screen and marks the rail item active', (path, title, navLabel) => {
    renderAt(path)
    expect(h1()).toHaveTextContent(title)
    expect(within(nav()).getByRole('link', { name: navLabel })).toHaveAttribute(
      'aria-current',
      'page',
    )
    expect(
      within(nav())
        .getAllByRole('link')
        .filter((l) => l.getAttribute('aria-current')),
    ).toHaveLength(1)
  })

  it('reviews tabs reflect the URL', () => {
    renderAt('/crr/reviews/all')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'My' })).toHaveAttribute('aria-selected', 'false')
  })

  it('unknown paths render Not found inside the shell', () => {
    renderAt('/crr/nope/nothing')
    expect(h1()).toHaveTextContent('Nothing here')
    expect(nav()).toBeInTheDocument()
  })

  it('outside a review there is no contextual zone and no context rail', () => {
    renderAt('/crr')
    expect(within(nav()).queryByRole('link', { name: 'Overview' })).toBeNull()
    expect(screen.queryByRole('complementary', { name: 'Context' })).toBeNull()
  })

  it('/review/:id shows the contextual zone, section deep links and the context rail', async () => {
    renderAt(`/crr/review/${VEYLAND}#sec-2`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Veyland US Holdco LLC' }),
    ).toBeInTheDocument()
    const zone = within(nav()).getByRole('region', { name: 'Veyland US Holdco LLC' })
    expect(within(zone).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      `/crr/review/${VEYLAND}`,
    )
    const sec2 = within(zone).getByRole('link', { name: '2 · Financials' })
    expect(sec2).toHaveAttribute('href', `/crr/review/${VEYLAND}#sec-2`)
    expect(sec2).toHaveAttribute('aria-current', 'true')
    expect(
      within(zone).getByRole('link', { name: '6 · Trading Activity & Exposure Analysis' }),
    ).not.toHaveAttribute('aria-current')
    expect(within(zone).getByRole('link', { name: 'Overview' })).toHaveTextContent('4') // open items
    const rail = screen.getByRole('complementary', { name: 'Context' })
    await waitFor(() =>
      expect(
        within(rail)
          .getAllByRole('tab')
          .map((t) => t.textContent?.replace(/\d+$/, '')),
      ).toEqual(['Why', 'Respond', 'Debate', 'Prior']),
    )
  })

  it('leaving the review clears the contextual zone', async () => {
    const user = userEvent.setup()
    renderAt(`/crr/review/${VEYLAND}`)
    expect(await within(nav()).findByRole('link', { name: 'Overview' })).toBeInTheDocument()
    await user.click(within(nav()).getByRole('link', { name: 'Documents' }))
    expect(await screen.findByRole('heading', { level: 1, name: 'Documents' })).toBeInTheDocument()
    expect(within(nav()).queryByRole('link', { name: 'Overview' })).toBeNull()
    expect(screen.queryByRole('complementary', { name: 'Context' })).toBeNull()
  })
})

describe('rail collapse', () => {
  it('collapses to an icon strip, persists, and restores on remount', async () => {
    const user = userEvent.setup()
    const first = renderAt('/crr/reviews')
    expect(screen.getByText('My reviews')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    expect(screen.queryByText('My reviews')).toBeNull()
    expect(within(nav()).getByRole('link', { name: 'My reviews' })).toHaveAttribute(
      'title',
      'My reviews',
    )
    expect(screen.getByRole('button', { name: 'Expand sidebar' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    expect(localStorage.getItem('sentinel.rail.collapsed')).toBe('true')

    first.unmount()
    renderAt('/crr/reviews')
    expect(nav()).toHaveAttribute('data-collapsed', 'true')
    expect(screen.queryByText('My reviews')).toBeNull()
  })

  it('collapsed rail still shows section numbers inside a review', async () => {
    const user = userEvent.setup()
    renderAt(`/crr/review/${VEYLAND}`)
    await within(nav()).findByRole('region', { name: 'Veyland US Holdco LLC' })
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    const zone = within(nav()).getByRole('region', { name: 'Veyland US Holdco LLC' })
    expect(within(zone).getByRole('link', { name: '2 · Financials' })).toHaveTextContent('2')
    expect(within(zone).queryByText('Financials')).toBeNull()
  })
})

describe('context rail collapse', () => {
  it('toggles from the sticky bar and persists', async () => {
    const user = userEvent.setup()
    const first = renderAt(`/crr/review/${VEYLAND}`)
    const toggle = () => screen.getByRole('button', { name: 'Toggle context rail' })
    expect(await screen.findByRole('button', { name: 'Toggle context rail' })).toHaveAttribute(
      'aria-pressed',
      'true',
    )
    await user.click(toggle())
    expect(screen.queryByRole('complementary', { name: 'Context' })).toBeNull()
    expect(toggle()).toHaveAttribute('aria-pressed', 'false')
    expect(localStorage.getItem('sentinel.ctx.collapsed')).toBe('true')

    first.unmount()
    renderAt(`/crr/review/${VEYLAND}`)
    await screen.findByRole('button', { name: 'Toggle context rail' })
    expect(screen.queryByRole('complementary', { name: 'Context' })).toBeNull()
  })
})
