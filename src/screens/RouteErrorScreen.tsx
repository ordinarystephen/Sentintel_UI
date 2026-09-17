/**
 * The route error boundary — a render crash lands HERE, in the design
 * language, never on React Router's dev page. Loud and specific: the error
 * message is shown verbatim, with a way back. Wired as `errorElement` in
 * router.tsx at two levels: inside the shell for screen crashes (rail stays
 * usable) and at the root as a last resort.
 */
import { isRouteErrorResponse, Link, useRouteError } from 'react-router-dom'
import { strings } from '@/strings'

function messageOf(error: unknown): string {
  if (isRouteErrorResponse(error)) return `${error.status} ${error.statusText}`
  if (error instanceof Error) return error.message
  return String(error)
}

export function RouteErrorScreen() {
  const s = strings.errorScreen
  const error = useRouteError()
  return (
    <div className="settle mx-auto mt-[60px] max-w-[600px]">
      <p className="micro text-faint">{s.eyebrow}</p>
      <h1 className="mt-1 mb-3 font-display text-screen-title font-semibold tracking-display">
        {s.title}
      </h1>
      <div role="alert" className="rounded-lg border border-error/40 bg-error-bg px-4 py-3">
        <p className="font-mono text-ui-sm leading-relaxed break-words text-error">
          {messageOf(error)}
        </p>
      </div>
      <p className="mt-2 text-dense text-faint">{s.intro}</p>
      <Link
        to="/crr/reviews"
        className="mt-4 inline-block text-ui text-ink underline underline-offset-2"
      >
        {s.back}
      </Link>
    </div>
  )
}
