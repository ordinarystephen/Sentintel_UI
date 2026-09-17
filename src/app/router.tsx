/**
 * Routes (build-spec §4 + suite round 2026-09-17). Every route is
 * refresh-safe: any host serving index.html for unknown paths lands here.
 *   /                entry decision: 1 entitlement → that app's home;
 *                    2+ → last-used app, or the suite landing page
 *   /apps            the suite landing page, always (no redirect)
 *   /crr             the CRR application home (landing/upload screen)
 *   /crr/reviews     My reviews      /crr/reviews/all   All reviews
 *   /crr/documents   document search
 *   /crr/policy      policy library (stub)
 *   /crr/review/:id  the review page; `#sec-N` anchors deep-link into sections
 *   /crr/styleguide  dev-only type/token reference — not linked from navigation
 * ERM and Vantage have no routes — their landing cards are not links.
 */
import { createBrowserRouter, createHashRouter, Navigate, type RouteObject } from 'react-router-dom'
import { EntryScreen } from '@/screens/suite/EntryScreen'
import { SuiteLandingScreen } from '@/screens/suite/SuiteLandingScreen'
import { DocumentsScreen } from '@/screens/documents/DocumentsScreen'
import { LandingScreen } from '@/screens/landing/LandingScreen'
import { NotFoundScreen } from '@/screens/NotFoundScreen'
import { PolicyScreen } from '@/screens/policy/PolicyScreen'
import { ReviewScreen } from '@/screens/review/ReviewScreen'
import { ReviewsScreen } from '@/screens/reviews/ReviewsScreen'
import { RouteErrorScreen } from '@/screens/RouteErrorScreen'
import { StyleguideScreen } from '@/screens/styleguide/StyleguideScreen'
import { AppShell } from './AppShell'

export const routes: RouteObject[] = [
  {
    // Suite-level boundary: a crash in the entry/landing layer.
    errorElement: <RouteErrorScreen />,
    children: [
      { index: true, element: <EntryScreen /> },
      { path: 'apps', element: <SuiteLandingScreen /> },
      {
        path: 'crr',
        element: <AppShell />,
        // Last-resort boundary (a crash in the shell itself): no rail, full page.
        errorElement: <RouteErrorScreen />,
        children: [
          {
            // Pathless boundary for screen crashes: the card renders in the
            // canvas and the shell (rail, masthead) stays usable.
            errorElement: <RouteErrorScreen />,
            children: [
              { index: true, element: <LandingScreen /> },
              { path: 'reviews', element: <ReviewsScreen tab="my" /> },
              { path: 'reviews/all', element: <ReviewsScreen tab="all" /> },
              { path: 'documents', element: <DocumentsScreen /> },
              { path: 'policy', element: <PolicyScreen /> },
              { path: 'review/:id', element: <ReviewScreen /> },
              { path: 'styleguide', element: <StyleguideScreen /> },
              { path: '*', element: <NotFoundScreen /> },
            ],
          },
        ],
      },
      // Unknown top-level paths (a typed /erm, a stale link) go back through
      // the entry decision rather than a bare 404.
      { path: '*', element: <Navigate to="/" replace /> },
    ],
  },
]

/**
 * BASE_URL comes from Vite's `base` (VITE_BASE_PATH at build time), so the
 * same bundle works at '/' or under a proxy prefix like '/proxy/8082/'.
 *
 * VITE_ROUTER=hash is the target-environment escape hatch (docs/poc-serving-patterns.md
 * §3.3/§5): if the published-App proxy prefix proves unstable, build with
 * `VITE_BASE_PATH=./ VITE_ROUTER=hash` — relative assets plus routes in the
 * URL fragment (`#/review/:id`), which no proxy rewrites. Section anchors
 * still work: react-router parses `#/review/x#sec-2` into pathname + hash.
 * Default is the browser (history) router.
 */
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export const createAppRouter = () =>
  import.meta.env.VITE_ROUTER === 'hash'
    ? createHashRouter(routes)
    : createBrowserRouter(routes, { basename })
