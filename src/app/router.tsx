/**
 * Routes (build-spec §4). Every route is refresh-safe: the dev server and any
 * static host serving index.html for unknown paths will land here correctly.
 *   /                landing
 *   /reviews         My reviews      /reviews/all   All reviews (tab in the URL)
 *   /documents       document search
 *   /policy          policy library (stub)
 *   /review/:id      the review page; `#sec-N` anchors deep-link into sections
 *   /styleguide      dev-only type/token reference — not linked from navigation
 */
import { createBrowserRouter, createHashRouter, type RouteObject } from 'react-router-dom'
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
