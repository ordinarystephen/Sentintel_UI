/** Landing (`/`, build-spec §5.1). Phase 1: heading + copy; upload and recents arrive in Phase 3. */
export function LandingScreen() {
  return (
    <div className="mx-auto mt-[26px] max-w-[600px]">
      <p className="micro text-faint">Credit analysis</p>
      <h1 className="mt-1 mb-1 font-display text-screen-title font-semibold tracking-display text-balance">
        Start a review
      </h1>
      <p className="mb-5 max-w-[52ch] text-ui text-muted">
        Drop the documents for one borrower. Sentinel reads them, runs the policy checks, and
        assembles the work paper.
      </p>
    </div>
  )
}
