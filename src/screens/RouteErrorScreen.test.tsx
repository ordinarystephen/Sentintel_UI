import { render, screen } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { ThemeProvider } from '@/app/ThemeProvider'
import { RouteErrorScreen } from './RouteErrorScreen'

function Boom(): never {
  throw new Error("undefined is not an object (evaluating 'review.areas.filter')")
}

describe('route error boundary', () => {
  it('renders our card with the verbatim message and a way back — not the router dev page', () => {
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    const router = createMemoryRouter(
      [{ path: '/', element: <Boom />, errorElement: <RouteErrorScreen /> }],
      { initialEntries: ['/'] },
    )
    render(
      <ThemeProvider>
        <RouterProvider router={router} />
      </ThemeProvider>,
    )
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent(
      'This screen failed to render',
    )
    expect(screen.getByRole('alert')).toHaveTextContent(
      "undefined is not an object (evaluating 'review.areas.filter')",
    )
    expect(screen.getByRole('link', { name: 'Back to My reviews' })).toHaveAttribute(
      'href',
      '/crr/reviews',
    )
    spy.mockRestore()
  })
})
