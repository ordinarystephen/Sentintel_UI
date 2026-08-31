# POC serving & packaging patterns — for the successor UI port

Investigated 2026-08-31 against the actual files in this repo (not conventions).
Every claim cites a file; where the POC's behavior is a workaround rather than a
pattern, it is marked **inherit** or **do better** with reasoning. Audience: the
team porting the successor UI (Vite + React + TS, static `dist/`, mock API,
`VITE_BASE_PATH`) into the same Domino environment.

---

## 1. Package download

### 1.1 There is NO JS package-management config in this repo — that is the headline

Exhaustively searched (repo root, `web/`, git history): **no `.npmrc`, no
`.yarnrc`/`.yarnrc.yml`, no Dockerfile, no environment definition, no
`scripts/`/`bin/`, no CI config** — and `git log --all` shows none ever existed.
The only tracked dotfiles are `.env.example`, `.gitattributes`, `.gitignore`,
`server/prompts/dev_overrides/.gitkeep`, `web/.gitignore`, `web/.prettierrc`.

The entire install machinery is the Makefile, invoking npm bare:

```make
# Makefile:6-8
install:
	pip install -r requirements.txt
	@if [ -d web ]; then cd web && npm install; fi

# Makefile:44-45
web-install:
	cd web && npm install
```

No `--registry`, no `npm ci`, no proxy flags, no `.npmrc` generation step.

### 1.2 The lockfile points at public npm — in an environment documented as having none

`web/package-lock.json` is committed (`git ls-files web/` confirms),
`"lockfileVersion": 3` (npm 9+ format). A registry census over all 562
`resolved` entries:

```
grep -o '"resolved": "https\?://[^/]*' web/package-lock.json | sort | uniq -c
→ 562  "resolved": "https://registry.npmjs.org
```

e.g. `"resolved": "https://registry.npmjs.org/@babel/code-frame/-/code-frame-7.29.7.tgz"`.
Zero Nexus/Artifactory URLs. Yet the deployment target is described as offline:

> `docs/PROCESS_FLOW.md:35` — "runs inside the bank's Domino environment ·
> **no public internet / no CDNs** · all auth via Azure AD credential chain"

And the built SPA is **not** shipped in git (`web/.gitignore:1-2` is
`node_modules` / `dist`; `git ls-files web/dist` is empty), so `npm install`
*must* succeed on the target. Whatever makes that work today — presumably an
npm group-proxy on the same internal **Nexus** that serves pip — is configured
**ambiently in the Domino compute environment** (image-level npm config or
env vars) and is captured nowhere in this repository.

The Python side has the same shape, but at least documented in prose: no
`pip.conf`/`PIP_INDEX_URL` in the repo, and

> `docs/DEEP_INTEGRATION_PROMPT.md:33-35` — "deps resolve via internal
> **Nexus** (never edit `requirements.txt` / `pyproject.toml` to work around
> sandbox install issues — flag instead)"

(same statement in `docs/COPILOT_EXTRACTION_PROMPT.md:26-27` and `:157`).
Evidence it's real: `requirements.txt:34` pins `aice-mlflow-plugins==0.1.3`,
an internal bank package that does not exist on public PyPI.

**Verdict: do better.** The POC works only because the environment silently
rewrites/permits registry access. The successor should carry a committed
`.npmrc` with the actual internal registry URL (see §5) so the install
contract is visible in the repo — get the URL from the platform team or read
it out of the Domino workspace with `npm config get registry`.

### 1.3 Env vars needed for `npm install` — none defined anywhere

Repo-wide grep for `HTTP_PROXY|HTTPS_PROXY|NO_PROXY|NPM_CONFIG_|NODE_EXTRA_CA_CERTS|strict-ssl|cafile|authToken|always-auth`
returns **zero hits** outside the lockfile and two prose mentions of the word
"Nexus". `.env.example` (the self-described complete variable template,
`README.md:42`) contains no build-time or network variables at all — only
Azure endpoints, storage roots, logging, parser tuning, and `PORT`.

So: from this repo's perspective, `npm install` needs *no* env vars — but the
environment is demonstrably proxy-mediated and TLS-intercepting for egress
(Document Intelligence is only reachable via a local nginx proxy,
`.env.example:35-36`: `AZURE_DOCINTEL_ENDPOINT=https://127.0.0.1:8443`). If
the successor's install hits TLS interception, expect to need
`NODE_EXTRA_CA_CERTS` (or `.npmrc` `cafile`) — the POC never had to write
this down, which is a gap, not a proof it's unnecessary.

### 1.4 Node / npm versions — floor only; provisioning undocumented

- **No** `.nvmrc`, `.node-version`, `.tool-versions`, or volta pin — never in
  git history either.
- The only constraint is advisory (`web/package.json:7-10`):

  ```json
  "engines": { "node": ">=18.0.0", "npm": ">=9.0.0" }
  ```

  With no `.npmrc` (hence no `engine-strict=true`), npm treats this as a
  warning at most.
- **How Node gets onto Domino is documented nowhere in the repo.** The house
  pattern is admin-provisioned base-image tooling — cf.
  `server/parsing/parsers.py:143` on system binaries: "installed separately by
  Domino admins" (about Poppler/Tesseract, but it establishes the model).
- Effective requirement: the toolchain is `vite ^6.0.5` / `typescript ^5.7.2`
  (`web/package.json` devDependencies), so Node 18+ is the real floor. Python,
  by contrast, is pinned explicitly (`pyproject.toml:6`:
  `requires-python = ">=3.11"`) — the asymmetry is itself a finding.

**Verdict: do better.** Run `node --version && npm --version` in the actual
Domino workspace, and pin what you find in a committed `.nvmrc`.

---

## 2. Build

### 2.1 Tool, command, location

- **Tool:** Vite 6, type-check-gated. `web/package.json:13`:

  ```json
  "build": "tsc -b && vite build"
  ```

  (`tsc -b` is a checker only — `web/tsconfig.app.json` has `"noEmit": true`;
  Vite does all emission.)
- **Command:** `make build` → `cd web && npm run build` (`Makefile:10-12`).
- **Output:** `web/dist/` (`web/vite.config.ts` `build: { outDir: "dist", sourcemap: false, target: "es2022" }`).
- **Where it runs:** **manually, in whatever environment serves the app** —
  i.e. inside the Domino workspace before launch. There is no CI of any kind
  (no `.github/`, `.gitlab-ci.yml`, `Jenkinsfile`, `domino.yml`), and built
  assets are **not committed** (`web/.gitignore:2`). The README codifies the
  sequence (`README.md:29-31`):

  ```
  make install   # pip install -r requirements.txt + npm install in web/
  make build     # builds the React SPA into web/dist
  make run       # python run.py — serves API + SPA on port 8081
  ```

  If you skip `make build`, the app still boots and serves a placeholder page
  ("backend ready … frontend has not been built yet", `server/api/spa.py`);
  `make run` only prints a warning (`Makefile:14-17`). **Inherit** the
  build-on-target flow (it is what an offline, no-CI environment permits);
  the placeholder-instead-of-error is a nice touch worth copying.

### 2.2 Build-time env vars — there are none, by design

`grep -rniE "VITE_|import\.meta\.env" web/src web/index.html` → **zero hits**;
no `web/.env*` files exist. The API base URL is a hardcoded relative constant
(`web/src/api/client.ts:9`):

```ts
const BASE = "api";
```

and the asset base is relative (`web/vite.config.ts:13-17`):

```ts
// `base: "./"` — emit relative asset paths in index.html so the build
// survives Domino's `/proxy/<port>/` prefix. Absolute `/assets/...` paths
// would resolve against the origin and miss the proxy.
export default defineConfig({
  base: "./",
```

So one build artifact works everywhere — dev, local, behind any proxy prefix —
with **zero injection machinery**. This is the POC's central serving idea
(see §3.3 for why it works and where its limit is for the successor).

---

## 3. Serve

### 3.1 The Flask side

**Entry** — `run.py` (quoted in full, minus docstring):

```python
def main() -> None:
    # Fail loudly at launch if required config is missing (lists exactly which) — before create_app,
    # so a misconfigured environment surfaces immediately instead of deep inside a later request.
    preflight_or_exit()
    app = create_app()
    host = os.getenv("FLASK_RUN_HOST", "0.0.0.0")  # noqa: S104 - Domino proxies the bind
    # why: 8081 by default so the rebuild coexists with the parent app on 8080.
    port = int(os.getenv("PORT", os.getenv("FLASK_RUN_PORT", "8081")))
    debug = os.getenv("FLASK_DEBUG", "").lower() in {"1", "true", "yes"}
    app.run(host=host, port=port, debug=debug)
```

Binding: `0.0.0.0`, port chain **`PORT` (Domino-injected) → `FLASK_RUN_PORT` →
`8081`**. This is the Werkzeug dev server — there is no gunicorn/waitress in
`requirements.txt` (the "# Web" block is just `Flask>=3.0,<4.0` +
`python-dotenv>=1.0`). Single-process is *load-bearing* here: jobs, prompt
overrides, and the resource registry are in-memory module singletons
(`pyproject.toml:44` even disables the lint: `"PLW0603", # module-level
singletons use global by design`). **Inherit for a POC-grade app behind
Domino's proxy; do better if the successor ever needs >1 worker** — with
multiple workers this pattern silently breaks any in-memory state.

**Static serving** — Flask's own static handler is disabled outright
(`server/__init__.py:56-58`):

```python
# why: the SPA catch-all owns asset serving; Flask's default static
# handler would collide with it, so it is disabled entirely.
app = Flask(__name__, static_folder=None, template_folder=None)
```

**SPA fallback** — `server/api/spa.py`, the pattern to copy verbatim:

```python
@bp.route("/", defaults={"path": ""})
@bp.route("/<path:path>")
def serve_spa(path: str):
    """Serve the SPA build, falling back to ``index.html`` for client routes."""
    # Defensive only: API blueprints register first and win the route match.
    if path.startswith("api/"):
        return ("", 404)
    build_dir = _build_dir()          # Path(current_app.root_path).parent / "web" / "dist"
    if not build_dir.exists():
        return _PLACEHOLDER_HTML, 200, {"Content-Type": "text/html; charset=utf-8"}
    if path:
        candidate = build_dir / path
        if candidate.is_file():
            return send_from_directory(build_dir, path)
    if (build_dir / "index.html").is_file():
        return send_from_directory(build_dir, "index.html")
    return _PLACEHOLDER_HTML, 200, {"Content-Type": "text/html; charset=utf-8"}
```

Three-tier resolution: real file → `index.html` → placeholder. Route sharing
is by **registration order** (`server/api/__init__.py`): the seven API
blueprints (all under `/api...` prefixes — health `/api`, documents
`/api/documents`, jobs `/api/jobs`, dev `/api/dev`, extraction
`/api/extraction`, prompts `/api/prompts`, reviews `/api/reviews`) register
first, the SPA catch-all last; the `startswith("api/")` guard additionally
makes an *unknown* `/api/...` path 404 as JSON-territory instead of returning
HTML (asserted by `tests/test_spa_routes.py:19-22`). **Inherit** — including
the guard and the test.

### 3.2 How Domino launches it

**There is no `app.sh`** — no launch script of any kind exists in the repo.
The launch contract lives in prose:

> `run.py:3-4` — "Domino runs the app under its own HTTP proxy and injects
> ``PORT``; tests and Domino share the same ``create_app()`` factory."

> `docs/ARCHITECTURE.md:91-94` — "Default port 8081 (parent runs 8080), its
> own `doc_store/`, and identical env var names so the same Domino
> environment serves both."

So: Domino expects the process to honor the injected `PORT`; the app is
started by running `python run.py` (after `make install && make build`) from
the repo root — the repo-root requirement is real, because tests/scripts
`sys.path`-insert the root (`tests/conftest.py:17-21`) and the SPA dir is
resolved repo-relative. There are **no host allowlists, no `SERVER_NAME`, no
`ProxyFix`, no X-Forwarded handling** anywhere (repo-wide grep: zero hits) —
coherent, because nothing generates absolute URLs or redirects, so there is
nothing for proxy middleware to fix. **Inherit** the no-middleware stance *if*
you also inherit the no-absolute-URLs rule below; add `ProxyFix` the moment
you emit a redirect or absolute URL.

### 3.3 Surviving the proxy prefix — "relative by construction"

Domino serves the app under a prefix — the code names it as
`/proxy/<port>/` (`web/vite.config.ts:14`, `web/src/api/client.ts:4-6`,
`docs/PROCESS_FLOW.md:29`). The POC survives it with **four independent
relative-path decisions and one load-bearing invariant**:

1. **Assets:** `base: "./"` in `web/vite.config.ts:17`. The built
   `web/dist/index.html` emits `src="./assets/index-….js"` — under
   `…/proxy/8081/` the browser resolves that to `…/proxy/8081/assets/…`,
   which the Flask catch-all serves.
2. **API calls:** `const BASE = "api"` — **no leading slash** —
   (`web/src/api/client.ts:9`); every helper does
   `fetch(`${BASE}/${path}`)`. A future `fetch("/api/…")` would silently
   break only behind the proxy.
3. **Server-minted URLs are relative too** (the subtle one): the backend
   hands the client image/crop URLs without a leading slash —
   `server/graphs/ib_lending.py:498`:
   `image_url=f"api/documents/{dh}/section-images/{key}?parser_mode=…"`
   (same at `:556` and `server/parsing/table_crops.py:355`) — and the client
   fetches them verbatim (`web/src/features/credit/VisualEvidencePanel.tsx:45`).
4. **No `<base>` tag** in `index.html` — the relative emit does all the work.

The invariant: **the POC has no client-side router** (no `react-router` in
`web/package.json`; zero `pushState`/`hashchange` hits in `web/src`), so the
document URL never leaves the proxy root and relative paths always resolve one
level under the prefix. The catch-all *does* serve `index.html` at nested
paths (`tests/test_spa_routes.py:37`), and if a user could ever reach
`…/proxy/8081/deep/route`, the `./assets/…` refs would resolve to
`…/deep/assets/…` and 404. Nothing in the POC can produce such a URL — but
this is exactly where the successor differs (deep links), so **inherit the
relative-URL discipline, but do better on the base path**: see §5 for the
`VITE_BASE_PATH` prescription. Git-history note: `base: "./"` was in the
initial commit (`git log -S'base: \"./\"'` → `d2ffdb5 initial commit`) — a
design decision, not a scar from a fixed 404 bug; no fixed asset-404/redirect
incident exists in history or docs.

**Dev mode:** two terminals — Flask on 8081 (`make dev`), Vite on 5173
(`make web-dev`), with Vite proxying `/api` → `http://localhost:8081`
(`web/vite.config.ts:26-31`) so the browser stays same-origin.

### 3.4 CORS — absent, by design

No `flask-cors` in `requirements.txt`, no `Access-Control-*` header set
anywhere in `server/`, no `after_request` hooks (repo-wide grep: zero hits).
The UI calls the API **same-origin through Flask** — one process serves both
bundle and API on one port; two fetches make it explicit with
`credentials: "same-origin"` (`VisualEvidencePanel.tsx:45`,
`SourceImageModal.tsx:117`). Consequence: a separately-hosted frontend cannot
talk to this backend — there is no CORS knob to turn. **Inherit**: mount the
successor's (mock) API under `/api` on the same Flask app and never think
about CORS.

---

## 4. Gotchas — the ones that cost (or will cost) time

1. **`.env` beats Domino, deliberately — and it can shadow rotating
   credentials.** `server/config.py:3-11`: the `.env` loads with
   `override=True` ("DELIBERATELY REVERSES the prior 'Domino env wins'
   behaviour … Domino's ephemeral environment drops vars on rebuild"). The
   sharp edge is spelled out in `.env.example:22-32`: never put
   `AZURE_OPENAI_API_KEY` or `AZURE_OPENAI_AD_TOKEN` in the `.env` — Domino
   injects rotating values into the process env, and with `override=True` a
   stale pinned value **shadows the fresh one** ("a stale
   `AZURE_OPENAI_AD_TOKEN` … BYPASSES the rotating credential entirely").
   **Inherit** the persistent-`.env`-wins idea; inherit the "never pin
   injected credentials" rule with it, verbatim.

2. **Environment rebuild wipes everything in the repo tree.** `node_modules`,
   `web/dist`, `.venv`, `doc_store/`, `.env` are all gitignored — a rebuild
   means `make install && make build` again, and any state not on `/mnt` is
   gone. The POC's answer is a persistent-path-first convention:
   `/mnt/private/next-sentinel/.env` (`server/config.py:33`),
   `…/doc_store` (required: `server/config.py:214-216` fails launch if
   `DOC_STORE_DIR` is unset — "or uploads will not survive a rebuild"),
   `…/specs`, `…/kb`, `…/logging` — each with a repo fallback. The UI shows a
   deliberate fail-loud "re-upload" banner for the cleared-store case
   (`tests/test_ib_lending_path.py:86-88`). **Inherit** the `/mnt` convention
   for anything the successor must keep. One inconsistency to not copy:
   `server/prompts/dev_overrides/` is runtime-written *inside the repo tree*
   (`server/core/prompt_manager.py:27-28`) — lost on rebuild and dirties the
   working tree, blocking `git pull`. **Do better:** never have the app write
   into its own checkout.

3. **README contradicts the code in three operationally-relevant places.**
   (a) `README.md:34-36` promises boot-without-creds, but `run.py` calls
   `preflight_or_exit()` and hard-exits when any of the **six** required vars
   is missing (`server/config.py:137-145`: `AZURE_OPENAI_ENDPOINT`,
   `AZURE_OPENAI_DEPLOYMENT`, `OPENAI_API_VERSION`,
   `AZURE_OPENAI_EMBEDDINGS_DEPLOYMENT`, `AZURE_DOCINTEL_ENDPOINT`,
   `DOC_STORE_DIR`) — only `create_app()` (tests) boots degraded.
   (b) `README.md:45-46` says `.env` loads with `override=False`; the code
   does the opposite. (c) README names only three required vars. Trust
   `server/config.py`, not the README.

4. **The pin authority does not exist.** `requirements.txt:3`,
   `pyproject.toml:27,30`, `server/config.py:5`, `server/core/azure_auth.py:4`
   and `server/parsing/doc_intelligence.py:3` all cite `docs/CONSTRAINTS.md`
   ("Domino runtime #6", "Azure authentication #4") — **the file is not in the
   repo**. Similarly `docs/PHASE1_PLAN.md` is cited by committed code but
   gitignored. **Do better:** commit the constraint docs your code cites.

5. **Azure egress is proxy-only.** Document Intelligence goes through
   Domino's local nginx proxy exclusively —
   `server/parsing/doc_intelligence.py:3-6`: "endpoint is Domino's local
   nginx proxy (`https://127.0.0.1:8443`) — never
   `*.cognitiveservices.azure.com` directly"; auth is `DefaultAzureCredential`
   only, one credential per process (`server/core/azure_auth.py:1-6`).
   Nothing configures TLS trust for that self-signed local endpoint — it
   evidently works ambiently; expect the same interception to affect any
   HTTPS the successor's tooling does.

6. **Ports are contested.** Parent app owns 8080; this POC took 8081
   (`run.py:23` comment); the "deep" service handoff also showed 8080
   (`docs/DEEP_INTEGRATION_PROMPT.md:88-90` warns to verify). The successor
   needs its own port. Also note the env-var-sharing contract: identical var
   names so **one** Domino environment serves parent + POC
   (`docs/ARCHITECTURE.md:93-94`) — and one residue trap:
   the log-level var is still `LISA_LOG_LEVEL` (`server/config.py:172`);
   setting `LOG_LEVEL` does nothing.

7. **No websockets, deliberately-shaped polling.** Job progress is 1-second
   HTTP polling (`server/core/jobs.py:7`), which sidesteps
   websocket-through-proxy entirely. **Inherit** for anything long-running:
   polling is the proven transport in this environment.

8. **Manifests are frozen (Nexus).** "never edit `requirements.txt` /
   `pyproject.toml` to work around sandbox install issues — flag instead"
   (`docs/DEEP_INTEGRATION_PROMPT.md:34`). A sandbox/laptop install failure is
   not evidence a dep is missing on Domino. Assume the same discipline will
   apply to the successor's `package.json` once an internal registry is in the
   loop. One undocumented residue: `web/package.json` carries
   `"overrides": { "brace-expansion": "^2.0.2" }` with no stated reason
   (almost certainly a CVE pin) — **do better:** document overrides where JSON
   can't hold comments (README or a `# why` in the lockfile-adjacent docs).

9. **System binaries are admin-installed.** Poppler/Tesseract "installed
   separately by Domino admins" (`server/parsing/parsers.py:140-144`), probed
   for real at `/api/health`. Model for anything the successor needs beyond
   npm: file a platform request, don't script an install.

10. **Tests must defend against the real `.env`.** Because config loads at
    import with `override=True`, both harnesses point `SENTINEL_DOTENV_PATH`
    at a nonexistent file to load nothing (`tests/conftest.py:23-26`,
    `tests/smoke/e2e_smoke.py:46-49`) — otherwise a test run *in Domino*
    would write into the live `/mnt` doc store. If the successor adopts the
    dotenv pattern, adopt the off-switch with it.

---

## 5. Translation table

| POC finding (evidence) | Successor setting |
|---|---|
| No in-repo npm registry config; installs work via an **ambient** environment-level mirror; lockfile is 100% `registry.npmjs.org` (`web/package-lock.json`; Makefile:8) — *do better* | Commit an `.npmrc` in the successor repo: `registry=https://<nexus-host>/repository/npm-proxy/` (read the real URL in a Domino workspace via `npm config get registry`; get auth/`cafile`/`strict-ssl` lines from the platform team if `npm ping` fails bare). Also add `engine-strict=true` to make the Node floor enforced. |
| Committed `package-lock.json`, lockfileVersion 3; bare `npm install` (Makefile:8) — *inherit the lockfile, do better on the command* | Commit `package-lock.json`; install with **`npm ci`** on Domino (reproducible, prunes, fails loud on lockfile drift). |
| No Node pin; advisory `"node": ">=18.0.0"` only (`web/package.json:7-10`); Node provisioning undocumented — *do better* | Run `node --version` in the target Domino workspace and pin exactly that in **`.nvmrc`** (expect a v18/v20 line, since Vite builds there today). If Node is absent/old, it's a platform-team request — the base image provides it (cf. `parsers.py:143` pattern), not nvm-in-repo. |
| Build runs **manually in the Domino workspace**; `dist/` untracked; no CI (Makefile:10-12, `web/.gitignore:2`) — *inherit* | Same flow: `npm ci && npm run build` in the workspace before launch. Keep `dist/` untracked; add the POC's placeholder-page fallback so a missing build renders instructions, not a 500 (`server/api/spa.py:16-37`). |
| Zero build-time env vars; API base is the hardcoded relative `const BASE = "api"` (`client.ts:9`) — *inherit the relative-API rule* | Keep all API calls relative (`api/...`, never `/api/...`). This is the rule that makes the proxy prefix free. |
| `base: "./"` + **no router** — relative assets survive `/proxy/<port>/` only because the app never leaves the proxy root (`vite.config.ts:13-17`) — *inherit the idea, not the value: the successor has deep links* | Set **`VITE_BASE_PATH=/proxy/<PORT>/`** for the Domino build (e.g. `/proxy/8082/`) so assets get absolute prefix-aware paths and deep links like `/proxy/8082/reports/42` load working assets via the Flask fallback. Two caveats: (1) the `/proxy/<port>/` form is the *workspace* proxy path evidenced in this repo (`vite.config.ts:14`, `PROCESS_FLOW.md:29`) — verify the prefix of a *published* Domino App in the target env before hardcoding; (2) if the prefix turns out unstable, fall back to the POC combo: `base: "./"` + a **hash router**, which keeps deep links in the fragment and relative assets valid. |
| SPA fallback: catch-all blueprint registered **last**, three-tier file→`index.html`→placeholder, `startswith("api/")` guard, `Flask(static_folder=None)` (`server/api/spa.py`, `server/api/__init__.py`, `server/__init__.py:56-58`) — *inherit verbatim* | Wrap the successor's `dist/` in the same pattern: API blueprints under `/api` first, then `@bp.route("/", defaults={"path": ""})` + `@bp.route("/<path:path>")` serving `dist/<path>` if it's a file else `dist/index.html`; keep the `api/` 404 guard and the `test_api_paths_not_intercepted` test (`tests/test_spa_routes.py:19-22`). |
| Server-minted URLs are relative — `image_url=f"api/documents/..."`, no leading slash (`ib_lending.py:498,556`) — *inherit* | Mock-API responses that embed URLs must emit them relative too. One absolute path breaks only behind the proxy — the worst kind of bug. |
| Same-origin, zero CORS (`requirements.txt`, no `Access-Control-*` anywhere) — *inherit* | Serve mock API and `dist/` from one Flask process on one port. No CORS config, ever. |
| No `app.sh` exists; launch contract = `python run.py`, honoring Domino-injected `PORT`, bind `0.0.0.0`, run from repo root (`run.py:22-26`) — *inherit the contract, do better by writing it down* | Ship an `app.sh`: `#!/usr/bin/env bash`, `cd "$(dirname "$0")"`, `exec python run.py` — with `run.py` doing `host = os.getenv("FLASK_RUN_HOST", "0.0.0.0")`, `port = int(os.getenv("PORT", "<default>"))`. Pick a default port that is neither 8080 (parent) nor 8081 (this POC) — e.g. **8082** — and keep `PORT` winning so Domino stays in control. |
| Werkzeug dev server, single process; in-memory state is load-bearing (`run.py:26`, `pyproject.toml:44`) — *inherit only with the constraint* | `app.run()` is fine behind Domino's proxy for a mock-API UI. If you add gunicorn later, `workers=1` unless all state is external. |
| Persistent config on `/mnt`, `.env` wins with `override=True`, but injected rotating credentials must never be pinned (`server/config.py:3-11,33`, `.env.example:22-32`) — *inherit pattern + warning together* | If the successor needs any surviving config, put it at `/mnt/private/<successor>/.env` with the same `override=True` + explicit-path off-switch (`SENTINEL_DOTENV_PATH` analogue) — and copy the "never pin Domino-injected credentials" comment block into its `.env.example`. |
| Domino env vars the POC actually depends on: injected `PORT` at runtime; six `required_env` for the backend; **nothing** for npm/build (`server/config.py:137-145`, `run.py:24`) — *inherit* | Domino environment for the successor needs: `PORT` (injected by Domino — just honor it), plus whatever registry/CA vars §1.3/§5-row-1 discovery turns up. `VITE_BASE_PATH` is **build-time** — set it in the workspace shell (or a committed `.env.production`) before `npm run build`, not in the Domino app env. |
| Rebuild wipes repo-tree state; app must never write into its own checkout (dev_overrides counterexample, `prompt_manager.py:27-28`) — *do better* | Any runtime-written state (mock-API fixtures included, if editable) goes under `/mnt/private/<successor>/`, never inside the git checkout. |

---

*Method note: every quoted line was read from this repo at commit `242ee9f`
(working tree, 2026-08-31). The two ambient unknowns that cannot be answered
from the repo — the internal npm registry URL and the Domino image's Node
version — are marked above with the exact command to run in a Domino
workspace to resolve them.*
