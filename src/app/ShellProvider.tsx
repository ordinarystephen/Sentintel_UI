import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { isBoolean, usePersistedState } from '@/lib/usePersistedState'
import { ShellContext, type CurrentReview, type ShellContextValue } from './ShellContext'

export function ShellProvider({ children }: { children: ReactNode }) {
  const [railCollapsed, setRail] = usePersistedState('rail.collapsed', false, isBoolean)
  const [ctxCollapsed, setCtx] = usePersistedState('ctx.collapsed', false, isBoolean)
  const [currentReview, setCurrentReview] = useState<CurrentReview | null>(null)
  const [selectedItemId, setSelectedItemId] = useState<string | null>(null)

  const setRailCollapsed = useCallback((v: boolean) => setRail(v), [setRail])
  const setCtxCollapsed = useCallback((v: boolean) => setCtx(v), [setCtx])

  const value = useMemo<ShellContextValue>(
    () => ({
      railCollapsed,
      setRailCollapsed,
      ctxCollapsed,
      setCtxCollapsed,
      currentReview,
      setCurrentReview,
      selectedItemId,
      setSelectedItemId,
    }),
    [railCollapsed, setRailCollapsed, ctxCollapsed, setCtxCollapsed, currentReview, selectedItemId],
  )
  return <ShellContext.Provider value={value}>{children}</ShellContext.Provider>
}
