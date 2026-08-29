/**
 * Provider stack + router. Order matters only in that ThemeProvider must wrap
 * everything that renders on the token layer (i.e. everything).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { RouterProvider } from 'react-router-dom'
import { createAppRouter } from './router'
import { ShellProvider } from './ShellProvider'
import { ThemeProvider } from './ThemeProvider'

const queryClient = new QueryClient()
const router = createAppRouter()

export function App() {
  return (
    <ThemeProvider>
      <QueryClientProvider client={queryClient}>
        <ShellProvider>
          <RouterProvider router={router} />
        </ShellProvider>
      </QueryClientProvider>
    </ThemeProvider>
  )
}
