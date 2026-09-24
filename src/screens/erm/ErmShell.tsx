/**
 * The CPEA-workflow application frame — CPEA's, and Inquiry's (v1.8: the
 * same shell, parameterized by the application it frames): masthead
 * (brand switcher, current = this app) over left rail (Home · Runs ·
 * Documents) + scrolling canvas. Same instrument-panel contract as CRR's
 * shell; no review-context zone, no right rail. Provides the
 * PortfolioAppContext every screen below reads.
 */
import { useEffect, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Masthead } from '@/app/Masthead'
import { FileIcon, HomeIcon } from '@/app/icons'
import { writeLastApp } from '@/lib/lastApp'
import { cx } from '@/lib/cx'
import { PortfolioAppContext, type PortfolioApp } from './portfolioApp'

function RunsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M4 20V10m6 10V4m6 16v-7m4 7H2" />
    </svg>
  )
}

function RailItem({
  to,
  end,
  icon,
  label,
}: {
  to: string
  end?: boolean
  icon: ReactNode
  label: string
}) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) =>
        cx(
          'relative flex w-full items-center gap-[10px] rounded-[7px] px-[10px] py-[7px] text-left text-ui text-rail-fg hover:bg-rail-hover [&>svg]:h-4 [&>svg]:w-4 [&>svg]:flex-none [&>svg]:text-rail-fg-muted',
          isActive &&
            'bg-rail-active-bg font-semibold text-rail-active-fg before:absolute before:top-[7px] before:bottom-[7px] before:-left-3 before:w-[3px] before:rounded-r-[2px] before:bg-rail-bar [&>svg]:text-rail-active-fg',
        )
      }
    >
      {icon}
      {label}
    </NavLink>
  )
}

export function ErmShell({ app }: { app: PortfolioApp }) {
  useEffect(() => writeLastApp(app.id), [app.id])
  const s = app.copy.nav
  return (
    <PortfolioAppContext.Provider value={app}>
      <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
        <Masthead current={app.id} />
        <div className="flex min-h-0 flex-1 items-stretch">
          <nav
            aria-label={s.aria}
            className="flex w-[236px] flex-none flex-col gap-0.5 overflow-y-auto border-r border-rail-rule bg-rail-bg px-3 py-3.5"
          >
            <RailItem to={app.base} end icon={<HomeIcon />} label={s.home} />
            <RailItem to={`${app.base}/runs`} icon={<RunsIcon />} label={s.runs} />
            <RailItem to={`${app.base}/documents`} icon={<FileIcon />} label={s.documents} />
          </nav>
          <main
            id="canvas"
            tabIndex={-1}
            className="min-w-0 flex-1 overflow-y-auto bg-bg px-9 pt-[26px] pb-[90px] max-[760px]:px-[18px]"
          >
            <div className="mx-auto max-w-[1080px]">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </PortfolioAppContext.Provider>
  )
}
