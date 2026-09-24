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
- **What you should see first**: the **Sentinel suite landing** — four live application cards: **CRR**, **Credit Portfolio Event Assessment (CPEA)**, **Vantage** and **Inquiry**, each with an **Open** button. Click **Open** on CRR. On later visits `/` skips the landing and goes straight back into the app you used last (the masthead brand "Sentinel · CRR ▾" is the switcher, and "All applications" brings the landing back at `/apps`). A user entitled to one application only skips the landing entirely — see step 36.
- **What you should see next**: the **Start a review** page — a serif heading, a dashed drop zone ("Drag documents here"), an optional "Anything Sentinel should know?" box, and a **Recent** list beginning with *Veyland US Holdco LLC* (amber "4 open" badge). A left rail shows Home, My reviews, All reviews, Documents, Policy library.

Leave this terminal running; press `Ctrl+C` to stop the server.

## 4. Guided tour

The data is fictional. Every action below persists in your browser (survives refresh); step 37 resets everything.

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
16. **Resize the rail** — hover the rail’s left edge (a thin double hairline appears, `col-resize` cursor) and drag left: the rail grows (260–560px, persisted). Past **420px** it becomes a reading pane — the text steps up a size and Debate lays advocate/dissent side by side. **Double-click the edge to reset** to the default 312px. The handle is keyboard-accessible too (focus it, arrows / Home / End).

**Areas of assessment and reference data**

15a. Between the attention block and the work paper sits **Areas of assessment** — the management-summary verdicts the exported review opens with. Click its header to fold it: the amber "1 pending" badge and the tally ("8 areas · 6 satisfactory · 1 n/a") stay visible. Expand *Repayment Capacity — Secondary Sources* (the pending one): it names its blocker (the unverified WACC), links **Resolve in Section 2 →**, and offers **Satisfactory / Unsatisfactory**. Set one — the pill, badge, and tally all update, and the verdict records like any disposition (refresh to prove it).
15b. Just under the sub line, click **Reference data** — the upstream credit-system snapshot (as-of date) and CRR-internal designations unfold in a compact grid, each value carrying an origin chip. Collapsed by default so the facts never compete with the story.

**Dispositions**

17. Select **Liquidity**, open **Respond**, click **Incorrect**. A rationale field appears — confirming with it empty is refused. Type `Figure superseded by the Q3 update` and click **Clear — Incorrect**. The item is struck in place with "✓ cleared — incorrect · struck on screen, omitted from the exported review" and your rationale beside it. Click **undo** to restore it.
18. In NEEDS YOUR ATTENTION, click **dismiss** on *Customer concentration* (dismiss exists only on flag rows). The open count drops.
19. Click **mark reviewed** on another open row, type a one-line note, **Save**. The row turns green: `Reviewed — "your note"`, with **edit** and **un-review** affordances.

**Export — both outcomes**

20. Click **Export Review** in the sticky bar. A placeholder `.docx` downloads and a toast names the file.
21. Go to **My reviews** → open **Seldwyn Marine Finance** → click **Export Review**. This fixture fails on purpose: a red toast and an inline banner show the exact render-service message. The screen never breaks.

**Themes and rails**

22. In the masthead, switch the theme select **Stone → Cobalt** (navy rail on a light page), and click the **moon** to see the dark variant of each — four looks, one token layer. Choices persist across refresh.
23. Still in the masthead, try the **S / M / L** text-size control to the left of the theme select — the whole type scale recomputes from one knob (S ≈ the app's original density on a Retina display). The choice persists across refresh, independently of the theme.
24. Click **Collapse sidebar** at the rail's foot — a 58px icon strip remains, section numbers become the icons. Click the panel icon in the borrower bar to hide/show the right rail. Both persist.

**Lists**

25. **All reviews** tab: toolbar first. Search `veyland` — two rows appear (a material-change re-review): the newer one carries the **2nd in 12 mo** chip; the older belongs to T. Alvarez with a **read-only** badge. Clear the search; filter Line of business → *Wealth Management*; try Owner and Period (the counts change — filtering happens in the "backend", not the page). Open a read-only review: no dispositions anywhere, and a line says whose it is.
26. **Documents** opens in browse mode: one row per document — mono filename, extraction badge, LOB, date. No preview text. Click the *Veyland_Holdco_Q3_Update.pdf* row: it selects (accent stripe) and an action bar appears — **Preview extracted text**, **Download original**, and **Used in Veyland review →**. Click the *Farrowdale_Logistics_Q2_Update.pdf* row: not yet extracted, so its preview action is disabled.
27. Click **Preview extracted text** on the Veyland Q3 row: a modal titled "Veyland_Holdco_Q3_Update.pdf — extracted text" shows pages, parsed date, status and section count, then the document's own sections as collapsible entries with mono page ranges (first one open). `Esc` closes. **Download original** saves a placeholder PDF.
28. Now search `revolver availability` — the browse rows give way to match evidence: passages with the matched words highlighted, provenance (`Liquidity Summary · p. 14`), and "Used in Veyland review →" which deep-links straight into Section 2.
29. Still in Documents, try the advanced syntax ("Advanced search" explains it): `"letters of credit"` (exact phrase — two hits) and `revolver -letters` (excludes passages containing "letters").

**The other applications** (open them from the switcher, "Sentinel · CRR ▾")

30. **CPEA → Start** — under *The population*, type `amber` in **Borrower — optional**, pick *Ambervale Foods Group*: a chip (name + `RXM-5120` + ✕) replaces the field, the four dropdowns grey out, and the line reads "Will run against: Ambervale Foods Group (RXM-5120) — resolves to 1 borrower · 5 documents". Typing `6430` finds Veyland by RXM; arrow keys and Enter work too. Click ✕ to go back to the whole portfolio.
31. Still on CPEA Start, with **Prompt only** selected, type `Which borrowers face refinancing risk in the next 12 months?` and click **Run analysis**. Processing says "One-off question"; the results are one row per borrower — Borrower · RXM · Flags · Answer, no By borrower / By question toggle. Click the Veyland row: the full answer, `derived` + `conf medium`, and **Detail & evidence →** with both quotes. (Choose **Question set** instead and you get the 17-column monitor, as before.)
32. **CPEA → Documents** — every borrower group ends with **Ask about this borrower →**. Click Torvane's: you land on Start with Torvane already chosen ("resolves to 1 borrower · 1 document").
33. **Vantage → Ask** — *What to ask* now has two modes. In **One-off questions**, drop `docs/demo-files/Watchlist_Qs.xlsx` (in this repository) on the slim row under the question box: it uploads, then a review card lists the file's questions — "14 questions read", three shown, **+ 11 more — review all before running**. Remove one with its ✕; type a question of your own too — the line beside **Ask** counts both ("14 questions · …"). Attach a document and **Ask**: the answer has one heading per question ("Q1 of 14" …), each with its own blocks. (The demo reads any file named `Watchlist_Qs.xlsx`; other .xlsx files get a labeled placeholder list — real parsing is backend work.)
34. Back on Ask, drop the file again and click **Save as a question set**: the modal opens with the file and the title "Watchlist Qs" filled in; **Save**. Switch to **Question set** — it sits beside Vantage's own two sets (Exposure limits sweep, Key-customer scan). CPEA's shelf does not show it: every application keeps its own sets.
35. **Inquiry** — the fourth application, for senior leadership: CPEA with the question-set shelf removed. Start is one box ("Your question — type it and go — nothing here is saved for reuse") plus the same borrower scope. **Runs** keeps every question asked — open the refinancing run (4 stated · 1 derived · 1 unsupported) and the cancelled one ("cancelled before completion").
36. **One-application user** — in the console run `localStorage.setItem('sentinel.mock.user', 'u-leadership')` and go to `/`: you land straight in Inquiry, and the brand is plain "Sentinel · Inquiry" with no switcher. `localStorage.removeItem('sentinel.mock.user')` switches back (demo-mode only; a real deployment takes identity from the sign-in).

**Reset**

37. To reset the demo to its shipped state: open the browser devtools console (`F12`) and run `localStorage.removeItem('sentinel.mock.state')`, then refresh. (Theme and layout preferences are stored separately and survive.)

## 5. Serving the built app (target-environment style)

The repo ships a minimal Flask wrapper (`server/` + `run.py` + `app.sh`) that serves the production build the way it will be served in the target environment — one process, SPA fallback included (deep-link refresh works, unlike a bare static server). You need Python 3 with Flask:

```sh
make build                        # produces dist/
make run                          # → "Running on http://0.0.0.0:8082"
```

> **Deploying behind the target environment's proxy?** Build with `VITE_BASE_PATH=./ VITE_ROUTER=hash make build` instead — confirmed working in the live environment (2026-09-09). A default `make build` bakes root-absolute asset paths that 404 behind the proxy prefix and the page renders blank.

(`make install` already covered the Flask dependency.)

Open http://localhost:8082 — the same app as `npm run dev`, but served from the static build. Refresh any deep URL (e.g. `/crr/review/rev-veyland-2026-08`) and it loads. If you skip `npm run build`, you get a styled placeholder page with the build commands instead of an error. The port chain is `PORT` → `FLASK_RUN_PORT` → `8082`; `./app.sh` is the same thing as the hosted-app entry point.

## 6. Environment variables

Copy `.env.example` to `.env` to set any of these (all optional):

| Variable             | Default | What it does                                                                                          |
| -------------------- | ------- | ----------------------------------------------------------------------------------------------------- |
| `VITE_API`           | `mock`  | Which API implementation the app uses. Only `mock` exists in this repo; `http` is the dev team's.      |
| `VITE_BASE_PATH`     | `/`     | Build-time path prefix for reverse-proxy hosting — see docs/environment.md → "Running behind a proxy". |
| `VITE_ALLOWED_HOSTS` | —       | Dev server only: comma-separated hostnames to accept when proxied.                                     |
| `VITE_ROUTER`        | `browser` | `hash` = target-environment fallback routing in the URL fragment; pair with `VITE_BASE_PATH=./` (docs/environment.md). |
| `PORT`               | `8082`  | Flask wrapper only (`run.py`); platform-injected on a published app.                                   |

## 6b. Trying different fonts (dev only)

`make dev` mounts a small **Font Lab** panel in the bottom-right corner. It exists to answer "does this look better?" against real screens rather than a specimen sheet.

- **Pairings** — one click applies a curated body/display/mono set. Start with **All-native**: it uses no webfonts at all, which on a non-retina monitor is the sharpest the app can possibly look. If that already looks better to you, the problem is webfont rendering at 1x, not the typeface choice.
- **Per-role dropdowns** — override body, display or mono independently.
- **Smoothing** — `OS default` vs `antialiased`. On a 1x display the OS default (ClearType on Windows) renders sturdier stems; `antialiased` is a retina-era habit that thins type and is a common reason text looks weak on ordinary monitors. The app currently sets neither, so `OS default` is what ships.
- **Device pixel ratio**, live — it updates as you zoom. This one is worth reading before blaming a typeface. Below `1x` the browser is drawing the page *smaller* than 1:1, so glyphs are downscaled and hinting is discarded; everything looks soft whatever font is loaded. `Ctrl+0` / `Cmd+0` resets zoom to 100%. Fractional values (`1.25x`, `0.9x`) mean zoom or fractional OS scaling, which resamples glyphs for the same reason. The panel warns on both.
- Choices persist across reloads; **reset to shipped tokens** returns to the default.

Candidates are chosen for legibility at small sizes, not charm: system stacks (no download, OS-hinted, work offline), plus IBM Plex Sans, Public Sans, Source Sans 3, Lora, Newsreader and JetBrains Mono, each loaded only when picked.

**None of this ships.** The lab is behind `import.meta.env.DEV` and reached through a dynamic import, so the build drops it and every candidate font; `npm run check:no-devtools` fails the build if that ever regresses.

**Adopting a font you like** is a separate, deliberate change: move its package from `devDependencies` to `dependencies`, import it in `src/main.tsx`, and edit the three tokens in `src/styles/tokens.css`. Note the target environment has no CDN, so the face must come from npm (`@fontsource*`) and be bundled — never a Google Fonts link.

## 7. Troubleshooting

| Symptom                                                                       | Cause and fix                                                                                                                                                              |
| ----------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `npm ci` fails with an engine or syntax error                                  | Node too old. `node --version` must be ≥ 22.12; install Node 24 (`nvm install`).                                                                                            |
| `Error: Port 5173 is in use`                                                   | Another dev server is running. Stop it, or run `npm run dev -- --port 5174` and open that port instead.                                                                     |
| Blank page                                                                     | Open the browser console (`F12`). If assets 404 under a proxy prefix, the build's `VITE_BASE_PATH` doesn't match the prefix (docs/environment.md). If you built for a prefix and are opening `/`, rebuild without `VITE_BASE_PATH`. |
| `Blocked request: This host is not allowed`                                    | You're reaching the dev server through a proxy hostname. Set `VITE_ALLOWED_HOSTS=<that hostname>` and start with `npm run dev -- --host`.                                    |
| Refreshing `/crr/review/…` returns 404 on a static server                          | The server must serve `index.html` for unknown paths (SPA fallback). `npm run preview` does this; plain `python -m http.server` does not — enter at `/` instead.             |
| Demo looks "used" (cleared items, resolved rows)                               | That's persistence working. Reset with step 26 above.                                                                                                                       |
| In a target-environment workspace, nothing appears after `make dev` / `make run` | Nothing auto-opens there. Both print (or `make doctor` prints) the URL to visit: your workspace URL with `/proxy/<port>/` appended. |
| In a target-environment workspace, the page loads but is blank | The workspace path was neither discovered nor pinned, so the build used laptop defaults and its root-absolute assets 404 behind the prefix. Run `echo '<paste workspace URL>' > .sentinel-workspace-path`, then `make build`. `make doctor` reports the active mode and which kind of build `dist/` holds. |
| Tests can't find browsers (`npx playwright …`)                                 | One-time `npx playwright install chromium` (only needed for `npm run e2e`, not for the demo).                                                                                |
