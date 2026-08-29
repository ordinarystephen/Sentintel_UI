/** Loud, specific failure banner (§5.2/§6): the backend's message, verbatim. */
export function ErrorBanner({ message, eyebrow }: { message: string; eyebrow?: string }) {
  return (
    <div
      role="alert"
      className="rounded-lg border border-error/40 bg-error-bg px-4 py-3 text-error"
    >
      {eyebrow && <p className="micro mb-1 text-error">{eyebrow}</p>}
      <p className="text-ui leading-relaxed">{message}</p>
    </div>
  )
}
