# API handoff — swapping the mock for the real backend

This is the one document a developer needs to wire Sentinel's UI to the Flask backend. The UI never calls `fetch`; it consumes a single typed interface, `SentinelApi`, through the TanStack Query hooks in `src/api/hooks.ts`. The mock in `src/api/mock/` implements that interface today. Your job is `src/api/http/` — an implementation of the same interface — and nothing else changes.

## Where things are

| Path                       | What                                                                                       |
| -------------------------- | ------------------------------------------------------------------------------------------ |
| `src/api/types.ts`         | The domain model. Field-level comments carry the contract notes.                          |
| `src/api/client.ts`        | `SentinelApi` (every method has JSDoc stating its real-backend semantics) + `createApi()`. |
| `src/api/hooks.ts`         | Query keys, queries, mutations. Screens use only these.                                   |
| `src/api/mock/`            | In-memory implementation + fixtures. Reference behaviour; also the demo.                  |
| `src/api/http/` (yours)    | `createHttpApi(): SentinelApi`. Register it in `createApi()` under `case 'http'`.          |
| `.env.example`             | `VITE_API=mock` — set `http` to use yours.                                                 |

`createApi()` is the single switch. Nothing else in `src/` knows which implementation is live.

## Ground rules the UI relies on

- **Times** are ISO-8601 strings, UTC. The UI formats in `src/lib/format.ts`; never send pre-formatted dates.
- **Errors**: reject with `ApiError` (from `src/api/client.ts`) whose `message` is the specific, human-readable reason. The UI shows it verbatim — in the processing banner, the export toast + inline alert, and action toasts. There is no generic "something went wrong"; the message you send is what the analyst reads.
- **Confidence floor**: every extracted `WorkItem` carries `confidence` in `[0, 1]`; `Review.confidenceFloor` is the single threshold. `WorkItem.flags` must be derived server-side from `confidence < confidenceFloor` — the screen's amber treatment and the DOCX "REVIEW REQUIRED" banner must come from the same number.
- **Schema versioning discipline**: any store that persists review records must version the payload and refuse (or migrate) records saved under an older shape — a stale record silently shadowing the current schema is how missing-field crashes reach the UI. The mock does this with `STATE_VERSION` in `src/api/mock/mockApi.ts` (bumped on every shape change; mismatches are discarded in favor of fixtures). The real backend needs the same discipline when the review schema evolves. **A well-formed review always carries assessment areas** — the UI tolerates a missing/empty `areas` field only as a data-integrity guard for malformed or legacy records, never as an expected state.
- **Durability**: a review record exists from the moment `createReview` resolves. Every analyst action appends to `Review.dispositions` with `actorId` + `at`. Nothing is deleted; clears are reversible; the exported document simply omits cleared content.
- **Line of business**: the **review** is authoritative for `lob`; documents carry a denormalized copy for search. When they disagree, the review wins.
- **Read-only**: `Review.readOnly` is true when the caller is not the owner. Mutations on such reviews must reject with a message naming the owner (the mock's wording: "This review belongs to R. Chen — you can read it, but editing stays with its owner.").
- **The export opens with the Areas of assessment table** (screen = deliverable): the management-summary verdicts (`Review.areas`) render first in the DOCX, with the same ratings and reasons the screen shows. A pending area exports as pending.
- **No review "type"**: the model has none. Do not add one; the UI has nowhere to show it (build-spec §1).

## Auth assumption

`me()` returns the signed-in user. The UI assumes an ambient session (cookie or header the browser supplies) and never handles credentials. Ownership checks (`ownerId === me().id`) drive the "you" label and read-only rendering, but the server is the authority: reject unauthorised mutations regardless of what the UI shows.

## Method by method

Signatures are in `client.ts`; this table is the behaviour the UI expects.

| Method                                          | Reads / writes                       | Semantics the UI depends on                                                                                                                                                                                                                                                                                                                                           |
| ----------------------------------------------- | ------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `me()`                                          | read                                 | Fixed for the session; identity from the firm's credential management system, `name` display-formatted "Last, First". Cached by the UI.                                                                                                                                                                                                                                                                                                                              |
| `listMyReviews()`                               | read                                 | Caller's reviews, newest first, **including** ones still processing (`status: 'processing'`, `borrowerName: null` until detected). Landing "Recent" shows the first six.                                                                                                                                                                                              |
| `listAllReviews(filters)`                       | read                                 | Server-side `query` (borrower, CL number, sector — case-insensitive substring), `lob`, `ownerId`, `period` (`'12m'` default, `'all'`). Return `{ reviews, total, owners }`; `owners` populates the select. May truncate `reviews` — the UI shows `total`.                                                                                                             |
| `getReview(id)`                                 | read                                 | Now also carries `areas` (assessment verdicts) and optional `referenceData` (upstream/CRR snapshot; omit entirely when feeds are not connected — the UI renders nothing). `ProcessingReview` (status `processing` / `failed` / `cancelled`) or a full `Review` (`ready`). The UI polls this every second while `processing` and renders the same URL either way. Unknown id → reject `No review with id …`.                                                                                                                                       |
| `createReview(files, contextText, settings?)`   | write                                | Multipart upload; resolve `{ id }` as soon as the record exists — do not wait for the run. Each non-empty line of `contextText` becomes a `question` attention item. `settings` are the demoted extraction controls; omitted = defaults.                                                                                                                              |
| `getReviewStatus(id)`                           | read                                 | Cheap poll: `{ status: 'ready' }` or the `ProcessingReview` (phase + one status line). The UI currently polls `getReview`; this exists for a lighter endpoint if you want one.                                                                                                                                                                                         |
| `cancelReview(id)`                              | write                                | Record stays with `status: 'cancelled'`. Reject if not processing.                                                                                                                                                                                                                                                                                                    |
| `respond(itemId, text)`                         | write + re-run                       | Append `responded` (note = text). Re-run **that item** (scope is an open question, build-spec §9 Q1). Return the item with `reRunning: true`; the UI polls `getReview` every 700 ms while any item is re-running and shows the new value when it lands. Empty text → reject.                                                                                             |
| `verify(itemId)`                                | write                                | Set `verifiedAt`; append `verified`; resolve the linked `review_required` attention row (`state: 'reviewed'`). The export must not flag a verified value.                                                                                                                                                                                                             |
| `clear(itemId, reason, note)`                   | write                                | Set `cleared { reason, note, actorId, at }`; append `cleared_na` / `cleared_incorrect` with the note. Screen strikes the item with the rationale beside it; export omits it. The UI enforces only a non-empty note — **the server must require a substantive rationale, more than the category label**; UI validation is not the enforcement point. |
| `undoClear(itemId)`                             | write                                | Remove `cleared`; append `clear_undone`. Reject if not cleared.                                                                                                                                                                                                                                                                                                       |
| `dismissFlag(attentionId)`                      | write                                | Flags only (`kind: 'flag'`); else reject "Only flags can be dismissed." Append `flag_dismissed`; `state: 'dismissed'`.                                                                                                                                                                                                                                                 |
| `markReviewed(attentionId, note)`               | write                                | `state: 'reviewed'`, store note, append `reviewed`.                                                                                                                                                                                                                                                                                                                   |
| `unreview(attentionId)`                         | write                                | `state: 'open'`, append `unreviewed` (keep the note in the trail).                                                                                                                                                                                                                                                                                                    |
| `editNote(attentionId, note)`                   | write                                | Update note, append `note_edited`.                                                                                                                                                                                                                                                                                                                                    |
| `setAreaRating(areaId, rating)`                 | write                                | The analyst's verdict on an assessment area (`satisfactory` / `unsatisfactory`); appends `area_rated` (note = the rating) with actor + time. Owner only. Re-fetches reflect the rating and the zone tally.                                                                                                                |
| `getDebate(itemId)`                             | read                                 | `DebatePosition[]` (contract frozen: `{ itemId, stance, text, citations[], at, runId }`) — `[]` when none were produced (the UI shows an honest empty state). Production of these is future work.                                                                                                                                                                                                                                            |
| `getPriorDeltas(reviewId)`                      | read                                 | `null` when the borrower has no prior review (the Prior tab is hidden); else `{ priorReviewId, priorDate, deltas[] }` with `direction` per delta (worsening renders in warn).                                                                                                                                                                                          |
| `getPolicies(reviewId)`                         | read                                 | Policies/standards applied in the run, each with the `itemIds` it touched (the Why tab filters by the selected item).                                                                                                                                                                                                                                                 |
| `searchDocuments(query, filters)`               | read                                 | Server-side passage search. Return `snippetHtml` with `<mark>` around matched terms (the UI renders it as trusted HTML — escape everything else), `snippet` plain, provenance (`sectionName`, `page`), optional `imageRef`, and `usedInReviewId` / `usedInBorrower` / `usedInSectionN` when a passage fed a review. Facets (`counterparties`, `docTypes`) fill the selects. |
| `getDocumentText(docId)`                        | read                                 | The document's extracted text organized by the DOCUMENT's own sections (`{ sections: [{ title, pageStart, pageEnd, text }] }` + pages/parsedAt meta) — the "Preview extracted text" payload, from the index store. Not-yet-extracted documents reject with `{ message }` (the UI disables the action; this is defensive). |
| `searchRepository(reviewId, query)`             | read                                 | Amend-evidence support (v1.4): documents on system for THIS review's borrower (matched by RXM) not yet in the review's evidence set. `query` matches borrower/counterparty name or RXM — case-insensitive substring, RXM with or without the `RXM-` prefix; empty query returns the full scoped list. Each row: `{ repoId, rxm, fileName, docType, uploadedAt, pages, parsed, docId? }`. |
| `amendEvidence(reviewId, source, why)`          | mutate (owner only)                  | Adds a document to the review's evidence set mid-review. `source` is `{ kind: 'repo', repoId }` or `{ kind: 'upload', fileName, sizeBytes }` (the http impl will carry the file itself); `why` is REQUIRED and must be rejected server-side when blank — it is the evidence-log rationale shown on the manifest row. The added `ReviewDocument` carries `origin: 'amended'`, `addedAt`, `why`, and `docId` once parsed. Set `evidenceAmendedAt` and, while impacted checks re-run, `amendSettlesAt` (the UI shows "impacted checks re-running" until that instant passes). Returns the updated review. |
| `downloadDocument(docId)`                       | read                                 | The original uploaded file as `{ fileName, blob }`. Real backend: stream from the document store (filename from Content-Disposition). Mock: placeholder PDF.                                                                                                                                                            |
| `exportReview(id)`                              | read (renders)                       | Resolve `{ fileName, blob }` of the rendered `.docx`: cleared content omitted, verified values unflagged, flagged values carrying the same REVIEW REQUIRED banner. Reject with the render service's message on failure — the UI shows it in-app.                                                                                                                       |

`Review.readOnly` and `WorkItem.reRunning` are derived fields; compute them per request.

## Relative-URL discipline (hard rules for `http/`)

Inherited from the parent POC, where these rules are what make the platform's proxy prefix free ([poc-serving-patterns.md](poc-serving-patterns.md) §3.3):

1. **All client API calls are relative**: the base constant is `api` — `fetch(`api/...`)` — **never** `/api/...`. A leading slash resolves against the origin, silently escaping the proxy prefix; it breaks *only* behind the proxy, the worst kind of bug.
2. **Any server-minted URL in a response body is relative too** (image refs, export links, pagination cursors): `api/documents/...`, no leading slash. The client fetches them verbatim.
3. **Same origin, no CORS, ever.** The API mounts under `/api` on the same Flask process that serves `dist/` (see `server/`); there is no CORS knob and there must never need to be one.

## Target-environment runtime conventions

Also inherited from the POC report, credited there with file-level evidence:

- **Persistence lives on `/mnt`, never in the checkout.** A hosting-image rebuild wipes the repo tree (`node_modules`, `dist/`, anything gitignored). Any state the app must keep — uploads, a persistent `.env`, editable fixtures if that ever exists — goes under `/mnt/private/<app>/...` with a repo fallback. The app must never write inside its own git checkout.
- **A persistent `.env` may load with `override=True`** (so config survives rebuilds that drop the platform's env), **but never pin platform-injected rotating credentials in it** — with `override=True` a stale pinned token silently shadows the fresh injected one and bypasses credential rotation entirely. Copy the POC's warning block into any `.env.example` that gains credential fields, and keep an explicit-path off-switch so tests can load nothing.

## Polling and caching

TanStack Query owns caching. `useReview` re-fetches every 1 s while a review is processing and every 700 ms while an item is re-running; nothing else polls. Every mutation invalidates `['review', id]` and `['reviews']`. If you add server push later, call `queryClient.invalidateQueries` from the transport — the hooks need no change.

## Implementing `src/api/http/`

1. Create `src/api/http/httpApi.ts` exporting `createHttpApi(baseUrl: string): SentinelApi`.
2. One small `request()` helper: JSON in/out, `credentials: 'include'`, and on non-2xx `throw new ApiError(body.message ?? statusText)`.
3. `createReview` sends `FormData` (files + `contextText` + `settings`).
4. `exportReview` fetches the document as a blob and reads the filename from `Content-Disposition`.
5. In `client.ts`, `case 'http': return createHttpApi(import.meta.env.VITE_API_BASE_URL)`. Add `VITE_API_BASE_URL` to `.env.example` and the `ImportMetaEnv` typing in `src/vite-env.d.ts`.
6. Run `npm run verify`. The unit tests for the mock (`src/api/mock/mockApi.test.ts`) double as a behavioural spec — port the relevant cases to an integration suite against a staging backend.

## Developer environment

- **Packages**: the firm's development environment uses the internal **Nexus** repository, configured through environment variables in `.npmrc`. This repo's CI locks against public npm; the dev team's **first task after handoff is re-locking dependencies against Nexus** (`rm -rf node_modules package-lock.json && npm install` with the Nexus `.npmrc` in place, then `npm run verify`).
- **Styling**: Tailwind **v4** (config-in-CSS — the token bridge lives in `src/styles/base.css`, there is no `tailwind.config.js`). A ratified decision; do not downgrade to v3 config files.
- **Known limitation (accepted)**: the app is desktop-only below 760px — the left rail hides and no alternative navigation is provided. The right context rail hides below 1120px.
- Target browsers: evergreen Chrome/Edge; Node LTS (`.nvmrc`).

## Deploy notes

- `npm run build` emits a static bundle in `dist/`. Serve `index.html` for every unknown path — the router owns `/review/:id`, `/reviews/all`, etc.
- Set `VITE_API=http` (and the base URL) at build time; Vite inlines `import.meta.env`.
- The app stores only UI preferences in `localStorage` (`sentinel.theme`, `sentinel.rail.collapsed`, `sentinel.ctx.collapsed`, `sentinel.extraction.settings`). `sentinel.mock.state` exists only in mock mode.

## Settled and open questions (build-spec §9)

Settled in build round 1 (see the "Ratified" section of `docs/sentinel-ui-decisions.md`): single-item re-run scope; clearing requires a one-line rationale (server enforces substance); non-owners see Prior and may export; the review is authoritative for line of business; `DebatePosition` frozen with `at` + `runId`.

Still open:

1. Advocate/dissent production (server-side) — the UI renders whatever the seam returns.
2. Final names for nav items and rail tabs — every user-facing instance reads from `src/strings.ts`.
