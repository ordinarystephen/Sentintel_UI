/**
 * The fixed instrument-panel frame (build-spec §4): masthead over a
 * three-column row — left rail, canvas, right context rail (review route
 * only). The frame fills the viewport and never scrolls; ONLY the canvas
 * (`<main id="canvas">`) scrolls. Screens render into the canvas via <Outlet>.
 */
import { Outlet } from 'react-router-dom'
import { LeftRail } from './LeftRail'
import { Masthead } from './Masthead'
import { RightRail } from './RightRail'
import { useShell } from './ShellContext'

export function AppShell() {
  const { currentReview, ctxCollapsed } = useShell()
  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      <Masthead />
      <div className="flex min-h-0 flex-1 items-stretch">
        <LeftRail />
        <main
          id="canvas"
          className="min-w-0 flex-1 overflow-y-auto bg-bg px-9 pt-[26px] pb-[90px] max-[760px]:px-[18px] max-[760px]:pt-[22px] max-[760px]:pb-10"
        >
          <div className="mx-auto max-w-[820px]">
            <Outlet />
          </div>
        </main>
        {currentReview && !ctxCollapsed && <RightRail />}
      </div>
    </div>
  )
}
