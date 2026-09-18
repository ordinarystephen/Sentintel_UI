/**
 * `/erm/runs/:runId` — one URL, every run state. A queued/running run
 * renders the staged processing view AT ITS URL (refresh lands back on
 * the same run; "you can leave" is true — the mock advances on elapsed
 * time). Completed renders the results; cancelled/failed render honestly.
 */
import { useParams } from 'react-router-dom'
import { useRun } from '@/api/hooks'
import { ErmProcessingView } from './ErmProcessingView'
import { ErmResultsView } from './ErmResultsView'

export function ErmRunScreen() {
  const { runId = '' } = useParams()
  const q = useRun(runId)
  if (!q.data) return null
  const run = q.data
  if (run.state === 'queued' || run.state === 'running') return <ErmProcessingView run={run} />
  return <ErmResultsView run={run} />
}
