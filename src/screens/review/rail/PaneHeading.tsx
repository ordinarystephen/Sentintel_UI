import { cx } from '@/lib/cx'

export function PaneHeading({ children, first = false }: { children: string; first?: boolean }) {
  return (
    <h4 className={cx('micro mb-2 tracking-[0.1em]', first ? 'mt-0' : 'mt-3.5')}>{children}</h4>
  )
}
