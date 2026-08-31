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
import { createBrowserRouter, type RouteObject } from 'react-router-dom'
import { DocumentsScreen } from '@/screens/documents/DocumentsScreen'
import { LandingScreen } from '@/screens/landing/LandingScreen'
import { NotFoundScreen } from '@/screens/NotFoundScreen'
import { PolicyScreen } from '@/screens/policy/PolicyScreen'
import { ReviewScreen } from '@/screens/review/ReviewScreen'
import { ReviewsScreen } from '@/screens/reviews/ReviewsScreen'
import { StyleguideScreen } from '@/screens/styleguide/StyleguideScreen'
import { AppShell } from './AppShell'

export const routes: RouteObject[] = [
  {
    element: <AppShell />,
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
]

/**
 * BASE_URL comes from Vite's `base` (VITE_BASE_PATH at build time), so the
 * same bundle works at '/' or under a proxy prefix like '/sentinel/'.
 */
const basename = import.meta.env.BASE_URL.replace(/\/+$/, '') || '/'

export const createAppRouter = () => createBrowserRouter(routes, { basename })
