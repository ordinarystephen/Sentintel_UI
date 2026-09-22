import { beforeEach, describe, expect, it } from 'vitest'
import {
  applyFontChoice,
  describeDensity,
  loadFontChoice,
  resetFontChoice,
  ROLE_VARS,
  saveFontChoice,
  STORAGE_KEY,
} from './fontState'

describe('font lab overrides', () => {
  let root: HTMLElement

  beforeEach(() => {
    root = document.createElement('html')
    localStorage.clear()
  })

  it('writes each role onto its custom property', () => {
    applyFontChoice({ body: 'Body Face', display: 'Display Face', mono: 'Mono Face' }, root)
    expect(root.style.getPropertyValue(ROLE_VARS.body)).toBe('Body Face')
    expect(root.style.getPropertyValue(ROLE_VARS.display)).toBe('Display Face')
    expect(root.style.getPropertyValue(ROLE_VARS.mono)).toBe('Mono Face')
  })

  it('leaves untouched roles on the shipped token', () => {
    applyFontChoice({ body: 'Body Face' }, root)
    expect(root.style.getPropertyValue(ROLE_VARS.display)).toBe('')
  })

  it('reset removes every override', () => {
    applyFontChoice({ body: 'A', display: 'B', mono: 'C', smoothing: 'antialiased' }, root)
    resetFontChoice(root)
    for (const v of Object.values(ROLE_VARS)) expect(root.style.getPropertyValue(v)).toBe('')
    expect(root.style.getPropertyValue('-webkit-font-smoothing')).toBe('')
  })

  it('applies antialiasing only when asked', () => {
    applyFontChoice({ smoothing: 'antialiased' }, root)
    expect(root.style.getPropertyValue('-webkit-font-smoothing')).toBe('antialiased')
    applyFontChoice({ smoothing: 'default' }, root)
    expect(root.style.getPropertyValue('-webkit-font-smoothing')).toBe('')
  })

  it('round-trips through storage', () => {
    saveFontChoice({ body: 'Persisted' })
    expect(loadFontChoice()).toEqual({ body: 'Persisted' })
  })

  it('survives unreadable or corrupt storage', () => {
    localStorage.setItem(STORAGE_KEY, 'not json')
    expect(loadFontChoice()).toEqual({})
  })
})

describe('density readout', () => {
  it('rounds the raw float the browser reports', () => {
    expect(describeDensity(0.8999999761581421).label).toBe('0.9x')
    expect(describeDensity(2).label).toBe('2x')
  })

  it('flags sub-1:1 as downscaling, not as low DPI', () => {
    const d = describeDensity(0.9)
    expect(d.warn).toBe(true)
    expect(d.hint).toMatch(/scaled DOWN/)
    expect(d.hint).toMatch(/Ctrl\+0/)
  })

  it('flags fractional scaling above 1', () => {
    expect(describeDensity(1.25).warn).toBe(true)
  })

  it('treats 1x and retina as fine', () => {
    expect(describeDensity(1).warn).toBe(false)
    expect(describeDensity(2).warn).toBe(false)
  })
})
