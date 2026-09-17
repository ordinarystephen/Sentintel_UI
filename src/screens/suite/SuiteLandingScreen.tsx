/**
 * Suite landing — the front door above the applications (concept r4,
 * design/sentinel-suite-landing.html; ratified 2026-09-17). Suite-level
 * layout: NO app chrome — no left rail, no app masthead. A sparse top bar
 * with the serif wordmark, the application cards vertically centered, the
 * fictional-data line as the footer. Cards render from the registry:
 * `active` → the whole card is a link to the app home with the primary
 * Open button; `design` → not clickable, quiet "In design" chip, no
 * button, no hover lift. Entrance uses the app's settle stagger (dies
 * under prefers-reduced-motion like all motion).
 */
import { Link } from 'react-router-dom'
import { APPS, type SentinelApp } from '@/apps'
import { strings } from '@/strings'

const s = strings.suite

function ArrowIcon({ className }: { className?: string }) {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
      className={className}
    >
      <path
        d="M3 8h10m0 0-4-4m4 4-4 4"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function CardBody({ app }: { app: SentinelApp }) {
  return (
    <div className="min-w-0 flex-1">
      <div className="flex flex-wrap items-baseline gap-2.5 font-display text-[1.25rem] font-semibold tracking-[-0.01em]">
        {app.short}
        <span className="font-body text-[0.75rem] font-normal tracking-[0.02em] text-faint">
          {app.full}
        </span>
      </div>
      <p className="mt-1 max-w-[56ch] text-ui-sm text-muted">{app.description}</p>
    </div>
  )
}

function AppCard({ app }: { app: SentinelApp }) {
  if (app.status === 'active')
    return (
      <Link
        to={app.home}
        className="group relative flex items-center gap-[18px] rounded-xl border border-rule bg-bg px-6 py-5 shadow-sm transition-[box-shadow,transform,border-color] duration-150 before:absolute before:top-3.5 before:bottom-3.5 before:-left-px before:w-[3px] before:rounded-r-[2px] before:bg-primary before:opacity-0 before:transition-opacity before:duration-150 hover:-translate-y-px hover:border-rule-strong hover:shadow-md hover:before:opacity-100"
      >
        <CardBody app={app} />
        <span className="inline-flex flex-none items-center gap-[7px] rounded-lg bg-primary px-[15px] py-[7px] text-ui-sm font-medium text-on-ink transition-[filter] duration-150 group-hover:brightness-115">
          {s.open}
          <ArrowIcon className="transition-transform duration-150 group-hover:translate-x-0.5" />
        </span>
      </Link>
    )
  return (
    <div
      aria-disabled="true"
      className="flex items-center gap-[18px] rounded-xl border border-rule bg-bg px-6 py-5 shadow-sm"
    >
      <CardBody app={app} />
      <span className="inline-flex flex-none items-center rounded-full border border-rule-strong bg-bg-subtle px-[9px] py-px text-micro text-muted normal-case tracking-normal">
        {s.inDesign}
      </span>
    </div>
  )
}

export function SuiteLandingScreen() {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-y-auto bg-bg-subtle text-ink">
      <header className="flex h-14 flex-none items-center px-7">
        <span className="font-display text-[1.125rem] font-semibold tracking-[-0.01em]">
          {strings.app.brand}
        </span>
      </header>
      <main className="flex flex-1 flex-col justify-center px-7 pt-8 pb-16">
        <div className="mx-auto w-full max-w-[620px]">
          <nav aria-label={s.landingAria} className="settle flex flex-col gap-3">
            {APPS.map((a) => (
              <AppCard key={a.id} app={a} />
            ))}
          </nav>
          <p className="mt-[34px] flex flex-wrap gap-3.5 border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
            {s.fictionalNote}
          </p>
        </div>
      </main>
    </div>
  )
}
