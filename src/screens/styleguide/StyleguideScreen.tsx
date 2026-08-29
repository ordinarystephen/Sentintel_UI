/**
 * Styleguide — Phase 0 placeholder that demonstrates the typography roles
 * (build-spec §3.2) and the status-only color discipline (§3.1) in every theme.
 * Not a product screen. It stays in the repo as a living type/token reference
 * for developers; it is never linked from product navigation.
 */
import { Badge } from '@/components/Badge'

export function StyleguideScreen() {
  return (
    <div className="flex flex-col gap-10">
      <section>
        <p className="micro text-faint">Credit analysis</p>
        <h1 className="mt-1 font-display text-screen-title font-semibold tracking-display text-balance">
          Start a review
        </h1>
        <p className="mt-1 max-w-[52ch] text-ui text-muted">
          Serif for the names of things; sans for the interface; mono for identifiers. Color is
          spent on status only.
        </p>
      </section>

      <section className="flex flex-col gap-2 border-t border-rule pt-5">
        <p className="micro">Names of things · font-display</p>
        <div className="flex flex-wrap items-baseline gap-3">
          <span className="font-display text-borrower font-semibold tracking-display">
            Meridian US Holdco LLC
          </span>
          <span className="micro text-faint">CL6430</span>
        </div>
        <h2 className="font-display text-section-title font-semibold">2 · Financial analysis</h2>
        <blockquote className="border-l-2 border-rule-strong pl-3 font-display text-ui italic text-ink-soft">
          Revolver availability at quarter end was $42.0 million, net of $6.5 million in letters of
          credit.
          <span className="ml-2 font-mono text-micro not-italic text-faint">p. 12</span>
        </blockquote>
      </section>

      <section className="flex flex-col gap-2 border-t border-rule pt-5">
        <p className="micro">Interface · font-body</p>
        <p className="max-w-[64ch] text-ui-sm leading-relaxed text-ink-soft">
          Running UI text at 12.5–13px. Dense metadata sits at 11–11.5px in muted ink. Figures that
          align use tabular numerals:{' '}
          <b className="font-semibold text-ink tabular-nums">5.6x → 5.9x</b>.
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            className="inline-flex items-center gap-[7px] rounded-lg border border-transparent bg-primary px-4 py-2 text-ui font-medium text-on-ink hover:brightness-115"
          >
            Export Review
          </button>
          <button
            type="button"
            className="inline-flex items-center gap-[7px] rounded-lg border border-rule-strong bg-bg px-4 py-2 text-ui font-medium hover:bg-bg-hover"
          >
            Cancel this review
          </button>
          <button type="button" className="text-micro text-muted underline underline-offset-2">
            Advanced extraction settings
          </button>
        </div>
      </section>

      <section className="flex flex-col gap-2 border-t border-rule pt-5">
        <p className="micro">Identifiers · font-mono</p>
        <p className="font-mono text-[12px] text-ink-soft">
          Meridian_10K_FY2025.pdf · 2026-02-14 · p. 12 · POL-CR-014 · §2.3
        </p>
        <div className="flex flex-wrap items-center gap-2">
          <span className="rounded border border-rule-strong bg-bg-subtle px-[7px] font-mono text-[10px] text-muted">
            conf 94%
          </span>
          <span className="rounded border border-warn-line bg-warn-bg px-[7px] font-mono text-[10px] text-warn">
            conf 41% · low
          </span>
        </div>
      </section>

      <section className="flex flex-col gap-3 border-t border-rule pt-5">
        <p className="micro">Status color · nothing else is colored</p>
        <div className="flex flex-wrap items-center gap-2">
          <Badge dot>ready</Badge>
          <Badge tone="green">6/6 sections</Badge>
          <Badge tone="amber">4 open</Badge>
          <Badge tone="indigo">Term loan B</Badge>
          <Badge tone="slate">read-only</Badge>
          <span className="rounded border border-error/30 bg-error-bg px-[7px] text-[10px] text-error">
            dissent
          </span>
        </div>
        <div className="rounded-md border border-error/30 bg-error-bg px-3 py-2 text-ui-sm text-error shadow-md">
          Export failed: the render service returned no document for CL6430.
        </div>
      </section>

      <section className="flex flex-col gap-2 border-t border-rule pt-5">
        <p className="micro">Rail tokens · themed independently of the canvas</p>
        <div className="flex w-[236px] flex-col gap-0.5 rounded-lg border border-rail-rule bg-rail-bg p-3 shadow-sm text-ui text-rail-fg">
          <span className="relative rounded-[7px] bg-rail-active-bg px-[10px] py-[7px] font-semibold text-rail-active-fg before:absolute before:top-[7px] before:bottom-[7px] before:-left-3 before:w-[3px] before:rounded-r-sm before:bg-rail-bar">
            Home
          </span>
          <span className="rounded-[7px] px-[10px] py-[7px] hover:bg-rail-hover">My reviews</span>
          <span className="rounded-[7px] px-[10px] py-[7px] text-rail-fg-muted">
            Policy library
          </span>
        </div>
      </section>

      <p className="mt-2 border-t border-rule pt-3 text-micro text-faint">
        Sentinel is not the system of record. Confirm figures against the source documents before
        relying on them.
      </p>
    </div>
  )
}
