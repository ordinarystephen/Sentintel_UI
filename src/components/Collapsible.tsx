/**
 * Accordion body using the mockup's `grid-template-rows: 0fr → 1fr` technique
 * (~280ms ease). Closed content is made `inert` so it drops out of the tab
 * order; once open and settled, overflow is released so nothing inside clips.
 */
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { cx } from '@/lib/cx'

export function Collapsible({
  open,
  id,
  children,
}: {
  open: boolean
  id?: string
  children: ReactNode
}) {
  const inner = useRef<HTMLDivElement>(null)
  const [settled, setSettled] = useState(open)

  useEffect(() => {
    inner.current?.toggleAttribute('inert', !open)
    if (!open) {
      setSettled(false)
      return
    }
    const t = window.setTimeout(() => setSettled(true), 300)
    return () => window.clearTimeout(t)
  }, [open])

  return (
    <div
      id={id}
      className="grid transition-[grid-template-rows] duration-[280ms] ease-out"
      style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
    >
      <div
        ref={inner}
        className={cx('min-h-0', open && settled ? 'overflow-visible' : 'overflow-hidden')}
      >
        {children}
      </div>
    </div>
  )
}
