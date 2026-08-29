import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from '@/test/renderAt'

const MERIDIAN = 'rev-meridian-2026-08'

const nav = () => screen.getByRole('navigation', { name: 'App navigation' })
const h1 = () => screen.getByRole('heading', { level: 1 })

describe('routes', () => {
  it.each([
    ['/', 'Start a review', 'Home'],
    ['/reviews', 'Reviews', 'My reviews'],
    ['/reviews/all', 'Reviews', 'All reviews'],
    ['/documents', 'Documents', 'Documents'],
    ['/policy', 'Policy library', 'Policy library'],
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
    renderAt('/reviews/all')
    expect(screen.getByRole('tab', { name: 'All' })).toHaveAttribute('aria-selected', 'true')
    expect(screen.getByRole('tab', { name: 'My' })).toHaveAttribute('aria-selected', 'false')
  })

  it('unknown paths render Not found inside the shell', () => {
    renderAt('/nope/nothing')
    expect(h1()).toHaveTextContent('Nothing here')
    expect(nav()).toBeInTheDocument()
  })

  it('outside a review there is no contextual zone and no context rail', () => {
    renderAt('/')
    expect(within(nav()).queryByRole('link', { name: 'Overview' })).toBeNull()
    expect(screen.queryByRole('complementary', { name: 'Context' })).toBeNull()
  })

  it('/review/:id shows the contextual zone, section deep links and the context rail', async () => {
    renderAt(`/review/${MERIDIAN}#sec-2`)
    expect(
      await screen.findByRole('heading', { level: 1, name: 'Meridian US Holdco LLC' }),
    ).toBeInTheDocument()
    const zone = within(nav()).getByRole('region', { name: 'Meridian US Holdco LLC' })
    expect(within(zone).getByRole('link', { name: 'Overview' })).toHaveAttribute(
      'href',
      `/review/${MERIDIAN}`,
    )
    const sec2 = within(zone).getByRole('link', { name: '2 · Financials' })
    expect(sec2).toHaveAttribute('href', `/review/${MERIDIAN}#sec-2`)
    expect(sec2).toHaveAttribute('aria-current', 'true')
    expect(within(zone).getByRole('link', { name: '6 · Recommendation' })).not.toHaveAttribute(
      'aria-current',
    )
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
    renderAt(`/review/${MERIDIAN}`)
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
    const first = renderAt('/reviews')
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
    renderAt('/reviews')
    expect(nav()).toHaveAttribute('data-collapsed', 'true')
    expect(screen.queryByText('My reviews')).toBeNull()
  })

  it('collapsed rail still shows section numbers inside a review', async () => {
    const user = userEvent.setup()
    renderAt(`/review/${MERIDIAN}`)
    await within(nav()).findByRole('region', { name: 'Meridian US Holdco LLC' })
    await user.click(screen.getByRole('button', { name: 'Collapse sidebar' }))
    const zone = within(nav()).getByRole('region', { name: 'Meridian US Holdco LLC' })
    expect(within(zone).getByRole('link', { name: '2 · Financials' })).toHaveTextContent('2')
    expect(within(zone).queryByText('Financials')).toBeNull()
  })
})

describe('context rail collapse', () => {
  it('toggles from the sticky bar and persists', async () => {
    const user = userEvent.setup()
    const first = renderAt(`/review/${MERIDIAN}`)
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
    renderAt(`/review/${MERIDIAN}`)
    await screen.findByRole('button', { name: 'Toggle context rail' })
    expect(screen.queryByRole('complementary', { name: 'Context' })).toBeNull()
  })
})
