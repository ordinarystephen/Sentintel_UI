/**
 * Candidate typefaces for the Font Lab.
 *
 * Two kinds, and the split matters on a 1x monitor:
 *
 *  - **System stacks** need no download and are hinted by the OS for low
 *    DPI. On Windows, Segoe UI and friends are rendered with ClearType and
 *    hold their weight at small sizes in a way most webfonts do not. They
 *    also work with no network, which the target environment requires.
 *  - **Webfonts**, loaded lazily so nothing is fetched until picked. Every
 *    one here was chosen for legibility at small sizes rather than charm:
 *    sturdy stems, open apertures, real hinting.
 */
import type { FontRole } from './fontState'

export type FontOption = {
  id: string
  label: string
  /** The value written into the custom property. */
  stack: string
  roles: FontRole[]
  /** Absent for system stacks; webfonts load on demand. */
  load?: () => Promise<unknown>
  note?: string
}

const SYSTEM_UI = '-apple-system, BlinkMacSystemFont, "Segoe UI", system-ui, sans-serif'
const SYSTEM_SERIF = 'Georgia, Cambria, "Times New Roman", serif'
const SYSTEM_MONO = 'ui-monospace, "SF Mono", SFMono-Regular, Menlo, Consolas, monospace'

export const FONT_OPTIONS: FontOption[] = [
  // ── shipped today (the baseline to judge against) ──────────────────────
  {
    id: 'inter',
    label: 'Inter  (current)',
    stack: `'Inter Variable', ${SYSTEM_UI}`,
    roles: ['body'],
    note: 'Shipped default.',
  },
  {
    id: 'source-serif-4',
    label: 'Source Serif 4  (current)',
    stack: "'Source Serif 4 Variable', 'New York', ui-serif, Georgia, serif",
    roles: ['display'],
    note: 'Shipped default.',
  },

  // ── system stacks: zero download, OS-hinted, best-case at 1x ───────────
  {
    id: 'system-ui',
    label: 'System UI  (Segoe / SF)',
    stack: SYSTEM_UI,
    roles: ['body', 'display'],
    note: 'No download. Sharpest on Windows at 1x.',
  },
  {
    id: 'system-serif',
    label: 'System serif  (Georgia)',
    stack: SYSTEM_SERIF,
    roles: ['display', 'body'],
    note: 'No download. Georgia was drawn for screens.',
  },
  {
    id: 'system-mono',
    label: 'System mono  (Consolas)',
    stack: SYSTEM_MONO,
    roles: ['mono'],
    note: 'No download.',
  },

  // ── sans candidates ────────────────────────────────────────────────────
  {
    id: 'ibm-plex-sans',
    label: 'IBM Plex Sans',
    stack: `'IBM Plex Sans Variable', ${SYSTEM_UI}`,
    roles: ['body', 'display'],
    load: () => import('@fontsource-variable/ibm-plex-sans'),
    note: 'Institutional, strongly hinted, sturdy at small sizes.',
  },
  {
    id: 'public-sans',
    label: 'Public Sans',
    stack: `'Public Sans Variable', ${SYSTEM_UI}`,
    roles: ['body', 'display'],
    load: () => import('@fontsource-variable/public-sans'),
    note: 'Drawn for US government use — legibility over personality.',
  },
  {
    id: 'source-sans-3',
    label: 'Source Sans 3',
    stack: `'Source Sans 3 Variable', ${SYSTEM_UI}`,
    roles: ['body'],
    load: () => import('@fontsource-variable/source-sans-3'),
    note: 'Humanist, warmer than Inter, holds up small.',
  },

  // ── serif / display candidates ─────────────────────────────────────────
  {
    id: 'lora',
    label: 'Lora',
    stack: "'Lora Variable', Georgia, serif",
    roles: ['display'],
    load: () => import('@fontsource-variable/lora'),
    note: 'Contemporary serif, brushed contrast, reads well at heading sizes.',
  },
  {
    id: 'newsreader',
    label: 'Newsreader',
    stack: "'Newsreader Variable', Georgia, serif",
    roles: ['display'],
    load: () => import('@fontsource-variable/newsreader'),
    note: 'Editorial. More voice than Source Serif.',
  },

  // ── mono candidates ────────────────────────────────────────────────────
  {
    id: 'jetbrains-mono',
    label: 'JetBrains Mono',
    stack: `'JetBrains Mono Variable', ${SYSTEM_MONO}`,
    roles: ['mono'],
    load: () => import('@fontsource-variable/jetbrains-mono'),
    note: 'Tall x-height; digits stay distinct in dense tables.',
  },
]

/**
 * One-click pairings.
 *
 * why presets: judging body/display/mono independently is three decisions at
 * once. A pairing is somebody else's finished answer, which is the faster way
 * to find out whether the problem is the typeface or something else entirely.
 */
export type Preset = {
  id: string
  label: string
  body: string
  display: string
  mono: string
  note: string
}

export const PRESETS: Preset[] = [
  {
    id: 'current',
    label: 'Current',
    body: 'inter',
    display: 'source-serif-4',
    mono: 'system-mono',
    note: 'What ships today.',
  },
  {
    id: 'native',
    label: 'All-native',
    body: 'system-ui',
    display: 'system-serif',
    mono: 'system-mono',
    note: 'Zero webfonts. The sharpest possible result at 1x — start here to see whether webfonts are the problem.',
  },
  {
    id: 'institutional',
    label: 'Institutional',
    body: 'ibm-plex-sans',
    display: 'lora',
    mono: 'jetbrains-mono',
    note: 'Bank-ish and sober without being cold.',
  },
  {
    id: 'editorial',
    label: 'Editorial',
    body: 'source-sans-3',
    display: 'newsreader',
    mono: 'jetbrains-mono',
    note: 'Leans into the report/document character.',
  },
  {
    id: 'plain',
    label: 'Plain',
    body: 'public-sans',
    display: 'public-sans',
    mono: 'jetbrains-mono',
    note: 'One family throughout. Quiet, no serif voice.',
  },
]

export const byId = (id: string): FontOption | undefined => FONT_OPTIONS.find((o) => o.id === id)

export const optionsFor = (role: FontRole): FontOption[] =>
  FONT_OPTIONS.filter((o) => o.roles.includes(role))
