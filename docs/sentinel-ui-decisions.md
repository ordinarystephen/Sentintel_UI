# Sentinel UI/UX — Running Decision Tab

Steve's running keep/cut ledger for the Sentinel UI redesign, maintained across design-workshop sessions. Living mockup: https://claude.ai/code/artifact/2c5b4187-08cf-4fd6-89da-1d305d7c2ecf (file: `sentinel-mvp-concept.html`). Last updated 2026-08-28. **Status: ready for implementation — see `build-spec.md`.** This ledger plus the mockup and the build spec are the sources of truth.

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
- Documents screen: keyword/advanced search over the index store (line of business, counterparty, document-type filters) returning documents and passages with provenance.

**Visual language**
- Warm stone palette as default (ink #1c1917 family), replacing pure zinc. Color stays reserved for status.
- Serif (New York/Georgia) promoted to the names of things: borrower, screen titles, workpaper section titles. UI labels stay sans. Serif italic remains the evidence voice.
- Quiet motion: ~150ms stagger settle on screen content, easing accordions, neutral one-time flash on deep-link targets. All disabled under prefers-reduced-motion. Calm, never bouncy.
- Theme selection on one token contract: Stone (default) and Cobalt (Steve's navy palette: primary #19398d, dark navy sidebar #001B3C, cool light ground #f3f5fb), each with a real dark variant; moon toggle flips dark within the chosen family.

**Principles**
- Screen = deliverable: whatever the exported DOCX flags (e.g. REVIEW REQUIRED on low-OCR values), the screen shows in place. The screen may additionally show working state (struck cleared content, dispositions) that the export omits — the export is always the clean rendered document.
- Provenance everywhere: page number on the evidence quote line; source modal kept (evidence one click away, section views stay clean).
- Explainability is a surface, not a tooltip: every AI output can show its reasoning chain and the standards it was held to (right rail "Why").
- Honest seams: "reasoning stubbed" labeled, retrieved-snippets disclosure preserved; assessment factors live inside the section they assess.
- Flags are actionable: confidence inline, dismissable, linked to their section.
- Read-only parsed content + dispositionable findings (mark reviewed with note, un-review, note editing, clear-with-reason) is the MVP edit boundary.

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
- Right-rail behaviors to spec for build: what "send & re-run" re-runs (item vs. section), where cleared-content reasons are captured, advocate/dissent agent architecture.
- 21st.dev component/behavior pass planned later with Claude Code (interaction stage, not design stage).
