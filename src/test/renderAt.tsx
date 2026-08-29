/* eslint-disable react-refresh/only-export-components -- test helper, not a hot-reloaded module */
/**
 * Test harness: the full provider stack + the app's route table at a path.
 * The app uses createBrowserRouter; tests mount the same routes through
 * useRoutes inside a MemoryRouter (jsdom's AbortSignal is not Node's, which
 * trips the data router's internal Request on navigation).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { MemoryRouter, useRoutes } from 'react-router-dom'
import { routes } from '@/app/router'
import { ShellProvider } from '@/app/ShellProvider'
import { ThemeProvider } from '@/app/ThemeProvider'
import { ToastProvider } from '@/components/Toast'

const AppRoutes = () => useRoutes(routes)

export function renderAt(path: string) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  return render(
    <ThemeProvider>
      <QueryClientProvider client={qc}>
        <ShellProvider>
          <ToastProvider>
            <MemoryRouter initialEntries={[path]}>
              <AppRoutes />
            </MemoryRouter>
          </ToastProvider>
        </ShellProvider>
      </QueryClientProvider>
    </ThemeProvider>,
  )
}
