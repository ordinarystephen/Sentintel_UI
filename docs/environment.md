# Environment audit

Portability audit for hosting environments (Domino-style): what this project needs, what it downloads, what is native, and how it behaves offline and behind a proxy. Verified on 2026-08-31 against the committed lockfile (`lockfileVersion: 3`).

## Runtime versions

| What            | Required                                          | Notes                                                                  |
| --------------- | ------------------------------------------------- | ---------------------------------------------------------------------- |
| Node.js         | **≥ 22.12** (`package.json` `engines`)            | `.nvmrc` pins **24** (current LTS); CI runs 24. Verified on 24 and 25. |
| npm             | **≥ 9** (lockfileVersion 3)                       | Node 24 ships npm 10/11 — nothing extra to install.                    |
| Browsers (dev)  | evergreen Chrome/Edge                             | The Playwright Chromium download is needed only for `npm run e2e`.     |

## Direct dependencies (npm ls --depth=0)

Runtime (4 — everything the shipped bundle contains):

| Package                 | Version | Why                                                        |
| ----------------------- | ------- | ---------------------------------------------------------- |
| `react` / `react-dom`   | 18.3.1  | UI runtime.                                                |
| `react-router-dom`      | 7.18.3  | Routing (`/review/:id`, tab-in-URL lists, basename).       |
| `@tanstack/react-query` | 5.102.8 | Server-state over the API seam (caching, polling, invalidation). |

Development / build only (never shipped):

| Package                                                | Why                                                                 |
| ------------------------------------------------------ | ------------------------------------------------------------------- |
| `vite` 6 + `@vitejs/plugin-react`                      | Dev server and production bundler.                                  |
| `typescript` 5.9                                       | Strict typechecking (`tsc -b`).                                     |
| `tailwindcss` 4 + `@tailwindcss/vite`                  | Styling; config-in-CSS token bridge (`src/styles/base.css`).        |
| `eslint` 9, `@eslint/js`, `typescript-eslint`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, `eslint-config-prettier`, `globals` | Linting. |
| `prettier` 3                                           | Formatting (checked in CI).                                         |
| `vitest` 3, `jsdom`, `@testing-library/{dom,react,jest-dom,user-event}` | Unit/screen tests.                                 |
| `@playwright/test` 1.62                                | Acceptance flows + screenshot verification.                         |
| `@types/{node,react,react-dom}`                        | Type definitions.                                                   |

## Native code and install scripts (full transitive scan)

A scan of every package in `node_modules` (install scripts, `binding.gyp`, `gypfile`, `.node` binaries, platform-restricted packages) finds:

- **No node-gyp anywhere.** Nothing compiles at install time; a C/C++ toolchain is not required.
- **No install script downloads anything** in the normal path. The single install script in the whole tree is `esbuild: postinstall: node install.js`, which validates/copies the platform binary that npm already installed as a package; its network fallback triggers only if the platform package is missing from the registry (see below).
- **Four tools ship prebuilt platform binaries as ordinary npm packages** (optionalDependencies, selected by `os`/`cpu`): `esbuild` (`@esbuild/<platform>`), `rollup` (`@rollup/rollup-<platform>`, `.node`), Tailwind's `@tailwindcss/oxide` (`.node`), and `lightningcss` (`.node`). All are build-time only — **the production bundle is pure static JS/CSS/HTML**.
- The committed lockfile already contains the entries for every platform, including `linux-x64` (`-gnu` and `-musl`) for all four — so `npm ci` on a Linux host resolves them from the same registry with no extra configuration.

**The one requirement this places on a private registry (Nexus):** it must serve those platform-specific packages for the target OS/arch. If it mirrors npmjs.org (the normal setup), nothing to do. There is no case for swapping any dependency: the four binary shippers are the standard toolchain (Vite/Rollup/Tailwind), the binaries come through the registry like any other package, and nothing runs a compiler or reaches outside the registry.

## Install and offline behaviour (verified)

- **`npm ci` from the committed lockfile is the only network step.** Verified by a clean reinstall (`rm -rf node_modules && npm ci`): `added 292 packages … in 1s` from a warm npm cache; expect 1–2 minutes on a cold cache. Two harmless `npm warn deprecated` notices appear (transitive `whatwg-encoding`; the pinned `eslint` minor).
- After it, everything runs with the network unplugged — all local, nothing fetched:
  - `npm run dev` — ready in ~400 ms
  - `npm test` — 80 tests, ~9 s
  - `npm run build` — ~2.5 s total (`tsc -b` + Vite)
- The only other downloader in the repo is the **explicit** `npx playwright install chromium` (browser for `npm run e2e`); it is never run implicitly and is not needed to demo or build.

## Static build (verified)

`npm run build` emits a self-contained `dist/`: one HTML file, one JS bundle, one CSS bundle (fonts are system stacks — no font files; the favicon is inline). Verified with `python3 -m http.server` serving `dist/`:

- `GET /` → 200, `GET /assets/index-*.js` → 200 — the app runs from any dumb static file server; no Node server is required at runtime.
- **One caveat, inherent to client-side routing**: `GET /review/x` → **404** on a server without SPA fallback. Navigation *within* the app works fine from `/`; only hard refresh/direct entry on deep URLs needs the server to rewrite unknown paths to `index.html` (one line in nginx: `try_files $uri /index.html;`). `npm run preview` and virtually every real hosting frontend do this; bare `python -m http.server` does not.

## Running behind a proxy (verified)

Two independent knobs; both documented in `.env.example`.

**Production, under a path prefix** — build with the prefix (leading and trailing slash):

```sh
VITE_BASE_PATH=/sentinel/ npm run build
```

Vite rewrites all asset URLs and exposes the prefix as `import.meta.env.BASE_URL`; the router picks it up as its `basename` (`src/app/router.tsx`). Verified end-to-end on a build served under `/sentinel/`: direct deep-link entry (`/sentinel/review/rev-meridian-2026-08#sec-2`) renders with the section expanded and flashed, client-side navigation and reload keep the prefix, and zero requests 404. To sanity-check locally: `VITE_BASE_PATH=/sentinel/ npm run preview` (preview needs the same env var so it serves at the prefix).

**Dev server, proxied / non-localhost**:

```sh
VITE_ALLOWED_HOSTS=sentinel.example.internal npm run dev -- --host 0.0.0.0
```

- `--host 0.0.0.0` binds all interfaces (Vite binds localhost only by default).
- `VITE_ALLOWED_HOSTS` (comma-separated) whitelists the Host header(s) the proxy forwards — without it Vite rejects unknown hosts with "Blocked request. This host is not allowed."
- The proxy should also forward WebSockets (Vite's HMR); production builds don't use them.

The mock API runs entirely in the browser, so no API traffic needs proxying in demo mode. When `VITE_API=http` arrives, the base URL for the real API is a separate build-time variable (see `docs/api-handoff.md`).

## Does not meet the bar / proposed swaps

Nothing requires a swap. The two items short of the strictest reading, with their standing:

1. *"Every transitive dependency is pure JavaScript"* — four build-time tools use prebuilt platform binaries delivered as npm packages (list above). No compile step, no out-of-registry download; the lockfile covers linux-x64. Swapping them would mean leaving the standard Vite/Tailwind toolchain; not recommended and not needed.
2. *"Any static file server"* — true for serving; deep-link refresh needs the one-line SPA fallback that any real frontend provides (`python -m http.server` being the exception, usable by entering at `/`).
