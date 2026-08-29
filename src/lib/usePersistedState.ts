/**
 * useState backed by localStorage. Used for per-user UI preferences that must
 * survive a refresh (rail collapse, context-rail collapse). Reads once on
 * mount, writes on every change, and degrades to plain state when storage is
 * unavailable. Keys are namespaced `sentinel.<name>`.
 */
import { useCallback, useState, type Dispatch, type SetStateAction } from 'react'

export function storageKey(name: string): string {
  return `sentinel.${name}`
}

export function readPersisted<T>(name: string, fallback: T, validate: (v: unknown) => v is T): T {
  try {
    const raw = localStorage.getItem(storageKey(name))
    if (raw === null) return fallback
    const parsed: unknown = JSON.parse(raw)
    return validate(parsed) ? parsed : fallback
  } catch {
    return fallback
  }
}

export function usePersistedState<T>(
  name: string,
  fallback: T,
  validate: (v: unknown) => v is T,
): [T, Dispatch<SetStateAction<T>>] {
  const [value, setValue] = useState<T>(() => readPersisted(name, fallback, validate))
  const set = useCallback<Dispatch<SetStateAction<T>>>(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? (next as (p: T) => T)(prev) : next
        try {
          localStorage.setItem(storageKey(name), JSON.stringify(resolved))
        } catch {
          /* storage unavailable: session-only */
        }
        return resolved
      })
    },
    [name],
  )
  return [value, set]
}

export const isBoolean = (v: unknown): v is boolean => typeof v === 'boolean'
