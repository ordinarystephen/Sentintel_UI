# Runbook — running the Sentinel UI demo

For a reader who has never run a JavaScript project. Everything here works on a laptop with no backend, no VPN, and no credentials — the app ships with an in-memory mock of its API.

## 1. Prerequisites

You need **Node.js 24** (the JavaScript runtime) and **npm** (its package manager, installed with it).

Check what you have:

```sh
node --version    # want v24.x (anything ≥ v22.12 works)
npm --version     # want 10.x or 11.x (comes with Node)
```

If `node` is missing or old, either install Node 24 LTS from https://nodejs.org, or — if `nvm` is available — run `nvm install` in the repo folder (it reads `.nvmrc` and installs the pinned version).

## 2. Install

From the repository folder:

```sh
make install
```

- **What it does**: installs the Flask serving wrapper's Python dependency (`pip install -r requirements.txt`) and downloads the exact JavaScript dependency versions recorded in `package-lock.json` into a local `node_modules/` folder (`npm ci`). This is the **only step that touches the network**.
- **Expected output**: ends with a line like `added 292 packages, and audited 293 packages in …`. Two `npm warn deprecated` lines are expected and harmless.
- **How long**: 1–2 minutes on a first-ever install (downloads ~200 MB); a few seconds when npm's cache is warm.

Nothing is compiled and nothing else is downloaded. If `npm ci` fails, see Troubleshooting below.

## 3. Start the app

```sh
make dev
```

- **Expected output**, within about a second:

  ```
  VITE v6.x.x  ready in ~400 ms
  ➜  Local:   http://localhost:5173/
  ```

- **Open** http://localhost:5173/ in Chrome or Edge.
- **What you should see first**: the **Start a review** page — a serif heading, a dashed drop zone ("Drag documents here"), an optional "Anything Sentinel should know?" box, and a **Recent** list beginning with *Veyland US Holdco LLC* (amber "4 open" badge). A left rail shows Home, My reviews, All reviews, Documents, Policy library.

Leave this terminal running; press `Ctrl+C` to stop the server.

## 4. Guided tour

The data is fictional. Every action below persists in your browser (survives refresh); step 26 resets everything.

**Start a review and watch it process**

1. On **Home**, click the drop zone and pick any one or two PDF files (any PDF works — contents are ignored in mock mode), or drag them in. Mono file chips appear with sizes.
2. In "Anything Sentinel should know?", type: `What is revolver availability at close?`
3. Click **Begin review**. You land on a calm processing screen: the file names in mono, italic "*Reading the documents*", one thin bar, and a single status line that cycles *Reading… → Indexing… → Running policy checks…* over about 15 seconds.
4. While it runs, look at the left rail: the review appears as "NEW REVIEW — READING…", then **renames itself to Veyland US Holdco LLC** midway when the borrower is detected. (Refresh the page mid-run if you like — processing resumes; it is durable from upload.)
5. When it finishes, the same URL becomes a full review — and your question from step 2 is now an open row in NEEDS YOUR ATTENTION, tagged `question`.

**Read the review page**

6. Top: the sticky borrower bar (serif name, mono `CL6430`, **Export Review**). Scroll — the bar stays pinned; only the canvas scrolls.
7. **The story** — narrative plus a "what changed" timeline (`prior 9.0% → current 6.5%`) comparing the documents within this run.
8. **NEEDS YOUR ATTENTION** — click its header to collapse and reopen it (the "5 open" badge stays visible while collapsed). Rows deep-link: click **Section 2 →** on any row and the Financials section expands, scrolls into view, and flashes once.
9. **Work paper** — click section headers to open and close them (they ease open; pending sections show their feeder note, e.g. "TO BE POPULATED. Feeders: rating model output, Financials."). In section 2, note the `conf 94%` / `conf 97%` mono chips, and the flagged row: **Expected Case WACC** with an amber stripe, `conf 41% · low`, and "⚠ review required — the Word export flags this value."
10. Click **View source** on the Liquidity quote: the source modal shows filename · section · page, a "section image" badge, and the quote. Press `Esc` to close.

**The context rail (right side)**

11. The WACC item is already selected (accent stripe); the rail header reads **§2 Expected Case WACC**. Click the Liquidity paragraph and watch the rail follow it; click WACC again.
12. **Why** tab — the resolution chain (template → matched table → flagged below the floor) and the applied policies (`ProcMan-DEMO · §4.2`, `POLICY · ib-lending/ev-support`).
13. **Respond** tab — type `Use 9.6% from the prior review` and click **Send & re-run**. The item shows a "re-running…" spinner for a moment, then the value becomes **9.6%**, `conf 93%`, the flag lifts, and the attention row resolves itself.
14. **Debate** tab — advocate (green) and dissent (red) positions with citations, and the footnote: positions are advisory; the analyst's disposition decides.
15. **Prior** tab — "Since the Feb 2026 review": deltas with worsening values in amber, and a link to the prior review. (Open a review with no prior — e.g. Ambervale Foods — and this tab isn't there at all.)

**Areas of assessment and reference data**

15a. Between the attention block and the work paper sits **Areas of assessment** — the management-summary verdicts the exported review opens with. Click its header to fold it: the amber "1 pending" badge and the tally ("8 areas · 6 satisfactory · 1 n/a") stay visible. Expand *Repayment Capacity — Secondary Sources* (the pending one): it names its blocker (the unverified WACC), links **Resolve in Section 2 →**, and offers **Satisfactory / Unsatisfactory**. Set one — the pill, badge, and tally all update, and the verdict records like any disposition (refresh to prove it).
15b. Just under the sub line, click **Reference data** — the upstream credit-system snapshot (as-of date) and CRR-internal designations unfold in a compact grid, each value carrying an origin chip. Collapsed by default so the facts never compete with the story.

**Dispositions**

16. Select **Liquidity**, open **Respond**, click **Incorrect**. A rationale field appears — confirming with it empty is refused. Type `Figure superseded by the Q3 update` and click **Clear — Incorrect**. The item is struck in place with "✓ cleared — incorrect · struck on screen, omitted from the exported review" and your rationale beside it. Click **undo** to restore it.
17. In NEEDS YOUR ATTENTION, click **dismiss** on *Customer concentration* (dismiss exists only on flag rows). The open count drops.
18. Click **mark reviewed** on another open row, type a one-line note, **Save**. The row turns green: `Reviewed — "your note"`, with **edit** and **un-review** affordances.

**Export — both outcomes**

19. Click **Export Review** in the sticky bar. A placeholder `.docx` downloads and a toast names the file.
20. Go to **My reviews** → open **Seldwyn Marine Finance** → click **Export Review**. This fixture fails on purpose: a red toast and an inline banner show the exact render-service message. The screen never breaks.

**Themes and rails**

21. In the masthead, switch the theme select **Stone → Cobalt** (navy rail on a light page), and click the **moon** to see the dark variant of each — four looks, one token layer. Choices persist across refresh.
22. Still in the masthead, try the **S / M / L** text-size control to the left of the theme select — the whole type scale recomputes from one knob (S ≈ the app's original density on a Retina display). The choice persists across refresh, independently of the theme.
23. Click **Collapse sidebar** at the rail's foot — a 58px icon strip remains, section numbers become the icons. Click the panel icon in the borrower bar to hide/show the right rail. Both persist.

**Lists**

24. **All reviews** tab: toolbar first. Search `veyland` — two rows appear (a material-change re-review): the newer one carries the **2nd in 12 mo** chip; the older belongs to T. Alvarez with a **read-only** badge. Clear the search; filter Line of business → *Wealth Management*; try Owner and Period (the counts change — filtering happens in the "backend", not the page). Open a read-only review: no dispositions anywhere, and a line says whose it is.
25. **Documents** opens in browse mode: one row per document — mono filename, extraction badge, LOB, date. No preview text. Click the *Veyland_Holdco_Q3_Update.pdf* row: it selects (accent stripe) and an action bar appears — **Preview extracted text**, **Download original**, and **Used in Veyland review →**. Click the *Farrowdale_Logistics_Q2_Update.pdf* row: not yet extracted, so its preview action is disabled.
26. Click **Preview extracted text** on the Veyland Q3 row: a modal titled "Veyland_Holdco_Q3_Update.pdf — extracted text" shows pages, parsed date, status and section count, then the document's own sections as collapsible entries with mono page ranges (first one open). `Esc` closes. **Download original** saves a placeholder PDF.
27. Now search `revolver availability` — the browse rows give way to match evidence: passages with the matched words highlighted, provenance (`Liquidity Summary · p. 14`), and "Used in Veyland review →" which deep-links straight into Section 2.
28. Still in Documents, try the advanced syntax ("Advanced search" explains it): `"letters of credit"` (exact phrase — two hits) and `revolver -letters` (excludes passages containing "letters").

**Reset**

29. To reset the demo to its shipped state: open the browser devtools console (`F12`) and run `localStorage.removeItem('sentinel.mock.state')`, then refresh. (Theme and layout preferences are stored separately and survive.)

## 5. Serving the built app (target-environment style)

The repo ships a minimal Flask wrapper (`server/` + `run.py` + `app.sh`) that serves the production build the way it will be served in the target environment — one process, SPA fallback included (deep-link refresh works, unlike a bare static server). You need Python 3 with Flask:

```sh
make build                        # produces dist/
make run                          # → "Running on http://0.0.0.0:8082"
```

> **Deploying behind the target environment's proxy?** Build with `VITE_BASE_PATH=./ VITE_ROUTER=hash make build` instead — confirmed working in the live environment (2026-09-09). A default `make build` bakes root-absolute asset paths that 404 behind the proxy prefix and the page renders blank.

(`make install` already covered the Flask dependency.)

Open http://localhost:8082 — the same app as `npm run dev`, but served from the static build. Refresh any deep URL (e.g. `/review/rev-veyland-2026-08`) and it loads. If you skip `npm run build`, you get a styled placeholder page with the build commands instead of an error. The port chain is `PORT` → `FLASK_RUN_PORT` → `8082`; `./app.sh` is the same thing as the hosted-app entry point.

## 6. Environment variables

Copy `.env.example` to `.env` to set any of these (all optional):

| Variable             | Default | What it does                                                                                          |
| -------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `VITE_API`           | `mock`  | Which API implementation the app uses. Only `mock` exists in this repo; `http` is the dev team's.      |
| `VITE_BASE_PATH`     | `/`     | Build-time path prefix for reverse-proxy hosting — see docs/environment.md → "Running behind a proxy". |
| `VITE_ALLOWED_HOSTS` | —       | Dev server only: comma-separated hostnames to accept when proxied.                                     |
| `VITE_ROUTER`        | `browser` | `hash` = target-environment fallback routing in the URL fragment; pair with `VITE_BASE_PATH=./` (docs/environment.md). |
| `PORT`               | `8082`  | Flask wrapper only (`run.py`); platform-injected on a published app.                                   |

## 7. Troubleshooting

| Symptom                                                                       | Cause and fix                                                                                                                                                              |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci` fails with an engine or syntax error                                  | Node too old. `node --version` must be ≥ 22.12; install Node 24 (`nvm install`).                                                                                            |
| `Error: Port 5173 is in use`                                                   | Another dev server is running. Stop it, or run `npm run dev -- --port 5174` and open that port instead.                                                                     |
| Blank page                                                                     | Open the browser console (`F12`). If assets 404 under a proxy prefix, the build's `VITE_BASE_PATH` doesn't match the prefix (docs/environment.md). If you built for a prefix and are opening `/`, rebuild without `VITE_BASE_PATH`. |
| `Blocked request: This host is not allowed`                                    | You're reaching the dev server through a proxy hostname. Set `VITE_ALLOWED_HOSTS=<that hostname>` and start with `npm run dev -- --host`.                                    |
| Refreshing `/review/…` returns 404 on a static server                          | The server must serve `index.html` for unknown paths (SPA fallback). `npm run preview` does this; plain `python -m http.server` does not — enter at `/` instead.             |
| Demo looks "used" (cleared items, resolved rows)                               | That's persistence working. Reset with step 26 above.                                                                                                                       |
| Tests can't find browsers (`npx playwright …`)                                 | One-time `npx playwright install chromium` (only needed for `npm run e2e`, not for the demo).                                                                                |
