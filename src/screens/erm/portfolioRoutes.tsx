/**
 * The CPEA workflow's route tree, built for one application (v1.8). CPEA
 * and Inquiry mount the SAME screens under their own home:
 *   {base}               start (ask + population)
 *   {base}/runs          runs kept
 *   {base}/runs/:runId   results (a running run renders processing at its URL)
 *   {base}/documents     the shared repository through the app's lens
 * What differs between applications arrives in `app` — config, copy,
 * slots — never as different screens.
 */
import { Navigate, type RouteObject } from 'react-router-dom'
import { RouteErrorScreen } from '@/screens/RouteErrorScreen'
import { ErmDocumentsScreen } from './ErmDocumentsScreen'
import { ErmRunScreen } from './ErmRunScreen'
import { ErmRunsScreen } from './ErmRunsScreen'
import { ErmShell } from './ErmShell'
import { ErmStartScreen } from './ErmStartScreen'
import type { PortfolioApp } from './portfolioApp'

export function portfolioRoute(app: PortfolioApp): RouteObject {
  return {
    path: app.base.replace(/^\//, ''),
    element: <ErmShell app={app} />,
    // Last-resort boundary (a crash in the shell itself): no rail, full page.
    errorElement: <RouteErrorScreen />,
    children: [
      {
        // Pathless boundary for screen crashes: the card renders in the
        // canvas and the shell (rail, masthead) stays usable.
        errorElement: <RouteErrorScreen />,
        children: [
          { index: true, element: <ErmStartScreen /> },
          { path: 'runs', element: <ErmRunsScreen /> },
          { path: 'runs/:runId', element: <ErmRunScreen /> },
          { path: 'documents', element: <ErmDocumentsScreen /> },
          { path: '*', element: <Navigate to={app.base} replace /> },
        ],
      },
    ],
  }
}
