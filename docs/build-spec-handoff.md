# Sentinel UI — Greenfield Build Spec

Date: 2026-08-28.
This is the implementation brief for building the Sentinel front end **from scratch in a new, standalone repository**. The finished repo will be handed to a development team to take over and wire to the real backend, so everything here is written for that handoff: conventional tooling, a typed API seam, mock data that makes the whole app runnable without any backend, and documentation a new developer can start from cold. Read this document fully before writing code.

## 0. Inputs and source of truth

When sources conflict, this order wins: (1) the design owner's direct instruction, (2) this spec, (3) the mockup.

1. **`design/sentinel-mvp-concept.html`** — the interactive mockup. Open it in a browser. It is the source of truth for layout, tokens (all four themes, verbatim), exact copy, spacing, and interaction feel. The pink numbered pins are design rationale — toggle with the "Design notes" button. The pins and crit chrome (top banner, bottom pill nav, pins) are **mockup-only**; never implement them in the product.
2. **This spec** — behaviors, semantics, the API contract, phasing, and acceptance criteria a static mockup can't carry.
3. **`docs/sentinel-ui-decisions.md`** — the running keep/cut ledger (copy it into the repo's `docs/`); the "why" behind decisions.

All borrower data in the mockup (Veyland US Holdco, CL6430, etc.) is fictional. It becomes the fixture data (§7).

**This repo contains no backend.** The existing Flask/React POC is a *separate* codebase; it is reference material for what the platform does, and nothing more. Do not import, port, or copy code from it. Where this spec says "the backend will…", that is a contract note for the developers who take over — in this repo it is satisfied by the mock API layer.

## 1. Context (what Sentinel is, for this build)

Sentinel is CRR's credit-review platform: a reviewer uploads the documents for one borrower, Sentinel parses and indexes them, runs policy checks, and assembles a six-section **workpaper** the analyst dispositions and exports as a Word document. Two roles matter: the **analyst** (drafts and dispositions) and the **RIC** (QC — mostly stage 2, but the audit trail built now serves them).

Non-negotiable domain rules:

- **There is no review "type."** Annual/thematic/target distinctions do not exist anywhere in the UI — not as a tag, filter, header label, or surfaced data field. A review is identified by borrower name + ID (e.g. `Veyland US Holdco LLC · CL6430`). Only the supporting documentation differs between reviews.
- **One export.** The rendered Word review, button label **"Export Review"**. There is no Excel export.
- **Line of business** (IB Lending / Wealth Management / Counterparty Credit Risk) is a real dimension: filterable on review lists and document search.
- Case-management-system integration is out of scope entirely. Do not build seams for it.
- The tool is not the system of record; the disclaimer line from the mockup appears on the review page.

**Do-not-build list** (POC features deliberately absent from this app): review types anywhere; Excel export; the multi-mode workbench (single prompt / multi-step / scenario / prompt builder / portfolio monitor) — this app is the credit-review journey only; a visible extraction-configuration wizard (parser/preset/concurrency live behind the landing page's quiet "Advanced extraction settings" link); any disabled placeholder controls (if a control doesn't work, it doesn't ship).

## 2. Repository scaffold

- **Stack:** Vite + React 18 + TypeScript (`strict: true`) + Tailwind CSS + React Router. Server-state via **TanStack Query** over the API seam (one well-known dependency; everything else is Context + hooks). No other state library, no component kit — components are hand-built to the mockup.
- **Tooling:** ESLint (typescript-eslint) + Prettier; Vitest + React Testing Library for unit/component tests; Playwright for the screenshot verification loop (§10). Node LTS, committed lockfile. CI (GitHub Actions or equivalent): lint, typecheck, test, build on every push.
- **Conventions for handoff:** no exotic dependencies; every non-obvious module gets a header comment; the API seam gets full JSDoc (§6); paths and names below are load-bearing — keep them.

```
sentinel-ui/
├── design/
│   └── sentinel-mvp-concept.html      # the interactive mockup
├── docs/
│   ├── build-spec.md                  # this file
│   ├── sentinel-ui-decisions.md       # decision ledger copy
│   └── api-handoff.md                 # written in Phase 6: how to swap mock → real
├── src/
│   ├── styles/tokens.css              # the four token blocks, verbatim from the mockup
│   ├── app/                           # shell: masthead, rails, router, theme provider
│   ├── screens/
│   │   ├── landing/
│   │   ├── processing/
│   │   ├── review/                    # review page + right context rail
│   │   ├── reviews/                   # my/all lists
│   │   └── documents/
│   ├── components/                    # shared atoms: badges, pills, buttons, modal, etc.
│   ├── api/
│   │   ├── types.ts                   # the domain model (§6)
│   │   ├── client.ts                  # SentinelApi interface + factory
│   │   └── mock/                      # in-memory implementation + fixtures (§7)
│   ├── strings.ts                     # ALL user-facing nav/tab names (renames pending)
│   └── lib/                           # hooks, formatters (dates, confidence, mono ids)
├── README.md                          # run, structure, theming, API swap pointer
└── (vite/ts/tailwind/eslint configs, CI workflow)
```

`src/strings.ts` matters: left-nav names ("My reviews", "All reviews") and right-rail tab names ("Why", "Respond", "Debate", "Prior") are placeholders pending a final naming pass. Every user-facing instance must read from this file.

## 3. Design system

### 3.1 Tokens

Lift the four token sets **verbatim** from the mockup's `<style>` head into `src/styles/tokens.css`: `:root` (Stone light, default), `body.dark` (Stone dark), `body.theme-cobalt` (Cobalt light), `body.theme-cobalt.dark` (Cobalt dark). Bridge them into Tailwind (`theme.extend.colors` reading `var(--...)`) so components use semantic classes, never raw hex.

Token contract (names matter; components depend only on these):
- Text/ink: `--ink`, `--ink-soft`, `--muted`, `--faint`, `--on-ink`
- Surfaces: `--bg`, `--bg-subtle`, `--bg-hover`; rules: `--rule`, `--rule-strong`
- Action: `--primary`
- Status: `--success/-bg/-line`, `--warn/-bg/-line`, `--error/-bg`, `--indigo/-bg/-line` (indigo = attention/provenance accent)
- Rail (themes independently — Cobalt has a dark navy rail on a light canvas): `--rail-bg`, `--rail-fg`, `--rail-fg-muted`, `--rail-hover`, `--rail-rule`, `--rail-active-bg`, `--rail-active-fg`, `--rail-bar`
- Shadows: `--shadow-sm`, `--shadow-md`; fonts: `--font-body`, `--font-display`, `--font-mono`

Theme state = palette family (Stone default, `theme-cobalt`) + dark boolean, persisted in localStorage. Masthead controls: small theme select + moon toggle. Adding a future theme must require only a new token block.

**Color discipline:** color is spent on status only (green populated/verified, amber attention/low-confidence, red error/dissent, indigo attention-accent/provenance). Everything else is neutral. Never introduce decorative color.

### 3.2 Typography

- `--font-display` (New York/ui-serif/Georgia) for the **names of things**: borrower name, screen titles ("Start a review", "Reviews", "Documents"), workpaper section titles; serif-italic for evidence pull-quotes and the processing line. Nothing else.
- `--font-body` (system sans) for all UI labels, controls, running UI text.
- `--font-mono` for identifiers: CL numbers, filenames, dates, page refs (`p. 12`), confidence chips, section numbers, policy IDs.
- Micro-labels: 11px, letter-spacing ~.12em, uppercase, 600.
- Scale reference (from mockup): borrower in sticky bar 19px serif 600; landing h1 25px serif; workpaper section titles 16px serif 600; body UI 12.5–13px; dense metadata 11–11.5px. Tabular numerals wherever figures align.

### 3.3 Motion

Calm, never bouncy. All of it dies under `prefers-reduced-motion`.
- Screen content settles in: opacity 0→1 + 6px rise, ~300ms ease, staggered ~80ms per top-level block (cap after ~6 blocks).
- Accordions (workpaper sections, attention block) ease open/closed ~280ms (the mockup uses the `grid-template-rows: 0fr→1fr` technique; reuse it).
- Deep-link target rows flash once in a neutral tone (~1.4s fade), never a status color.
- Theme change transitions background/color ~200ms.

## 4. App shell and routing

Fixed instrument-panel frame: masthead (48px: brand, health badge, theme select, dark toggle) over a three-column row — fixed left rail, scrollable canvas, fixed right context rail (review route only). **Only the canvas scrolls.**

Routes:
- `/` — landing (upload + recents)
- `/reviews` and `/reviews/all` — My / All reviews (tab state in the URL)
- `/documents` — document repository search
- `/review/:id` — the review page; section anchors via hash (`#sec-2`); a review still processing renders its processing state at this same URL, so refresh/leave-and-return always lands correctly.

**Left rail** (`--rail-*` tokens; match the mockup): app items Home, My reviews, All reviews, Documents, Policy library (stub route for MVP). Active item: `--rail-active-bg` fill + 3px `--rail-bar` at the rail's left edge. Inside a review, a contextual zone appears under a divider: the review's name header, then Overview + sections 1–6 with status dots (green populated / hollow pending / amber attention) and an open-items count on Overview; these deep-link into the workpaper. "Collapse sidebar" at the rail foot collapses to a 58px icon strip (labels hidden, `title` tooltips, section numbers as icons, active state persists). Collapse state persists per user.

## 5. Screens

### 5.1 Landing (`/`)
Centered hero (~600px): micro-label "Credit analysis", serif h1 "Start a review", one-line sub. Drop zone (drag-and-drop + browse; PDF; one borrower per review) with file chips (mono filename, pages/size, remove). Below: optional free-text zone labeled "Anything Sentinel should know?" — context/questions, one per line, that ride into the run and surface later as attention items. Then: primary "Begin review", file count, quiet "Advanced extraction settings" link (opens the demoted parser/preset/concurrency controls). Under the hero: "Recent" — the user's recent reviews as rows (borrower, open-items badge or sections-complete, relative date) linking to `/review/:id`. No metadata form of any kind: borrower, ID, and everything else is detected during processing.

Acceptance: a review starts with exactly two interactions (drop, Begin). Refreshing keeps recents. No wizard or mode language anywhere.

### 5.2 Processing (state of `/review/:id`)
Calm and ambient: mono doc-names line, serif-italic "Reading the documents", one thin animated bar, ONE muted status line cycling coarse phases (reading → indexing → policy checks). No pipeline anatomy, no percentages. Below: "This usually takes a few minutes. You can leave — the review will be waiting in your recents." and a quiet "Cancel this review" link. Failures interrupt loudly: red banner with the specific backend message.

The review record is created at upload: it appears in My reviews immediately as "New review — reading…" with a spinner, renaming itself when the borrower is detected. The mock API simulates this with timers (§7).

Acceptance: kill the tab mid-processing, reopen `/review/:id` → processing state resumes; on completion the same URL shows the review.

### 5.3 Review page (`/review/:id`) — the core screen
Canvas, top to bottom:

1. **Sticky borrower bar** (sticks to canvas top): serif borrower name + mono ID + right-aligned actions: primary **Export Review**, right-rail toggle. No review-type label. Export errors surface in-app (toast + message), never a raw error page.
2. **Sub line** (not sticky): sector/ownership summary, external ratings as structured values, deal-type chips (indigo), "Run completed HH:MM · N documents".
3. **The story**: zone heading "The story — what the documents say is going on"; card with source-docs line (mono), narrative paragraph, "what changed" timeline rows (dated, factor badge, `prior → current`, serif-italic snippet). This compares documents **within this run**.
4. **NEEDS YOUR ATTENTION** — collapsible block (indigo left edge). Header always visible: title, amber "N open" badge, "M reviewed" tally, chevron. Rows: type tag (review-required chip / flag badge with confidence inline / unresolved badge), title + one-line detail, "Section N →" deep link, dismiss (flags only), reviewed rows in done styling with an "edit" affordance. Every row deep-links: expands the target workpaper section and scrolls to it. Dispositions (mark reviewed with note, un-review, edit note, dismiss flag) all record to the review record.
5. **Work paper** — inline collapsible document, NOT cards: zone heading "Work paper — 6 sections · N populated"; each section = hairline-ruled row with mono number, serif title, status pill, attention chip if any, chevron. Expanded: subsections separated by hairlines, each with name, resolved-via badge (`Tier 1 · section` / `Tier 2 · vector` / `image value · OCR` / `static data` / amber `unresolved`), mono page ref, **confidence chip** (`conf NN%`, mono; amber `low` variant below the floor), then content (prose ~64ch max, key-values in tabular numerals, evidence quotes with the page number ON the quote line + "View source" → source modal). Unresolved concepts show inline in warn color. Assessment factors render inside their section (mono factor name, verdict state, collapsed "N retrieved snippet(s)" disclosure — preserve this honesty pattern exactly, including labeled stubs). "Not yet populated" sections show their feeder note when expanded. The low-confidence flagged item carries the amber left stripe + "⚠ review required" chip + explanation line ("the Word export flags this value") — **the screen must show exactly what the export will flag**, from the same threshold.
6. Disclaimer line.

**Source modal**: filename + section + page (mono), provenance badge (section image vs page image), the quote, the image area, neutral (not red) degradation when an image is unavailable. Esc/overlay-click closes.

**Right context rail** (fixed ~312px, collapsible via the sticky-bar toggle, review route only): follows the selected workpaper item (click to select; selection = subtle fill + accent inset stripe; exactly one selected; default = the first flagged item). Header: "Context" + `§N Item Name`. Four tabs (names from `strings.ts`):
- **Why**: "How this got here" — resolution chain as steps (template concept → match method/source page → flags raised), then "Applied policies & standards" — cited cards (mono policy ID, one-line requirement, view link).
- **Respond**: free-text direction + "Send & re-run" (scope: the selected item — confirm with the design owner, §9), "Mark verified"; then "Clear from workpaper": Not applicable / Incorrect. Clearing strikes the item in place on screen with a rationale chip ("cleared — not applicable · struck on screen, omitted from the exported review") and an undo; reason + actor recorded; **the exported document simply renders without cleared content** — no strikethrough or tombstone in the DOCX.
- **Debate**: advocate and dissent cards (stance-colored headers green/red, position text, mono citations line) + the advisory footnote ("Positions are advisory. The analyst's disposition decides."). Both positions persist to the review record.
- **Prior**: "Since the [date] review" — key-value delta rows (`5.6x → 5.9x`, worsening values in warn color), link to the prior review. Rendered only when the borrower has a prior review; hide the tab otherwise. Compares **between reviews** (distinct from the story's within-run timeline).

Acceptance: selection drives all four tabs; clear/undo round-trips; deep links from attention rows, rail section numbers, and document-search hits land expanded + scrolled with the neutral flash; rail collapse persists; all of it keyboard-reachable.

### 5.4 Reviews (`/reviews`, `/reviews/all`)
Serif h1 "Reviews", My/All tabs. **My**: the user's reviews — borrower, open-items badge or "6/6 sections", relative date. **All**: toolbar first — search (borrower, CL number, sector), Line of business select (All / IB Lending / Wealth Management / Counterparty Credit Risk), owner select, period select; count line ("N reviews · showing most recent"); read-only note ("open any review to read it; editing stays with its owner"). Rows add: owner ("you" or name), read-only badge on others' reviews, LOB tag, **absolute mono timestamp** (`2026-08-28`). The same borrower may appear multiple times (material-change re-reviews); the newer entry carries a repeat chip ("2nd in 12 mo"). Opening another user's review renders the review page read-only: no dispositions, no clearing; export permission TBD (§9). Search/filter execute against the API seam (mock filters in memory) — the UI must not assume the full list is client-side.

### 5.5 Documents (`/documents`)
Serif h1 "Documents", sub "Search everything Sentinel has read — every document, every parsed passage." Toolbar: search input, Line of business select, counterparty select, doc-type select, "Advanced search" link. Results: count line, then hit cards: mono filename + extracted badge, attribute pills (counterparty, doc type, date), matched passage as serif-italic quote with `<mark>`-highlighted terms, provenance line (section · page), "View source" → modal, and "Used in [borrower] review →" deep link when a passage fed a review.

## 6. The API seam (`src/api/`)

This is the handoff's hinge. The entire app consumes a single typed interface; the mock implements it now; the dev team implements it against Flask later without touching a component.

`types.ts` — the domain model (final field lists are yours to complete from the fixtures; these shapes are required):
- `User { id, name }`
- `ReviewSummary { id, borrowerName, clId, lob, ownerId, ownerName, status: 'processing'|'ready', createdAt, openItems, sectionsPopulated, priorReviewId? , repeatIndex? }`
- `Review` extends summary: `sector, ownership, ratings[], dealTypeChips[], runCompletedAt, documents[], story { narrative, docsLine, changes[] }, sections[6], attention[]`
- `Section { n, title, status: 'populated'|'pending', feederNote?, items[] }`
- `WorkItem { id, sectionN, name, via: 'tier1'|'tier2'|'ocr'|'static'|'unresolved', page?, confidence?, flags: ('review_required')[], content (prose|keyValue|quote shapes), evidence[], factor?, disposition? }`
- `Evidence { quote, sourceDoc, sectionName, page, imageRef? }`
- `AttentionItem { id, kind: 'review_required'|'flag'|'unresolved'|'question', title, detail, sectionN, itemId?, confidence?, state: 'open'|'reviewed'|'dismissed', note? }`
- `Disposition { itemId, action: 'cleared_na'|'cleared_incorrect'|'verified'|'reviewed'|'unreviewed'|'flag_dismissed'|'responded', reason?, note?, actorId, at }`
- `DebatePosition { itemId, stance: 'advocate'|'dissent', text, citations[] }`
- `PriorDelta { label, prior, current, direction: 'worse'|'better'|'neutral' }`
- `DocumentHit { fileName, lob, counterparty, docType, date, snippetHtml, sectionName, page, usedInReviewId? }`
- `Policy { id, text, itemIds[] }`

`client.ts` — `interface SentinelApi` with, at minimum: `me()`, `listMyReviews()`, `listAllReviews(filters)`, `getReview(id)`, `createReview(files, contextText)`, `getReviewStatus(id)`, `cancelReview(id)`, `respond(itemId, text)`, `verify(itemId)`, `clear(itemId, reason)`, `undoClear(itemId)`, `dismissFlag(attentionId)`, `markReviewed(attentionId, note)`, `unreview(attentionId)`, `editNote(attentionId, note)`, `getDebate(itemId)`, `getPriorDeltas(reviewId)`, `searchDocuments(query, filters)`, `exportReview(id)`. Every method gets JSDoc stating its expected real-backend semantics (what persists, what re-runs, error shape). A single factory selects the implementation (`VITE_API=mock|http`); only `mock/` exists in this repo — `http/` is the dev team's job, documented in `docs/api-handoff.md`.

Rules: no `fetch` anywhere outside `src/api/`; all times ISO-8601 from the API, formatted in `lib/`; error shape `{ message }` surfaced verbatim in banners/toasts (design principle: failures are loud and specific).

## 7. Mock data and demo mode

`src/api/mock/` makes the whole app run with `npm run dev` and no backend — this is the demo mode and what the development team explores first.

- Fixtures seeded from the mockup's content: **Veyland US Holdco (current, 4 open items, section 2 flagged WACC `conf 41%`, prior review 2026-02-14 → Prior tab populated)**, Ambervale Foods Group, Seldwyn Marine Finance, Northgale Health Partners (complete, owned by "you"), Farrowdale Logistics and Verloway AgriChem (other owners, read-only, one WM for the LOB filter), plus enough generated rows to make search/filter/count lines credible (~40 reviews). Document search fixtures include the "revolver availability" hits from the mockup.
- `createReview` simulates processing with timers (phase updates over ~15s, borrower detected midway → rename event) and then serves a copy of the Veyland fixture. `cancelReview` works.
- Mutations (dispositions, clears, responses) persist in memory for the session and are reflected in re-fetches; a `respond` call flips the item into a brief "re-running" state and returns an adjusted value, so the UX is demonstrable.
- `exportReview` in mock mode: succeed by downloading a tiny placeholder .docx blob, and expose one fixture that fails (to demonstrate the error path).

## 8. Data and persistence semantics (contract notes for the real backend)

- Reviews are durable from upload; every analyst action (dispositions, clears with reasons, responses, dismissals, verifications) records to the review record with actor + timestamp. Nothing is silently deleted.
- Refresh never loses state anywhere; a session-only regression is a build failure, not a nice-to-have.
- Confidence: every extracted item carries a numeric confidence; ONE floor value drives both the amber UI treatment + review-required flag and the DOCX flagging — single source of truth, server-side (mock: constant in fixtures).
- The export is always the clean rendered document: cleared content omitted, no working-state artifacts; flagged values carry the same REVIEW REQUIRED banner the screen showed.
- "You" comes from `me()`; the mock returns a fixed user. Real auth is the dev team's integration (document the assumption in `api-handoff.md`).

## 9. Open questions — confirm with the design owner before wiring

1. "Send & re-run" scope: the single item, the subsection, or the whole section? What does the analyst's text get appended to?
2. Cleared-content reasons: the two buttons alone, or button + required note field?
3. Advocate/dissent: agreed `DebatePosition` contract OK? (Server-side production of these is future work; UI renders whatever the seam returns, including absent.)
4. Read-only reviews: can a non-owner export? See the Prior tab?
5. Line of business: attribute of the review, the documents, or both?
6. Final names for left-nav items and right-rail tabs (build against `strings.ts` meanwhile).
7. Developer environment constraints: internal npm registry/proxy, target browsers (assume evergreen Chrome/Edge unless told otherwise), Node version policy.

## 10. Verification and handoff definition-of-done

After each phase: Playwright-screenshot every affected screen in Stone light, Stone dark, Cobalt light, Cobalt dark at 1440px and one narrow width; verify reduced-motion; verify keyboard traversal of new interactive elements; diff rendered copy against the mockup. Do not mark a phase complete with a failing acceptance line — surface the gap and ask.

**Phases** (each independently landable):
- **Phase 0 — Scaffold + tokens.** Repo per §2, CI green, tokens.css + Tailwind bridge, theme select/dark toggle with persistence, typography roles demonstrated on a placeholder screen. *Accept: all four themes render; no raw hex outside tokens.css (grep-enforced).*
- **Phase 1 — Shell + router.** Fixed frame, masthead, left rail (app nav, contextual zone, collapse), all routes with placeholder screens, canvas-only scrolling. *Accept: URLs work and are refresh-safe; rail matches mockup in all themes; only the canvas scrolls.*
- **Phase 2 — API seam + fixtures.** `types.ts`, `client.ts`, mock implementation, fixtures, demo processing simulation. *Accept: typecheck-clean contract; fixtures cover §7's list; `VITE_API` factory in place.*
- **Phase 3 — Review read path.** Landing, processing, review page read-only (sticky bar, sub line, story, attention block, inline workpaper with confidence chips + evidence + factors + review-required in place), source modal, Export Review with both mock outcomes. *Accept: full demo path upload → export; §5.3 read-path acceptance lines.*
- **Phase 4 — Right rail + dispositions.** Selection model, four tabs, clear-with-rationale + undo, verify, respond/re-run demo flow, attention dispositions. *Accept: §5.3 rail acceptance lines; mutations reflected in re-fetches.*
- **Phase 5 — Reviews + Documents.** Both list screens with search/filters/LOB/timestamps/repeat chips through the seam; read-only rendering of others' reviews; document search with review deep links. *Accept: §5.4/§5.5 as written; filters hit the seam, not client memory of a full list.*
- **Phase 6 — Polish + handoff package.** Motion pass, keyboard/focus audit, empty states (hand-written copy in the mockup's voice), dark contrast audit; write `README.md` and `docs/api-handoff.md` (how to implement `http/`, method-by-method semantics, auth assumption, deploy notes); final full-app screenshot set in `docs/` for the dev team. *Accept: a developer who has never seen this project can clone, `npm i && npm run dev`, understand the structure from README, and knows exactly where the real API goes.*
