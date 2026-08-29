import { Link } from 'react-router-dom'
import { strings } from '@/strings'

export function NotFoundScreen() {
  return (
    <div>
      <h1 className="font-display text-screen-title font-semibold tracking-display">
        {strings.notFound.title}
      </h1>
      <p className="mt-1 text-ui text-muted">{strings.notFound.body}</p>
      <Link to="/" className="mt-3 inline-block text-ui underline underline-offset-2">
        {strings.notFound.home}
      </Link>
    </div>
  )
}
