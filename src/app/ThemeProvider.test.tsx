import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { STORAGE_KEY } from './theme'
import { ThemeControls } from './ThemeControls'
import { ThemeProvider } from './ThemeProvider'

function renderControls() {
  return render(
    <ThemeProvider>
      <ThemeControls />
    </ThemeProvider>,
  )
}

describe('theme provider', () => {
  it('defaults to Stone light with no body classes', () => {
    renderControls()
    expect(document.body.classList.contains('dark')).toBe(false)
    expect(document.body.classList.contains('theme-cobalt')).toBe(false)
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('stone')
    expect(screen.getByRole('button', { name: 'Toggle dark mode' })).toHaveAttribute(
      'aria-pressed',
      'false',
    )
  })

  it('moon toggle flips dark within the chosen family and persists', async () => {
    const user = userEvent.setup()
    renderControls()
    await user.click(screen.getByRole('button', { name: 'Toggle dark mode' }))
    expect(document.body.classList.contains('dark')).toBe(true)
    expect(JSON.parse(localStorage.getItem(STORAGE_KEY)!)).toEqual({ family: 'stone', dark: true })
  })

  it('selecting Cobalt swaps the family class and keeps the dark flag', async () => {
    const user = userEvent.setup()
    renderControls()
    await user.click(screen.getByRole('button', { name: 'Toggle dark mode' }))
    await user.selectOptions(screen.getByRole('combobox', { name: 'Theme' }), 'cobalt')
    expect(document.body.className.split(' ').sort()).toEqual(['dark', 'theme-cobalt'])
    await user.selectOptions(screen.getByRole('combobox', { name: 'Theme' }), 'stone')
    expect(document.body.className.split(' ')).toEqual(['dark'])
  })

  it('restores a persisted preference on mount', () => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify({ family: 'cobalt', dark: true }))
    renderControls()
    expect(document.body.classList.contains('theme-cobalt')).toBe(true)
    expect(document.body.classList.contains('dark')).toBe(true)
    expect(screen.getByRole('combobox', { name: 'Theme' })).toHaveValue('cobalt')
  })

  it('ignores corrupt storage and falls back to the default', () => {
    localStorage.setItem(STORAGE_KEY, '{"family":"neon","dark":"yes"}')
    renderControls()
    expect(document.body.className).toBe('')
  })
})
