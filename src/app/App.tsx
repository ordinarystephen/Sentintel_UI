/**
 * Phase 0 shell: masthead over a scrolling canvas.
 * Phase 1 replaces the canvas with the three-column frame (left rail, canvas,
 * right context rail) and the router; the masthead and ThemeProvider stay.
 */
import { StyleguideScreen } from '@/screens/styleguide/StyleguideScreen'
import { Masthead } from './Masthead'
import { ThemeProvider } from './ThemeProvider'

export function App() {
  return (
    <ThemeProvider>
      <div className="flex h-full flex-col bg-bg text-ink">
        <Masthead />
        <main className="min-h-0 flex-1 overflow-y-auto bg-bg px-9 pt-[26px] pb-[90px]">
          <div className="mx-auto max-w-[820px]">
            <StyleguideScreen />
          </div>
        </main>
      </div>
    </ThemeProvider>
  )
}
