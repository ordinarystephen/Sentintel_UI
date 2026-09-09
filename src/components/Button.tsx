/** Buttons — the mockup's `.btn` (primary / outline, small) and `.link` (quiet) atoms. */
import type { ButtonHTMLAttributes } from 'react'
import { cx } from '@/lib/cx'

type Variant = 'primary' | 'outline' | 'link' | 'quiet'

const BASE: Record<Variant, string> = {
  primary:
    'inline-flex items-center gap-[7px] rounded-lg border border-transparent bg-primary font-medium text-on-ink hover:brightness-115',
  outline:
    'inline-flex items-center gap-[7px] rounded-lg border border-rule-strong bg-bg font-medium hover:bg-bg-hover',
  link: 'text-[0.75rem] text-ink underline underline-offset-2',
  quiet: 'text-[0.75rem] text-muted underline underline-offset-2 hover:text-ink',
}

export function Button({
  variant = 'outline',
  small = false,
  className,
  type = 'button',
  ...rest
}: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; small?: boolean }) {
  const sized =
    variant === 'primary' || variant === 'outline'
      ? small
        ? 'rounded-md px-[11px] py-[5px] text-[0.75rem]'
        : 'px-4 py-2 text-ui'
      : ''
  return <button type={type} className={cx(BASE[variant], sized, className)} {...rest} />
}
