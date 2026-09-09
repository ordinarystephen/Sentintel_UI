/**
 * Left rail (build-spec §4) — GitHub-modeled app navigation on the `--rail-*`
 * tokens, so it themes independently of the canvas (Cobalt: navy rail, light
 * page). App items, then — inside a review — a contextual zone: the review's
 * name, Overview (with open-items count) and sections 1–6 with status dots,
 * all deep-linking into the workpaper. "Collapse sidebar" at the foot shrinks
 * it to a 58px icon strip (labels hidden, titles as tooltips, section numbers
 * as icons); the state persists per user.
 */
import type { ComponentType, ReactNode, SVGProps } from 'react'
import { Link, NavLink, useLocation } from 'react-router-dom'
import { cx } from '@/lib/cx'
import { SECTIONS, sectionAnchor } from '@/lib/sections'
import { strings } from '@/strings'
import {
  CollapseIcon,
  ExpandIcon,
  FileIcon,
  HomeIcon,
  PeopleIcon,
  SearchIcon,
  ShieldIcon,
} from './icons'
import { useShell, type SectionStatus } from './ShellContext'

type IconType = ComponentType<SVGProps<SVGSVGElement>>

function itemClasses(active: boolean, collapsed: boolean, ctx = false): string {
  return cx(
    'relative flex w-full items-center rounded-[7px] text-left text-rail-fg hover:bg-rail-hover',
    '[&>svg]:h-4 [&>svg]:w-4 [&>svg]:flex-none [&>svg]:text-rail-fg-muted',
    ctx ? 'text-ui-sm' : 'text-ui',
    collapsed ? 'justify-center gap-0 px-0' : 'gap-[10px] px-[10px]',
    ctx ? 'py-[5px]' : collapsed ? 'py-2' : 'py-[7px]',
    active && 'bg-rail-active-bg font-semibold text-rail-active-fg [&>svg]:text-rail-active-fg',
    active &&
      !ctx &&
      cx(
        "before:absolute before:top-[7px] before:bottom-[7px] before:w-[3px] before:rounded-r-sm before:bg-rail-bar before:content-['']",
        collapsed ? 'before:-left-[9px]' : 'before:-left-3',
      ),
  )
}

const Label = ({ children, hidden }: { children: ReactNode; hidden: boolean }) =>
  hidden ? null : <span className="min-w-0 flex-1 truncate">{children}</span>

function AppItem({
  to,
  end,
  icon: Icon,
  label,
  collapsed,
}: {
  to: string
  end?: boolean
  icon: IconType
  label: string
  collapsed: boolean
}) {
  return (
    <NavLink
      to={to}
      end={end}
      title={label}
      aria-label={collapsed ? label : undefined}
      className={({ isActive }) => itemClasses(isActive, collapsed)}
    >
      <Icon />
      <Label hidden={collapsed}>{label}</Label>
    </NavLink>
  )
}

const DOT: Record<SectionStatus, string> = {
  populated: 'bg-success',
  pending: 'border-[1.5px] border-rail-fg-muted bg-transparent',
  attention: 'bg-warn',
}

function CtxItem({
  to,
  current,
  glyph,
  label,
  title,
  collapsed,
  trailing,
}: {
  to: string
  current: boolean
  glyph: string
  label: string
  title: string
  collapsed: boolean
  trailing?: ReactNode
}) {
  return (
    <Link
      to={to}
      title={title}
      aria-label={title}
      aria-current={current ? 'true' : undefined}
      className={itemClasses(current, collapsed, true)}
    >
      <span
        className={cx(
          'w-4 flex-none text-center font-mono text-micro',
          current ? 'text-rail-active-fg' : 'text-rail-fg-muted',
        )}
      >
        {glyph}
      </span>
      <Label hidden={collapsed}>{label}</Label>
      {!collapsed && trailing}
    </Link>
  )
}

export function LeftRail() {
  const { railCollapsed: collapsed, setRailCollapsed, currentReview } = useShell()
  const { hash } = useLocation()

  return (
    <nav
      aria-label={strings.nav.appNavAria}
      data-collapsed={collapsed || undefined}
      className={cx(
        'flex flex-none flex-col gap-0.5 overflow-y-auto border-r border-rail-rule bg-rail-bg py-[14px] transition-[width] duration-150 ease-out max-[760px]:hidden',
        collapsed ? 'w-[58px] px-[9px]' : 'w-[236px] px-3',
      )}
    >
      <AppItem to="/" end icon={HomeIcon} label={strings.nav.home} collapsed={collapsed} />
      <AppItem
        to="/reviews"
        end
        icon={FileIcon}
        label={strings.nav.myReviews}
        collapsed={collapsed}
      />
      <AppItem
        to="/reviews/all"
        icon={PeopleIcon}
        label={strings.nav.allReviews}
        collapsed={collapsed}
      />
      <AppItem
        to="/documents"
        icon={SearchIcon}
        label={strings.nav.documents}
        collapsed={collapsed}
      />
      <AppItem
        to="/policy"
        icon={ShieldIcon}
        label={strings.nav.policyLibrary}
        collapsed={collapsed}
      />

      {currentReview && (
        <>
          <div className="mx-0.5 my-[10px] flex-none border-t border-rail-rule" />
          <section aria-label={currentReview.name} className="flex flex-col gap-0.5">
            {!collapsed && (
              <h4 className="mx-2 mt-0.5 mb-1.5 truncate text-micro font-semibold tracking-[0.1em] text-rail-fg-muted uppercase">
                {currentReview.name}
              </h4>
            )}
            <CtxItem
              to={`/review/${currentReview.id}`}
              current={!hash}
              glyph="◎"
              label={strings.nav.overview}
              title={strings.nav.overview}
              collapsed={collapsed}
              trailing={
                currentReview.openItems > 0 && (
                  <span className="rounded-full border border-warn-line bg-warn-bg px-1.5 text-[0.625rem] font-semibold text-warn">
                    {currentReview.openItems}
                  </span>
                )
              }
            />
            {SECTIONS.map((s) => {
              const status = currentReview.sections.find((x) => x.n === s.n)?.status ?? 'pending'
              return (
                <CtxItem
                  key={s.n}
                  to={`/review/${currentReview.id}#${sectionAnchor(s.n)}`}
                  current={hash === `#${sectionAnchor(s.n)}`}
                  glyph={String(s.n)}
                  label={s.short}
                  title={`${s.n} · ${s.title}`}
                  collapsed={collapsed}
                  trailing={
                    <span
                      aria-hidden="true"
                      className={cx('h-[7px] w-[7px] flex-none rounded-full', DOT[status])}
                    />
                  }
                />
              )
            })}
          </section>
        </>
      )}

      <div className="min-h-[14px] flex-1" />
      <button
        type="button"
        onClick={() => setRailCollapsed(!collapsed)}
        aria-pressed={collapsed}
        title={collapsed ? strings.nav.expandSidebar : strings.nav.collapseSidebar}
        aria-label={collapsed ? strings.nav.expandSidebar : strings.nav.collapseSidebar}
        className={itemClasses(false, collapsed)}
      >
        {collapsed ? <ExpandIcon /> : <CollapseIcon />}
        <Label hidden={collapsed}>{strings.nav.collapseSidebar}</Label>
      </button>
    </nav>
  )
}
