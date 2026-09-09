/**
 * Toasts — quiet confirmations and loud, specific errors (§5.3: export errors
 * surface in-app as toast + message, never a raw error page). Errors stay
 * until dismissed; others fade after a few seconds.
 */
import { useCallback, useMemo, useState, type ReactNode } from 'react'
import { cx } from '@/lib/cx'
import { ToastContext, type ToastInput } from './toastContext'
import { strings } from '@/strings'

interface Toast extends ToastInput {
  id: number
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const dismiss = useCallback((id: number) => setToasts((t) => t.filter((x) => x.id !== id)), [])
  const toast = useCallback(
    (input: ToastInput) => {
      const id = Date.now() + Math.random()
      setToasts((t) => [...t, { id, ...input }])
      if (input.tone !== 'error') window.setTimeout(() => dismiss(id), 6000)
    },
    [dismiss],
  )
  const value = useMemo(() => ({ toast }), [toast])
  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 bottom-4 z-[80] flex w-[min(420px,calc(100vw-32px))] flex-col gap-2">
        {toasts.map((t) => (
          <div
            key={t.id}
            role={t.tone === 'error' ? 'alert' : 'status'}
            className={cx(
              'pointer-events-auto flex items-start gap-3 rounded-lg border px-3.5 py-2.5 text-ui-sm shadow-md',
              t.tone === 'error'
                ? 'border-error/40 bg-error-bg text-error'
                : t.tone === 'success'
                  ? 'border-success-line bg-success-bg text-success'
                  : 'border-rule bg-bg text-ink',
            )}
          >
            <span className="flex-1 leading-relaxed">{t.message}</span>
            <button
              type="button"
              aria-label={strings.app.dismissToast}
              onClick={() => dismiss(t.id)}
              className="text-[0.75rem] opacity-70 hover:opacity-100"
            >
              ✕
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
