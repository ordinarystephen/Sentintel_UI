/**
 * 48px masthead: brand, health badge, text-size control, theme select, dark
 * toggle (build-spec §4).
 */
import { Badge } from '@/components/Badge'
import { strings } from '@/strings'
import { BrandSwitcher } from './BrandSwitcher'
import { ThemeControls } from './ThemeControls'

export function Masthead() {
  return (
    <header className="flex h-12 flex-none items-center gap-3 border-b border-rule bg-bg px-4">
      <BrandSwitcher current="crr" />
      <Badge dot>{strings.app.healthReady}</Badge>
      <span className="flex-1" />
      <ThemeControls />
    </header>
  )
}
