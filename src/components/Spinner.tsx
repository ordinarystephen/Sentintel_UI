/** Small ring spinner. The rotation dies under reduced motion, leaving a static arc. */
export function Spinner({ label }: { label?: string }) {
  return (
    <span
      role="status"
      aria-label={label}
      className="inline-block h-3 w-3 animate-spin rounded-full border-[1.5px] border-rule-strong border-t-ink"
    />
  )
}
