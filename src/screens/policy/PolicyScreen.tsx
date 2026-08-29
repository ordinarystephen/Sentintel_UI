/** Policy library (`/policy`) — a stub route for the MVP (build-spec §4). */
import { strings } from '@/strings'

export function PolicyScreen() {
  return (
    <div>
      <h1 className="font-display text-screen-title font-semibold tracking-display">
        {strings.nav.policyLibrary}
      </h1>
      <p className="mt-1 max-w-[60ch] text-ui text-muted">{strings.policy.stub}</p>
    </div>
  )
}
