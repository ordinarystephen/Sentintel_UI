/**
 * The Vantage frame: masthead (switcher, current = Vantage) over the
 * two-noun rail — Ask · Runs, nothing else. Everything absent is absent
 * on purpose; the discipline is the design (concept pin V1).
 */
import { useEffect, type ReactNode } from 'react'
import { NavLink, Outlet } from 'react-router-dom'
import { Masthead } from '@/app/Masthead'
import { writeLastApp } from '@/lib/lastApp'
import { cx } from '@/lib/cx'
import { strings } from '@/strings'

const s = strings.vantage.nav

function AskIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M21 12a8 8 0 1 1-3.1-6.3L21 4l-1 4.5" />
      <path d="M9 11h6M9 14.5h4" />
    </svg>
  )
}
function RunsIcon() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
      <path d="M12 8v5l3 2" />
      <circle cx="12" cy="12" r="9" />
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

export function VantageShell() {
  useEffect(() => writeLastApp('vantage'), [])
  return (
    <div className="flex h-full flex-col overflow-hidden bg-bg text-ink">
      <Masthead current="vantage" />
      <div className="flex min-h-0 flex-1 items-stretch">
        <nav
          aria-label={s.aria}
          className="flex w-[236px] flex-none flex-col gap-0.5 overflow-y-auto border-r border-rail-rule bg-rail-bg px-3 py-3.5"
        >
          <RailItem to="/vantage" end icon={<AskIcon />} label={s.ask} />
          <RailItem to="/vantage/runs" icon={<RunsIcon />} label={s.runs} />
        </nav>
        <main
          id="canvas"
          tabIndex={-1}
          className="min-w-0 flex-1 overflow-y-auto bg-bg px-9 pt-[26px] pb-[90px] max-[760px]:px-[18px]"
        >
          <div className="mx-auto max-w-[860px]">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  )
}
