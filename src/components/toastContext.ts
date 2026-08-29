import { createContext, useContext } from 'react'

export interface ToastInput {
  message: string
  tone?: 'neutral' | 'success' | 'error'
}

export interface ToastContextValue {
  toast: (t: ToastInput) => void
}

export const ToastContext = createContext<ToastContextValue | null>(null)

export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext)
  if (!ctx) throw new Error('useToast must be used inside <ToastProvider>')
  return ctx
}
