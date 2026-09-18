/**
 * 48px masthead: brand, health badge, text-size control, theme select, dark
 * toggle (build-spec §4).
 */
import { useEffect, useState } from 'react'
import type { AppId } from '@/apps'
import { Badge } from '@/components/Badge'
import { CommandPalette } from '@/components/CommandPalette'
import { strings } from '@/strings'
import { BrandSwitcher } from './BrandSwitcher'
import { ThemeControls } from './ThemeControls'

export function Masthead({ current = 'crr' }: { current?: AppId } = {}) {
  const [paletteOpen, setPaletteOpen] = useState(false)
  // ⌘K / Ctrl-K from anywhere inside the shell
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        setPaletteOpen((o) => !o)
      }
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [])
  return (
    <header className="flex h-12 flex-none items-center gap-3 border-b border-rule bg-bg px-4">
      <BrandSwitcher current={current} />
      <Badge dot>{strings.app.healthReady}</Badge>
      <span className="flex-1" />
      <button
        type="button"
        aria-label={strings.palette.triggerAria}
        title={strings.palette.triggerTitle}
        onClick={() => setPaletteOpen(true)}
        className="inline-flex items-center gap-[7px] rounded-[7px] border border-rule-strong bg-bg px-2.5 py-1 text-[0.75rem] text-muted hover:bg-bg-hover hover:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          width="13"
          height="13"
          aria-hidden="true"
        >
          <circle cx="11" cy="11" r="7" />
          <path d="m20 20-3.5-3.5" />
        </svg>
        {strings.palette.trigger}
        <kbd className="rounded border border-rule-strong bg-bg-subtle px-1 font-mono text-[0.625rem] text-faint">
          ⌘K
        </kbd>
      </button>
      <ThemeControls />
      <CommandPalette open={paletteOpen} onClose={() => setPaletteOpen(false)} />
    </header>
  )
}
