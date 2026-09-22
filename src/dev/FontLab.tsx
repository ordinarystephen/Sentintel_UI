/**
 * Font Lab — a dev-only panel for trying typefaces against real screens.
 *
 * Mounted from main.tsx behind `import.meta.env.DEV`, so it is dead code in a
 * production build and the lazily-imported webfonts never reach the bundle.
 *
 * Deliberately plain: raw inline styles rather than the design system, so the
 * panel cannot be mistaken for part of the product and does not change
 * appearance when the thing it is testing changes.
 */
import { useEffect, useMemo, useState } from 'react'
import { byId, FONT_OPTIONS, optionsFor, PRESETS } from './fontCatalog'
import {
  applyFontChoice,
  loadFontChoice,
  resetFontChoice,
  saveFontChoice,
  type FontChoice,
  type FontRole,
  type Smoothing,
} from './fontState'

const ROLES: FontRole[] = ['body', 'display', 'mono']

/** Resolve a saved stack back to its catalogue id, for the <select> value. */
function idForStack(stack: string | undefined): string {
  if (!stack) return ''
  return FONT_OPTIONS.find((o) => o.stack === stack)?.id ?? ''
}

export function FontLab() {
  const [open, setOpen] = useState(false)
  const [choice, setChoice] = useState<FontChoice>(() => loadFontChoice())
  const [loading, setLoading] = useState<string>('')
  const [failed, setFailed] = useState<string>('')

  // Re-apply on every change, and once on mount so a persisted choice
  // survives the reloads you make while judging.
  useEffect(() => {
    applyFontChoice(choice, document.documentElement)
    saveFontChoice(choice)
  }, [choice])

  const dpr = useMemo(() => (typeof window === 'undefined' ? 1 : window.devicePixelRatio), [])

  async function pick(role: FontRole, id: string) {
    if (!id) {
      setChoice((c) => ({ ...c, [role]: undefined }))
      return
    }
    const option = byId(id)
    if (!option) return
    if (option.load) {
      setLoading(id)
      setFailed('')
      try {
        await option.load()
      } catch {
        // why surface it: offline or a registry without the package is the
        // expected failure here, and silently keeping the old face would
        // look like the picker is broken.
        setFailed(option.label)
        setLoading('')
        return
      }
      setLoading('')
    }
    setChoice((c) => ({ ...c, [role]: option.stack }))
  }

  async function applyPreset(presetId: string) {
    const preset = PRESETS.find((p) => p.id === presetId)
    if (!preset) return
    setLoading(preset.label)
    setFailed('')
    const next: FontChoice = { smoothing: choice.smoothing }
    for (const role of ROLES) {
      const option = byId(preset[role])
      if (!option) continue
      if (option.load) {
        try {
          await option.load()
        } catch {
          setFailed(option.label)
        }
      }
      next[role] = option.stack
    }
    setLoading('')
    setChoice(next)
  }

  const box: React.CSSProperties = {
    position: 'fixed',
    right: 12,
    bottom: 12,
    zIndex: 99999,
    font: '12px/1.45 ui-monospace, Menlo, Consolas, monospace',
    color: '#111',
    background: '#fff',
    border: '1px solid #bbb',
    borderRadius: 8,
    boxShadow: '0 6px 24px rgba(0,0,0,.18)',
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        style={{ ...box, padding: '6px 10px', cursor: 'pointer' }}
      >
        Aa fonts
      </button>
    )
  }

  return (
    <div style={{ ...box, width: 290, padding: 12 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <strong>Font Lab</strong>
        <button type="button" onClick={() => setOpen(false)} style={{ cursor: 'pointer' }}>
          ×
        </button>
      </div>

      <div style={{ marginBottom: 10 }}>
        <div style={{ opacity: 0.65, marginBottom: 3 }}>pairings</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
          {PRESETS.map((p) => (
            <button
              key={p.id}
              type="button"
              title={p.note}
              onClick={() => void applyPreset(p.id)}
              style={{ cursor: 'pointer', padding: '3px 6px' }}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {ROLES.map((role) => (
        <label key={role} style={{ display: 'block', marginBottom: 7 }}>
          <span style={{ opacity: 0.65 }}>{role}</span>
          <select
            value={idForStack(choice[role])}
            onChange={(e) => void pick(role, e.target.value)}
            style={{ width: '100%', font: 'inherit' }}
          >
            <option value="">— shipped default —</option>
            {optionsFor(role).map((o) => (
              <option key={o.id} value={o.id} title={o.note}>
                {o.label}
              </option>
            ))}
          </select>
        </label>
      ))}

      <label style={{ display: 'block', margin: '10px 0' }}>
        <span style={{ opacity: 0.65 }}>smoothing</span>
        <select
          value={choice.smoothing ?? 'default'}
          onChange={(e) => setChoice((c) => ({ ...c, smoothing: e.target.value as Smoothing }))}
          style={{ width: '100%', font: 'inherit' }}
        >
          <option value="default">OS default (sharper at 1x)</option>
          <option value="antialiased">antialiased (thinner)</option>
        </select>
      </label>

      <div style={{ opacity: 0.65, marginBottom: 8 }}>
        display: {dpr}x {dpr < 2 ? '— low DPI, judge weight carefully' : '— retina'}
      </div>

      {loading && <div style={{ color: '#a60' }}>loading {loading}…</div>}
      {failed && <div style={{ color: '#a00' }}>could not load {failed} (offline?)</div>}

      <button
        type="button"
        onClick={() => {
          resetFontChoice(document.documentElement)
          setChoice({})
        }}
        style={{ cursor: 'pointer', width: '100%', marginTop: 4 }}
      >
        reset to shipped tokens
      </button>
    </div>
  )
}
