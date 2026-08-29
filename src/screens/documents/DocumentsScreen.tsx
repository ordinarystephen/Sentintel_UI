/** Documents (`/documents`, build-spec §5.5). Phase 1: heading + sub; search arrives in Phase 5. */
import { strings } from '@/strings'

export function DocumentsScreen() {
  return (
    <div>
      <h1 className="font-display text-screen-title font-semibold tracking-display">
        {strings.documents.title}
      </h1>
      <p className="mt-1 max-w-[60ch] text-ui text-muted">{strings.documents.sub}</p>
    </div>
  )
}
