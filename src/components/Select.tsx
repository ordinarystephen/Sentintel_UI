/** The mockup's `select.ctl`. */
import type { SelectHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        'rounded-[7px] border border-rule-strong bg-bg px-[9px] py-[7px] text-[12px] text-ink-soft',
        className,
      )}
      {...rest}
    />
  )
}
