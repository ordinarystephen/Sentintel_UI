/**
 * Modal dialog: overlay on the `--overlay` token, Esc and overlay-click close,
 * focus moves to the close button on open, is trapped inside, and returns on close.
 */
import { useEffect, useRef, type ReactNode } from 'react'

export function Modal({
  title,
  onClose,
  closeLabel,
  children,
}: {
  title: string
  onClose: () => void
  closeLabel: string
  children: ReactNode
}) {
  const closeRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      // Focus stays inside the dialog: Tab / Shift+Tab wrap around.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = Array.from(
          dialogRef.current.querySelectorAll<HTMLElement>(
            'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
          ),
        )
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        const active = document.activeElement
        if (e.shiftKey && (active === first || !dialogRef.current.contains(active))) {
          e.preventDefault()
          last.focus()
        } else if (!e.shiftKey && active === last) {
          e.preventDefault()
          first.focus()
        }
      }
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      restoreRef.current?.focus?.()
    }
  }, [onClose])

  return (
    <div
      className="fixed inset-0 z-[70] flex items-center justify-center bg-overlay p-5"
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="max-h-[88vh] w-full max-w-[760px] overflow-auto rounded-xl bg-bg shadow-md"
      >
        <div className="flex items-center gap-[10px] border-b border-rule px-[18px] py-[14px]">
          <h3 id="modal-title" className="flex-1 text-[0.875rem] font-semibold">
            {title}
          </h3>
          <button
            ref={closeRef}
            type="button"
            aria-label={closeLabel}
            onClick={onClose}
            className="grid h-7 w-7 place-items-center rounded-md text-muted hover:bg-bg-hover"
          >
            ✕
          </button>
        </div>
        <div className="px-[18px] py-4">{children}</div>
      </div>
    </div>
  )
}
