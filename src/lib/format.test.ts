import { describe, expect, it } from 'vitest'
import {
  formatBytes,
  formatConfidence,
  formatDate,
  formatRelative,
  formatTime,
  shortOutlook,
} from './format'

describe('formatters', () => {
  const now = new Date(2026, 7, 29, 12, 0, 0)
  it('relative dates', () => {
    expect(formatRelative(new Date(2026, 7, 29, 1).toISOString(), now)).toBe('today')
    expect(formatRelative(new Date(2026, 7, 28, 23).toISOString(), now)).toBe('yesterday')
    expect(formatRelative(new Date(2026, 7, 21, 9).toISOString(), now)).toBe('Aug 21')
    expect(formatRelative(new Date(2025, 10, 3, 9).toISOString(), now)).toBe('Nov 3, 2025')
  })
  it('absolute date and time', () => {
    const iso = new Date(2026, 7, 28, 9, 42).toISOString()
    expect(formatDate(iso)).toBe('2026-08-28')
    expect(formatTime(iso)).toBe('09:42')
  })
  it('confidence, bytes, outlook', () => {
    expect(formatConfidence(0.41)).toBe('conf 41%')
    expect(formatConfidence(0.945)).toBe('conf 95%')
    expect(formatBytes(2_516_582)).toBe('2.4 MB')
    expect(formatBytes(812 * 1024)).toBe('812 KB')
    expect(shortOutlook('Negative')).toBe('Neg')
  })
})
