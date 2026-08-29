/**
 * Masthead theme controls: palette-family select + moon (dark) toggle.
 * Matches the mockup's `#theme-select` / `#theme-toggle` pair.
 */
import { strings } from '@/strings'
import { useTheme } from './ThemeContext'
import type { ThemeFamily } from './theme'

const FAMILY_LABELS: Record<ThemeFamily, string> = {
  stone: strings.theme.stone,
  cobalt: strings.theme.cobalt,
}

export function ThemeControls() {
  const { family, dark, setFamily, toggleDark } = useTheme()
  return (
    <div className="flex items-center gap-2">
      <select
        aria-label={strings.theme.selectLabel}
        value={family}
        onChange={(e) => setFamily(e.target.value as ThemeFamily)}
        className="rounded-[7px] border border-rule-strong bg-bg px-2 py-1 text-dense text-ink-soft"
      >
        {(Object.keys(FAMILY_LABELS) as ThemeFamily[]).map((id) => (
          <option key={id} value={id}>
            {FAMILY_LABELS[id]}
          </option>
        ))}
      </select>
      <button
        type="button"
        aria-label={strings.theme.toggleDark}
        aria-pressed={dark}
        onClick={toggleDark}
        className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-bg-hover aria-pressed:text-ink"
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
        >
          <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />
        </svg>
      </button>
    </div>
  )
}
