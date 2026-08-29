/**
 * Modal dialog: overlay on the `--overlay` token, Esc and overlay-click close,
 * focus moves to the close button on open and returns on close.
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
  const restoreRef = useRef<HTMLElement | null>(null)

  useEffect(() => {
    restoreRef.current = document.activeElement as HTMLElement | null
    closeRef.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
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
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-title"
        className="max-h-[88vh] w-full max-w-[760px] overflow-auto rounded-xl bg-bg shadow-md"
      >
        <div className="flex items-center gap-[10px] border-b border-rule px-[18px] py-[14px]">
          <h3 id="modal-title" className="flex-1 text-[14px] font-semibold">
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
