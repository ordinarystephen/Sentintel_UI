# Sentinel UI/UX — Running Decision Tab

Steve's running keep/cut ledger for the Sentinel UI redesign, maintained across design-workshop sessions. Living mockup: https://claude.ai/code/artifact/2c5b4187-08cf-4fd6-89da-1d305d7c2ecf (file: `sentinel-mvp-concept.html`). Last updated 2026-09-09. **Status: HANDED OFF — `main` tagged `v1.0-handoff`, certified on a literal clean clone (make install && make build && make run), full chain green (94 unit, 83 Playwright browser mode + hash mode verified, 3 Flask). This tag is what the development team inherits.** Design rounds shipped along the way: v0.1-handoff → v0.3-domino-patterns → v0.4-copy-and-setup → v0.5-doc-browser → v1.0-handoff (assessment layer + reference data); the environment/portability round merged untagged between v0.1 and v0.3. This ledger plus the mockup and the build spec are the sources of truth. Resolved 2026-09-09: Stone light `--muted` darkened #78716c → #746d67 (4.75:1 on `--bg-subtle`); contrast audit regenerated and the mockup's `:root` synced.

**Environment & portability round (2026-08-28):** verified — 4 runtime deps (react, react-dom, react-router-dom, @tanstack/react-query), no native compilation anywhere (only prebuilt platform binaries from esbuild/rollup/tailwind-oxide/lightningcss — Nexus must mirror the linux-x64 gnu+musl entries), fully offline after `npm ci`, static `dist/` build servable by any file server (SPA fallback required for deep-link refresh), `VITE_BASE_PATH` makes the whole app relocatable behind a proxy prefix (verified under `/sentinel/`). `docs/environment.md` + `docs/runbook.md` (26-step guided tour) added. Target hosting: Domino, Steve porting.

**Domino patterns round (`v0.3-domino-patterns`):** POC serving patterns inherited — committed `.npmrc` (engine-strict, Nexus placeholder), Flask serving wrapper verbatim from the POC (catch-all with file→index.html→placeholder, api/ guard, PORT→8082), `app.sh`, hash-router escape hatch (`VITE_ROUTER=hash`) as plan B if the published-App proxy prefix proves unstable, relative-URL hard rules in api-handoff. Two blanks only Domino can fill: real Nexus registry URL, published-App proxy prefix. `docs/poc-serving-patterns.md` committed.

**Copy & setup round (`v0.4-copy-and-setup`):** POC-verb Makefile (`make install/build/run/dev`); ALL user-facing copy centralized — `src/strings.ts` (by screen, `{placeholder}` templates, `countOne/countOther` plural pairs), mock-backend messages in a `MESSAGES` block, demo data banner in `fixtures.ts`, Flask placeholder as an EDIT ME constant; `docs/editing-copy.md` maps what-you-see → where-to-edit; `npm run check:copy` enforces that wording changes never touch components. Steve can edit copy live via `make dev` hot reload. Next: Steve's full local UI/UX test pass.

## Current build stack

The new UI is a **greenfield standalone repo** (see build spec §2): Vite + React 18 + TypeScript strict + Tailwind + React Router + TanStack Query, mock API seam, no backend in-repo. (For reference, the prior POC was React + TypeScript + Tailwind on Flask — that codebase is reference-only and nothing is imported from it.)

## Keeping

**Data model nuances (2026-08-28)**
- There is no review "type": annual/thematic/target distinctions do not exist. A review is a review; only the supporting documentation differs, and that is not a tag, filter, or header label. The review header is borrower name + ID only (e.g. "Meridian US Holdco LLC · CL6430").
- One deliverable, one export: the rendered Word review, labeled **"Export Review"**. No Excel export.
- **Line of business** is a real filter dimension (IB Lending / Wealth Management / Counterparty Credit Risk) on the All-reviews list and the Documents search.
- Every extracted or input workpaper item carries an inline **confidence score** (quiet mono chip, e.g. `conf 94%`; amber below the floor, paired with the review-required flag — the same threshold the export enforces).

**Structure and navigation**
- GitHub-modeled fixed left rail: Home, My reviews, All reviews, Documents, Policy library (candidate). Collapse control at the foot; collapses to an icon strip. Rail never scrolls with content; only the main working area scrolls.
- Contextual "current review" zone under the app nav when inside a review; section numbers act as icons in the collapsed strip.
- Review page order: the story/summary first, then a collapsible NEEDS YOUR ATTENTION block (count badge visible when collapsed), then the workpaper.
- Sticky borrower bar: borrower name + ID + Export Review pinned while the workpaper scrolls.
- **Areas of assessment** (added 2026-09-09 from a real workpaper example): the management-summary verdict layer — each major review topic (transaction structure/underwriting, repayment capacity primary/secondary, portfolio management, regulatory classification, PD, LGD, traded products) with a rating disposition (satisfactory / unsatisfactory / n-a / pending) and a reason narrative. Sits between the attention block and the workpaper; the whole zone is collapsible (like the attention block) with the pending count remaining visible on the collapsed header, and each area row collapses individually. Ratings are analyst dispositions (AI-suggested once reasoning is live; advocate/dissent feed contested ones), recorded to the review record; a pending area names its blocker and deep-links to the section; the exported review opens with this table (screen = deliverable).
- **Entity reference data, sparingly** (added 2026-09-09): upstream credit-system facts (credit officer, PD/PD CRR, facility, accrual status) and CRR-internal designations (reference number, portfolio-bucket industry) behind one collapsed disclosure under the sub line, each value marked by origin, upstream values carrying an as-of snapshot date. Not rendered when feeds are absent. Prepared-by/reviewed-by deliberately omitted for MVP (owner is already in the record; RIC sign-off is stage 2).
- Inline collapsible workpaper: one document flow, serif section titles on hairline rules. (Supersedes the section card grid and the separate drill-in screen.)
- Attention items and rail section numbers deep-link: expand the target section and scroll to it.
- Right context rail on the review screen: follows the selected workpaper item, collapsible, four tabs —
  - *Why*: how the content got here (template concept → resolution tier → source page → flags) plus the policies/standards applied, with links.
  - *Respond*: free-text response to Sentinel with send-and-re-run; mark verified; clear content as Not applicable or Incorrect. Cleared content stays **on screen**, struck through with the rationale beside it (the QC trail is visible while working); the **exported review simply renders without it**. Nothing silently deleted.
  - *Debate*: advocate and dissent agent positions with citations; advisory only, analyst disposition decides; both positions ride into the review record.
  - *Prior*: "what changed since last review" deltas when the borrower has prior reviews (distinct from the story timeline, which compares documents within this run). Links to the prior review.
- Landing: files-only upload (no metadata form) + optional context/questions text zone; extraction settings demoted behind an "Advanced" link; hero + recent reviews below.
- Processing: calm/ambient (one line, one bar, no pipeline anatomy), Cancel present, persistence promised out loud; a new review appears as "New review — reading…" until the borrower is detected, then renames itself.
- Reviews screen: My/All tabs; All = team-wide read-only view with search + filters (line of business, owner, period) and absolute timestamps — built for hundreds of reviews. Repeat coverage is first-class: the same borrower can appear multiple times (material-change re-reviews), with a repeat-count chip.
- Documents screen, two states (revised 2026-08-31 from Steve's test pass): **browse** shows clean rows only — filename, extraction status, LOB, date; no preview text. Selecting a row reveals its actions: Preview extracted text, Download original, and "Used in [borrower] review →" when applicable (post-select option list still open). **Search** (query active) shows matched passages with terms marked — evidence of the match, not decoration. Preview opens a modal of the extracted text organized by the document's own sections with page ranges; not-yet-extracted documents show the preview action disabled. Badge semantics settled 2026-09-09 in the repo's favor: slate "not yet extracted" (extraction is not a user action on this screen, so amber's call-to-action signal would mislead); mockup synced to match.

**Visual language**
- Warm stone palette as default (ink #1c1917 family), replacing pure zinc. Color stays reserved for status.
- Serif (New York/Georgia) promoted to the names of things: borrower, screen titles, workpaper section titles. UI labels stay sans. Serif italic remains the evidence voice.
- Quiet motion: ~150ms stagger settle on screen content, easing accordions, neutral one-time flash on deep-link targets. All disabled under prefers-reduced-motion. Calm, never bouncy.
- Theme selection on one token contract: Stone (default) and Cobalt (Steve's navy palette: primary #19398d, dark navy sidebar #001B3C, cool light ground #f3f5fb), each with a real dark variant; moon toggle flips dark within the chosen family.
- Light-theme contrast fix (ratified 2026-08-28): `--faint` darkened to `#8a837b` in Stone light (also `--rail-fg-muted`) and `#76839d` in Cobalt light, bringing micro-labels, timestamps, and rail glyphs to ≥3:1. Dark themes unchanged (already passing). Mockup and repo tokens both updated.

**Principles**
- Screen = deliverable: whatever the exported DOCX flags (e.g. REVIEW REQUIRED on low-OCR values), the screen shows in place. The screen may additionally show working state (struck cleared content, dispositions) that the export omits — the export is always the clean rendered document.
- Provenance everywhere: page number on the evidence quote line; source modal kept (evidence one click away, section views stay clean).
- Explainability is a surface, not a tooltip: every AI output can show its reasoning chain and the standards it was held to (right rail "Why").
- Honest seams: "reasoning stubbed" labeled, retrieved-snippets disclosure preserved; assessment factors live inside the section they assess.
- Flags are actionable: confidence inline, dismissable, linked to their section.
- Read-only parsed content + dispositionable findings (mark reviewed with note, un-review, note editing, clear-with-reason) is the MVP edit boundary.

## Ratified — build round 1 (2026-08-28)

Decisions from the Phase 0–6 build review, now settled:
- "Send & re-run" scope: the single selected item. The analyst's text records as a `responded` disposition and drives the re-run.
- Clear rationale: a required one-line note field in the UI for both Not applicable and Incorrect. UI validation is NOT the enforcement point — the handoff docs must state that the server enforces a substantive rationale (more than the category label).
- Read-only (non-owner) reviews: Prior tab visible, Export Review allowed; dispositions and clearing hidden.
- Line of business: the review is authoritative; documents carry a denormalized copy for search.
- `DebatePosition` contract frozen as `{ itemId, stance, text, citations[] }` plus a timestamp (and run id) added before the dev team builds the producer.
- Ratified as built: Tailwind v4; `--overlay` token; `ReviewStatus` gains `failed | cancelled`; `getPriorDeltas` returns `{ priorReviewId, priorDate, deltas }`; real advanced search (quoted phrases, `-exclusions`); desktop-only below 760px accepted as a documented known limitation; docs screenshots stay in git; spec lives at `docs/build-spec.md`.
- Demo identity: `me()` displays "Costello, Stephen"; production identity comes from the firm's credential management system ("Last, First" display format).
- Developer environment: internal Nexus package repository, configured via environment variables (`.npmrc`); dev team's first task is re-locking dependencies against Nexus. Assume evergreen Chrome/Edge, Node LTS.

## Cut

- Review types (annual/thematic/target) as tags, filters, or header labels — cut 2026-08-28.
- Excel export — cut 2026-08-28; "Export Review" (Word) is the only export.
- Stamp motif (letterpress review stamp) — cut 2026-08-28 after trial.
- Permanently disabled dark-mode button (replaced by the real theme system).
- Section card grid and separate section drill-in screen (superseded by the inline collapsible workpaper).
- Three-step mode/config wizard from the analyst path; the other five POC modes leave the analyst flow entirely.
- Rail as a history-only list (superseded by app navigation).

## Open

- Right-rail tab naming: "Why / Respond / Debate / Prior" is placeholder — Steve wants to rethink it.
- Rail slots 5–6: Policy library sketched; QC queue (stage 2, RIC worklist) and Templates are the other candidates.
- Left-nav naming workshop: "My reviews" / "All reviews" are placeholders.
- Advocate/dissent producer architecture (server-side) — UI contract frozen; the engine behind it is future work.
- 21st.dev component/behavior pass planned later with Claude Code (interaction stage, not design stage).