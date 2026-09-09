/** The mockup's `select.ctl`. */
import type { SelectHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

export function Select({ className, ...rest }: SelectHTMLAttributes<HTMLSelectElement>) {
  return (
    <select
      className={cx(
        'rounded-[7px] border border-rule-strong bg-bg px-[9px] py-[7px] text-[0.75rem] text-ink-soft',
        className,
      )}
      {...rest}
    />
  )
}
