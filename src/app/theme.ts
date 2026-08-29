/**
 * Theme state model (build-spec §3.1).
 *
 * Theme = palette family (Stone default, Cobalt) + dark boolean, persisted in
 * localStorage under STORAGE_KEY. It is applied purely as classes on <body>
 * — `theme-cobalt` and `dark` — which is all tokens.css keys on. Adding a
 * future theme means: a new token block in tokens.css, a new entry in FAMILIES.
 *
 * index.html carries a tiny pre-paint copy of `applyTheme` so a persisted
 * choice never flashes Stone-light; keep the key and class names in sync.
 */
export const STORAGE_KEY = 'sentinel.theme'

export type ThemeFamily = 'stone' | 'cobalt'

export interface ThemePref {
  family: ThemeFamily
  dark: boolean
}

export const DEFAULT_THEME: ThemePref = { family: 'stone', dark: false }

/** Family → body class. Stone is the bare `:root` block, so it has no class. */
export const FAMILIES: ReadonlyArray<{ id: ThemeFamily; bodyClass: string | null }> = [
  { id: 'stone', bodyClass: null },
  { id: 'cobalt', bodyClass: 'theme-cobalt' },
]

export function readTheme(): ThemePref {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return DEFAULT_THEME
    const parsed: unknown = JSON.parse(raw)
    if (
      typeof parsed === 'object' &&
      parsed !== null &&
      'family' in parsed &&
      'dark' in parsed &&
      FAMILIES.some((f) => f.id === (parsed as ThemePref).family) &&
      typeof (parsed as ThemePref).dark === 'boolean'
    ) {
      return { family: (parsed as ThemePref).family, dark: (parsed as ThemePref).dark }
    }
  } catch {
    /* storage unavailable or corrupt → default */
  }
  return DEFAULT_THEME
}

export function writeTheme(pref: ThemePref): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(pref))
  } catch {
    /* storage unavailable: the choice lives for the session only */
  }
}

export function applyTheme(pref: ThemePref, body: HTMLElement = document.body): void {
  for (const f of FAMILIES) if (f.bodyClass) body.classList.remove(f.bodyClass)
  const cls = FAMILIES.find((f) => f.id === pref.family)?.bodyClass
  if (cls) body.classList.add(cls)
  body.classList.toggle('dark', pref.dark)
}
