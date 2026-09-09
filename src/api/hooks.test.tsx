import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { describe, expect, it } from 'vitest'
import { useMyReviews, useReview } from './hooks'
import { VEYLAND_ID } from './mock/mockApi'

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>
    {children}
  </QueryClientProvider>
)

describe('query hooks over the seam', () => {
  it('useReview resolves the Veyland fixture through the VITE_API factory (mock)', async () => {
    const { result } = renderHook(() => useReview(VEYLAND_ID), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data).toMatchObject({
      id: VEYLAND_ID,
      borrowerName: 'Veyland US Holdco LLC',
    })
  })

  it('useMyReviews lists the fixed user’s reviews', async () => {
    const { result } = renderHook(() => useMyReviews(), { wrapper })
    await waitFor(() => expect(result.current.isSuccess).toBe(true))
    expect(result.current.data![0].id).toBe(VEYLAND_ID)
  })
})
