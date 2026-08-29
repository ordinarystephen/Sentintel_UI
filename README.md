# Sentinel UI

Front end for Sentinel, CRR's credit-review platform. Greenfield, standalone, **no backend in this repo**: the whole app runs against an in-memory mock of the API seam so it can be demoed and explored cold.

Read [docs/build-spec.md](docs/build-spec.md) first — it is the implementation brief. [docs/sentinel-ui-decisions.md](docs/sentinel-ui-decisions.md) is the keep/cut ledger (the "why"). [design/sentinel-mvp-concept.html](design/sentinel-mvp-concept.html) is the interactive mockup and the source of truth for layout, tokens and copy (open it in a browser; the pink pins are design notes and are mockup-only).

## Run

Node 24 LTS (see `.nvmrc`; anything ≥ 22.12 works).

```sh
npm install
npm run dev          # http://localhost:5173, mock API, no backend needed
```

| Script                 | What it does                                                                  |
| ---------------------- | ----------------------------------------------------------------------------- |
| `npm run dev`          | Vite dev server                                                               |
| `npm run build`        | typecheck + production build to `dist/`                                       |
| `npm run lint`         | ESLint (typescript-eslint, react-hooks)                                       |
| `npm run typecheck`    | `tsc -b` (strict)                                                             |
| `npm run check:tokens` | fails on any raw hex/rgb/hsl outside `src/styles/tokens.css`                  |
| `npm run format`       | Prettier                                                                      |
| `npm test`             | Vitest + React Testing Library                                                |
| `npm run e2e`          | Playwright: screenshots every theme at 1440px + 900px into `e2e/screenshots/` |
| `npm run verify`       | everything CI runs, in order                                                  |

CI (`.github/workflows/ci.yml`) runs lint, typecheck, token check, format check, tests and build on every push, then the Playwright screenshot suite.

## Structure

```
src/
├── styles/tokens.css   # the four theme token blocks — the ONLY place color lives
├── styles/base.css     # Tailwind v4 config-in-CSS: token → utility bridge, base rules
├── app/                # shell: masthead, theme provider (rails + router arrive in Phase 1)
├── screens/            # one folder per screen (styleguide/ is a dev-only type reference)
├── components/         # shared atoms (Badge, …) hand-built to the mockup, no component kit
├── api/                # the typed API seam + mock implementation (Phase 2)
├── strings.ts          # ALL user-facing nav/tab names — placeholders pending rename
└── lib/                # hooks, formatters
```

Stack: Vite · React 18 · TypeScript (strict) · Tailwind CSS v4 · React Router · TanStack Query. No other state library, no component kit.

## Theming

One token contract, four looks. `src/styles/tokens.css` defines `:root` (Stone light, default), `body.dark` (Stone dark), `body.theme-cobalt` (Cobalt light) and `body.theme-cobalt.dark` (Cobalt dark). Theme state is **palette family + dark boolean**, persisted in `localStorage` (`sentinel.theme`) and applied as classes on `<body>` by `src/app/ThemeProvider.tsx`; `index.html` re-applies it before first paint so nothing flashes.

Components never touch hex. `base.css` bridges every token into Tailwind's semantic namespace — `bg-bg`, `text-ink`, `text-muted`, `border-rule`, `bg-warn-bg`, `text-rail-fg`, … — and removes Tailwind's stock palette, so `text-red-500` simply does not exist. `npm run check:tokens` enforces this by grep.

Adding a theme = adding one token block to `tokens.css` and one entry to `FAMILIES` in `src/app/theme.ts`.

Type roles (`font-display` serif for the names of things, `font-body` sans for UI, `font-mono` for identifiers, `micro` for micro-labels) and the size scale (`text-micro`, `text-dense`, `text-ui`, `text-section-title`, `text-borrower`, `text-screen-title`) are demonstrated on the styleguide screen.

## Swapping the mock API for the real one

The app consumes one typed interface, `SentinelApi` in `src/api/client.ts`; `src/api/mock/` implements it in memory. The real HTTP implementation belongs in `src/api/http/`, selected by `VITE_API=http`. `docs/api-handoff.md` (written in Phase 6) documents every method's semantics. No `fetch` is allowed outside `src/api/`.
