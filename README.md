# Sentinel UI

The front end for Sentinel, CRR's credit-review platform: an analyst drops the documents for one borrower, Sentinel reads them, runs the policy checks, and assembles a six-section work paper the analyst dispositions and exports as a Word document.

This repository is **greenfield and standalone, with no backend**. The whole app runs against an in-memory mock of the API seam, so it can be cloned, started, and explored cold. The real backend is wired in one place — see [docs/api-handoff.md](docs/api-handoff.md).

_All company, person, and transaction data in this application is fictional; any resemblance to real entities is coincidental._

## Start here

**The development team inherits the `v1.7.0` tag** — clone `main` at that tag (Vantage round over `v1.6.0`: the suite's third live application — ask → typed-block answers → runs, with the block contract and the rows-used viewer).

**Changing the wording?** Every user-facing string lives in [src/strings.ts](src/strings.ts) (demo data in [src/api/mock/fixtures.ts](src/api/mock/fixtures.ts)) — see [docs/editing-copy.md](docs/editing-copy.md) for the map. A copy change never requires touching a component.

**Never run a JavaScript project before? Follow [docs/runbook.md](docs/runbook.md)** — prerequisites, install, a numbered tour of the whole demo, and troubleshooting.

The complete from-clone path (Node ≥ 22.12 — see `.nvmrc` — and Python 3 with pip):

```sh
source .venv/bin/activate                 # Python venv for the Flask wrapper (create it once first: python3 -m venv .venv)
make install && make build && make run    # → http://localhost:8082, served like the target environment will serve it
```

Deploying behind the target environment's reverse proxy? The **confirmed working build** (verified in the live environment, 2026-09-09) is `VITE_BASE_PATH=./ VITE_ROUTER=hash make build` — a plain `make build` produces root-absolute asset paths that 404 behind the proxy prefix (blank page). See [docs/environment.md](docs/environment.md) → "Base path: plan A and plan B".

To play around with hot reload instead, use the dev server:

```sh
make dev                                  # → http://localhost:5173 — mock API, no backend needed
```

In a **Domino workspace** these verbs detect it and adjust themselves — there is nothing extra to type. `make dev` picks a free port, binds where the proxy can reach it, and prints the URL to open; `make build` emits the relative-asset + hash-router combination proven to work there. Nothing auto-opens in a workspace, so visit the URL it prints — and if a page is blank, run `make doctor`. See [docs/environment.md](docs/environment.md) → "Domino workspaces".

[docs/environment.md](docs/environment.md) covers the dependency audit, offline behaviour, static hosting, and running behind a reverse proxy.

Then read, in this order:

1. [docs/build-spec-handoff.md](docs/build-spec-handoff.md) — the implementation brief (behaviours, the API contract, acceptance criteria). ([docs/build-spec.md](docs/build-spec.md) is the internal original.)
2. [design/sentinel-mvp-concept.html](design/sentinel-mvp-concept.html) — the interactive mockup: open it in a browser. It is the source of truth for layout, tokens and copy. The pink numbered pins are design rationale and are mockup-only.
3. [docs/sentinel-ui-decisions.md](docs/sentinel-ui-decisions.md) — the keep/cut ledger: the "why" behind the decisions.
4. [docs/api-handoff.md](docs/api-handoff.md) — how to replace the mock with the real API, method by method.
5. [docs/poc-serving-patterns.md](docs/poc-serving-patterns.md) — how the parent POC installs, builds, and serves in the target environment; the patterns this repo inherits (`.npmrc`, the Flask wrapper in `server/`, the relative-URL rules).

[docs/screenshots/](docs/screenshots/) has every screen in Stone light plus the review page in the other three themes (`npm run screenshots:docs` regenerates them).

## Scripts

| Script                     | What it does                                                                               |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `npm run dev`              | Vite dev server                                                                            |
| `npm run build`            | typecheck + production build to `dist/`                                                    |
| `npm run preview`          | serve the production build                                                                 |
| `npm run lint`             | ESLint (typescript-eslint, react-hooks)                                                    |
| `npm run typecheck`        | `tsc -b`, strict                                                                           |
| `npm run check:tokens`     | fails on any raw hex/rgb/hsl outside `src/styles/tokens.css`                               |
| `npm run format`           | Prettier (`format:check` in CI)                                                            |
| `npm test`                 | Vitest + React Testing Library (unit and screen tests)                                     |
| `npm run e2e`              | Playwright: acceptance flows + screenshots per phase into `e2e/screenshots/` (git-ignored) |
| `npm run verify`           | everything CI runs, in order                                                               |
| `npm run screenshots:docs` | regenerate the handoff screenshot set in `docs/screenshots/`                               |
| `npm run audit:contrast`   | regenerate `docs/contrast-audit.md` (WCAG ratios for every token pair in every theme)      |

CI ([.github/workflows/ci.yml](.github/workflows/ci.yml)) runs lint, typecheck, token check, format check, tests and build on every push, then the Playwright suite.

## Structure

```
src/
├── styles/tokens.css        # the four theme token blocks — the ONLY place color lives
├── styles/base.css          # Tailwind v4 config-in-CSS: token → utility bridge, base rules, motion
├── app/                     # shell: AppShell frame, Masthead, LeftRail, RightRail, router,
│                            #   ThemeProvider, ShellProvider (rail collapse, current review, selection)
├── screens/
│   ├── landing/             # /            upload + context + recents
│   ├── review/              # /review/:id  processing state, the review page, rail panes, source modal
│   ├── reviews/             # /reviews, /reviews/all
│   ├── documents/           # /documents
│   ├── policy/              # /policy      stub
│   └── styleguide/          # /styleguide  dev-only type/token reference (not in navigation)
├── components/              # shared atoms hand-built to the mockup — no component kit
├── api/
│   ├── types.ts             # the domain model
│   ├── client.ts            # SentinelApi + ApiError + createApi() (VITE_API=mock|http)
│   ├── hooks.ts             # TanStack Query bindings; the only thing screens import
│   └── mock/                # in-memory implementation + fixtures (the demo)
├── strings.ts               # ALL user-facing nav/tab names and copy — renames are one-file changes
├── lib/                     # formatters, hooks (persisted state, hash deep links, debounce), sections
└── test/                    # test setup + the renderAt harness
```

Stack: Vite · React 18 · TypeScript (strict) · Tailwind CSS v4 · React Router 7 · TanStack Query 5. No other state library, no component kit, no exotic dependencies. Every non-obvious module has a header comment.

## How the app is put together

**Frame.** A fixed instrument panel: 48px masthead over left rail / canvas / right context rail. The frame never scrolls — only the canvas (`<main id="canvas">`) does. The left rail collapses to a 58px icon strip; inside a review it grows a contextual zone (the review's name, Overview with the open-items count, sections 1–6 with status dots) that deep-links into the work paper. Both collapse states persist per user.

**Routes.** `/` · `/reviews` and `/reviews/all` (tab in the URL) · `/documents` · `/policy` · `/review/:id` with `#sec-N` section anchors. All refresh-safe: a review still processing renders its processing state at the same URL and flips to the review when the run completes. List filters live in the URL too.

**Review page.** Sticky borrower bar (name · ID · Export Review · rail toggle) → sub line → the story (narrative + within-run timeline) → NEEDS YOUR ATTENTION (collapsible; rows deep-link and can be marked reviewed / edited / un-reviewed / dismissed) → the inline collapsible work paper → disclaimer. Every extracted item shows its resolved-via badge, page ref and confidence chip; anything under the review's `confidenceFloor` gets the amber stripe, the "⚠ review required" chip and the explanation — exactly what the export flags, from the same number. Evidence quotes carry the page on the quote line and open the source modal.

**Right rail.** Follows the selected work-paper item (click, or Enter/Space; the first flagged item by default). Why (resolution chain + applied policies), Respond (send & re-run, mark verified, clear as not applicable / incorrect with undo), Debate (advocate / dissent), Prior (deltas vs the borrower's prior review; hidden when none). Cleared items stay on screen, struck, with the rationale chip; the export omits them. On another owner's review every control disappears and both the page and the rail say whose it is.

**Lists.** Reviews (My / All with search, line of business, owner, period) and Documents (passage search with `"quoted phrases"` and `-exclusions`, LOB / counterparty / doc-type filters) run their queries through the seam — the UI never assumes it holds the full list. Document hits carry provenance, a source modal, and a deep link into the section a passage fed.

## Theming

One token contract, four looks. [src/styles/tokens.css](src/styles/tokens.css) defines `:root` (Stone light, default), `body.dark` (Stone dark), `body.theme-cobalt` (Cobalt light) and `body.theme-cobalt.dark` (Cobalt dark). Theme state is palette family + dark boolean, persisted in `localStorage` (`sentinel.theme`), applied as classes on `<body>` by `ThemeProvider`, and pre-applied in `index.html` so nothing flashes.

Components never touch hex. [src/styles/base.css](src/styles/base.css) bridges every token into Tailwind's semantic namespace — `bg-bg`, `text-ink`, `text-muted`, `border-rule`, `bg-warn-bg`, `text-rail-fg`, … — and removes Tailwind's stock palette, so `text-red-500` does not exist. `npm run check:tokens` enforces it. Color is spent on status only (green populated/verified, amber attention, red error/dissent, indigo attention-accent/provenance); everything else is neutral.

Adding a theme = one token block in `tokens.css` + one entry in `FAMILIES` in `src/app/theme.ts`. [docs/contrast-audit.md](docs/contrast-audit.md) lists the WCAG ratios per theme.

Type roles: `font-display` (serif) for the names of things — borrower, screen titles, work-paper section titles, and serif-italic for evidence quotes and the processing line; `font-body` (sans) for UI; `font-mono` for identifiers, dates, page refs, confidence chips, policy IDs; `micro` for micro-labels. Sizes: `text-micro` 11 · `text-dense` 11.5 · `text-ui-sm` 12.5 · `text-ui` 13 · `text-section-title` 16 · `text-borrower` 19 · `text-screen-title` 25. `/styleguide` shows them all.

Motion is calm and dies under `prefers-reduced-motion`: screen content settles in with an 80ms stagger (`settle`), accordions use the `grid-template-rows: 0fr → 1fr` technique (`Collapsible`), deep-link targets flash once in neutral (`flash-once`), theme changes transition ~200ms.

## The API seam and the mock

Everything the UI knows about data is `SentinelApi` in [src/api/client.ts](src/api/client.ts); screens reach it only through the hooks in [src/api/hooks.ts](src/api/hooks.ts). `createApi()` selects the implementation from `VITE_API` (see `.env.example`; default `mock`). `docs/api-handoff.md` is the complete guide to writing `src/api/http/`.

Mock mode ([src/api/mock/](src/api/mock/)):

- Fixtures from the mockup: Veyland US Holdco (4 open items, WACC at `conf 41%` below the floor, a prior review so the Prior tab is populated), Ambervale Foods, Seldwyn Marine, Northgale Health (complete, yours), Farrowdale Logistics and Verloway AgriChem (other owners → read-only; one Wealth Management), plus ~34 generated rows. Document search includes the "revolver availability" passages.
- `createReview` simulates processing over ~15 s (reading → indexing → policy checks; borrower detected midway so the row renames itself) and then serves a copy of the Veyland record. Processing is derived from elapsed time and persisted, so closing the tab and reopening `/review/:id` resumes. A file whose name contains `corrupt` fails loudly with a parser message.
- Every disposition, clear, response and dismissal records actor + timestamp and survives reloads (`localStorage` key `sentinel.mock.state`; delete it to reset the demo). `respond` re-runs the item and lands 9.6% after 1.5 s.
- `exportReview` downloads a placeholder `.docx`; Seldwyn's export fails on purpose to show the error path.

## Testing

- **Unit / screen** (`src/**/*.test.tsx`): the mock's behaviour is specified end to end in `src/api/mock/mockApi.test.ts`; screens are tested through `src/test/renderAt.tsx`, which mounts the full provider stack and route table at a path. The mock is reset after every test.
- **Playwright** (`e2e/phase-N.spec.ts`): the acceptance lines from the build spec — refresh-safety, canvas-only scrolling, the demo path upload → export, deep links, rail flows, list filters — plus screenshots of every affected screen in all four themes at 1440px and 900px, reduced-motion checks and keyboard traversal.

## Developer environment note

The firm's development environment uses the internal Nexus package repository (configured via environment variables in `.npmrc`). This repo's CI locks against public npm; the dev team's first task after handoff is re-locking dependencies against Nexus — see [docs/api-handoff.md](docs/api-handoff.md).

## Conventions

- Paths and names in the build spec are load-bearing; keep them.
- User-facing copy lives in `src/strings.ts`. Left-nav and rail-tab names are placeholders pending a final naming pass.
- No `fetch` outside `src/api/`. No raw color outside `tokens.css`. No disabled placeholder controls — if a control doesn't work, it doesn't ship.
- There is no review "type" anywhere, and there is one export ("Export Review").
- Failures are loud and specific: the API's `message` is shown verbatim.
