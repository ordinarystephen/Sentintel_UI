/**
 * Owns the theme preference: reads it once from storage, mirrors it onto
 * <body> as classes, and persists every change. See ./theme.ts for the model.
 */
import { useCallback, useLayoutEffect, useMemo, useState, type ReactNode } from 'react'
import { ThemeContext, type ThemeContextValue } from './ThemeContext'
import { applyTheme, readTheme, writeTheme, type ThemeFamily, type ThemePref } from './theme'

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [pref, setPref] = useState<ThemePref>(readTheme)

  useLayoutEffect(() => {
    applyTheme(pref)
    writeTheme(pref)
  }, [pref])

  const setFamily = useCallback((family: ThemeFamily) => {
    setPref((p) => ({ ...p, family }))
  }, [])
  const toggleDark = useCallback(() => {
    setPref((p) => ({ ...p, dark: !p.dark }))
  }, [])

  const value = useMemo<ThemeContextValue>(
    () => ({ ...pref, setFamily, toggleDark }),
    [pref, setFamily, toggleDark],
  )

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}
