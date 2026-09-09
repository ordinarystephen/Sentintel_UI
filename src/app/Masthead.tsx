/**
 * 48px masthead: brand, health badge, theme select, dark toggle (build-spec §4).
 */
import { Badge } from '@/components/Badge'
import { strings } from '@/strings'
import { ThemeControls } from './ThemeControls'

export function Masthead() {
  return (
    <header className="flex h-12 flex-none items-center gap-3 border-b border-rule bg-bg px-4">
      <span className="text-[0.9375rem] font-semibold tracking-[-0.01em]">{strings.app.brand}</span>
      <Badge dot>{strings.app.healthReady}</Badge>
      <span className="flex-1" />
      <ThemeControls />
    </header>
  )
}
