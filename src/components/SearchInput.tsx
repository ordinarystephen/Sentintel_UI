/** The mockup's `.searchbar`: magnifier + input. */
import type { InputHTMLAttributes } from 'react'
import { SearchIcon } from '@/app/icons'
import { cx } from '@/lib/cx'

export function SearchInput({ className, ...rest }: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <span className={cx('relative min-w-[220px] flex-1', className)}>
      <SearchIcon className="pointer-events-none absolute top-[10px] left-[10px] h-[13px] w-[13px] text-faint" />
      <input
        type="search"
        className="w-full rounded-lg border border-rule-strong bg-bg py-2 pr-[11px] pl-[30px] text-ui"
        {...rest}
      />
    </span>
  )
}
