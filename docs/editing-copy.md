# Editing the copy

Every word the app shows lives in one of three files — never in a component. Change the text, save, done. With `make dev` running, edits hot-reload: the browser updates the moment you save, no restart, no rebuild.

**The one rule: keep the quotes, keep the commas.** Change only the text *between* the quotes, and leave the `{curly}` fill-ins (like `{n}` or `{owner}`) in place — the app replaces them with a number or name at runtime. You can move a fill-in within its sentence; don't delete or rename it. Where wording differs by count there is a pair of lines: `...One` (exactly one) and `...Other` (any other number).

## Where to find what you see

| What you see on screen | Edit it in |
| --- | --- |
| Brand name, "ready" badge, skip link | `src/strings.ts` › **app** |
| Theme names, dark-mode toggle, the text-size control (S/M/L labels + their spoken names) | `src/strings.ts` › **theme** |
| Suite landing + app switcher — application names/descriptions, "Open", "In design", "All applications", the fictional-data footer | `src/strings.ts` › **suite** |
| Left-rail items (Home, My reviews, All reviews, Documents, Policy library, Overview, Collapse sidebar) | `src/strings.ts` › **nav** |
| Landing page — "Start a review", the drop-zone wording, "Anything Sentinel should know?", "Begin review", Advanced extraction settings, "Recent", "New review — reading…" | `src/strings.ts` › **landing** |
| Processing screen — "Reading the documents", the "you can leave" line, "Cancel this review" | `src/strings.ts` › **processing** |
| The cycling status line while processing ("Reading … / Indexing … pages…") | `src/api/mock/mockApi.ts` › **MESSAGES** (backend-owned copy) |
| Review page — "Export Review", "The story", "Needs your attention", "Work paper", section pills, the flagged-value line, the disclaimer | `src/strings.ts` › **review** |
| Attention-row actions — dismiss / mark reviewed / edit / un-review, the note field | `src/strings.ts` › **attention** |
| Areas of assessment — zone heading, rating pills, tally, "Resolve in Section N →", the Satisfactory/Unsatisfactory buttons | `src/strings.ts` › **review** (the Areas block) |
| Area names and reason narratives, the reference-data field labels and values | `src/api/mock/fixtures.ts` › **VEYLAND_AREAS** and the `referenceData` block |
| Reference data — the disclosure label, "upstream · as of …", origin chips | `src/strings.ts` › **review** (refData keys) |
| Right rail — tab names (Why / Respond / Debate / Prior), "How this got here", the Respond wording, clear-with-rationale wording, Debate and Prior notes | `src/strings.ts` › **contextRail** and **rail** |
| Source modal — "Evidence — …", provenance badges, the no-image line | `src/strings.ts` › **source** |
| Reviews list — tabs, search/filter labels, "N reviews · showing most recent", the team-view note, "read-only", "2nd in 12 mo" | `src/strings.ts` › **reviews** (LOB tags: **lobShort**) |
| Documents — title and sub, filter labels, "Advanced search" help, count lines (browse and search), the action bar (Preview extracted text / Download original / Used in … review →), the preview modal | `src/strings.ts` › **documents** |
| The extracted text shown in the preview modal (document sections, page ranges) | `src/api/mock/fixtures.ts` › **DOCUMENTS** |
| Policy-library stub, "Nothing here" (404) | `src/strings.ts` › **policy**, **notFound** |
| Error banners and toasts from the "backend" (export failure, "belongs to …", parse failure, upload/rationale messages) | `src/api/mock/mockApi.ts` › **MESSAGES** |
| Demo content — borrower names, CL numbers, sectors, the narrative and timeline, work-paper values, attention rows, debate positions, document passages | `src/api/mock/fixtures.ts` (the whole file is the demo-data file; header explains) |
| The "frontend not built" placeholder page served by Flask | `server/spa.py` › the **EDIT ME** block at the top |

Two more notes:

- The `/styleguide` page shows sample text on purpose (it's a type specimen for developers) — its wording isn't product copy.
- `node scripts/check-copy.mjs` (or `npm run check:copy`) verifies no wording has crept back into a component.
