/**
 * Shell state shared between the rails and the screens (build-spec §4):
 * - left-rail collapse and context-rail collapse (both persisted per user),
 * - the "current review" a review screen registers so the left rail can show
 *   its contextual zone and the right context rail can appear.
 */
import { createContext, useContext, useEffect } from 'react'

export type SectionStatus = 'populated' | 'pending' | 'attention'

export interface CurrentReview {
  id: string
  name: string
  openItems: number
  sections: ReadonlyArray<{ n: number; status: SectionStatus }>
}

export interface ShellContextValue {
  railCollapsed: boolean
  setRailCollapsed: (collapsed: boolean) => void
  ctxCollapsed: boolean
  setCtxCollapsed: (collapsed: boolean) => void
  currentReview: CurrentReview | null
  setCurrentReview: (review: CurrentReview | null) => void
}

export const ShellContext = createContext<ShellContextValue | null>(null)

export function useShell(): ShellContextValue {
  const ctx = useContext(ShellContext)
  if (!ctx) throw new Error('useShell must be used inside <ShellProvider>')
  return ctx
}

/** A review screen calls this to own the rails while mounted. Memoize `review`. */
export function useRegisterCurrentReview(review: CurrentReview | null): void {
  const { setCurrentReview } = useShell()
  useEffect(() => {
    setCurrentReview(review)
    return () => setCurrentReview(null)
  }, [review, setCurrentReview])
}
