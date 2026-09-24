/**
 * Masthead brand = application switcher (suite round, 2026-09-17).
 * With 2+ entitlements the brand is a menu button — "Sentinel · CRR ▾"
 * ("Sentinel" as before, app short name muted) opening a menu of entitled
 * apps (current one marked; design-status apps listed but disabled with an
 * "In design" note), a divider, and "All applications" → /apps. With
 * exactly one entitlement: the static brand, no chevron, no menu.
 * The app had no menu component before this; the pattern follows the
 * WAI-ARIA menu-button practice (Enter/Space/ArrowDown open, arrows cycle
 * enabled items, Escape closes and refocuses, click-outside closes).
 */
import { useEffect, useRef, useState, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { APPS, type AppId } from '@/apps'
import { useMe } from '@/api/hooks'
import { cx } from '@/lib/cx'
import { strings } from '@/strings'

const s = strings.suite

export function BrandSwitcher({ current }: { current: AppId }) {
  const me = useMe()
  const navigate = useNavigate()
  const [open, setOpen] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  const entitled = APPS.filter((a) => me.data?.entitlements.includes(a.id))
  const currentApp = APPS.find((a) => a.id === current)!
  const multi = entitled.length >= 2

  useEffect(() => {
    if (!open) return
    const away = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('pointerdown', away)
    return () => document.removeEventListener('pointerdown', away)
  }, [open])

  useEffect(() => {
    if (open)
      menuRef.current
        ?.querySelector<HTMLElement>('[role="menuitem"]:not([aria-disabled="true"])')
        ?.focus()
  }, [open])

  const brand = (
    <>
      <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">{strings.app.brand}</span>
      <span className="text-[0.9375rem] font-medium text-muted"> · {currentApp.short}</span>
    </>
  )

  if (!multi) return <span>{brand}</span>

  function onMenuKey(e: KeyboardEvent<HTMLDivElement>) {
    const items = Array.from(
      menuRef.current?.querySelectorAll<HTMLElement>(
        '[role="menuitem"]:not([aria-disabled="true"])',
      ) ?? [],
    )
    const i = items.indexOf(document.activeElement as HTMLElement)
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      items[(i + (e.key === 'ArrowDown' ? 1 : items.length - 1)) % items.length]?.focus()
    } else if (e.key === 'Escape') {
      setOpen(false)
      rootRef.current?.querySelector('button')?.focus()
    } else if (e.key === 'Tab') {
      setOpen(false)
    }
  }

  return (
    <div ref={rootRef} className="relative">
      <button
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={s.switcherAria}
        onClick={() => setOpen((o) => !o)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' && !open) {
            e.preventDefault()
            setOpen(true)
          }
        }}
        className="flex items-center gap-1 rounded-md px-1 py-0.5 hover:bg-bg-hover"
      >
        {brand}
        <svg
          viewBox="0 0 16 16"
          width="11"
          height="11"
          fill="none"
          stroke="currentColor"
          strokeWidth="1.5"
          aria-hidden="true"
          className={cx('text-faint transition-transform duration-150', open && 'rotate-180')}
        >
          <path d="m4 6 4 4 4-4" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>
      {open && (
        <div
          ref={menuRef}
          role="menu"
          aria-label={s.switcherAria}
          onKeyDown={onMenuKey}
          className="absolute top-[calc(100%+6px)] left-0 z-50 min-w-[240px] rounded-[10px] border border-rule bg-bg py-1.5 shadow-md"
        >
          {APPS.filter((a) => me.data?.entitlements.includes(a.id)).map((a) =>
            a.status === 'active' ? (
              <button
                key={a.id}
                type="button"
                role="menuitem"
                onClick={() => {
                  setOpen(false)
                  if (a.id !== current) navigate(a.home)
                }}
                className="flex w-full items-baseline gap-2 px-3.5 py-[7px] text-left text-ui hover:bg-bg-hover"
              >
                <span className="font-semibold">{a.short}</span>
                {a.full && (
                  <span className="min-w-0 flex-1 truncate text-dense text-faint">{a.full}</span>
                )}
                {a.id === current && (
                  <span aria-label={s.currentApp} className="ml-auto text-dense text-ink">
                    ✓
                  </span>
                )}
              </button>
            ) : (
              <div
                key={a.id}
                role="menuitem"
                aria-disabled="true"
                className="flex w-full items-baseline gap-2 px-3.5 py-[7px] text-ui text-faint"
              >
                <span className="font-semibold">{a.short}</span>
                {a.full && <span className="min-w-0 flex-1 truncate text-dense">{a.full}</span>}
                <span className="ml-auto text-micro normal-case tracking-normal">{s.inDesign}</span>
              </div>
            ),
          )}
          <div role="separator" className="mx-3.5 my-1.5 border-t border-rule" />
          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setOpen(false)
              navigate('/apps')
            }}
            className="w-full px-3.5 py-[7px] text-left text-ui text-ink-soft hover:bg-bg-hover"
          >
            {s.allApplications}
          </button>
        </div>
      )}
    </div>
  )
}
