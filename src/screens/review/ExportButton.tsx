/**
 * "Export Review" — the ONE export (§1). Success downloads the rendered
 * document; failure surfaces in-app as a toast + inline message (§5.3),
 * never a raw error page.
 */
import { Button } from '@/components/Button'
import { strings } from '@/strings'

export function ExportButton({ onClick, pending }: { onClick: () => void; pending: boolean }) {
  return (
    <Button variant="primary" small onClick={onClick} disabled={pending} aria-busy={pending}>
      {pending ? strings.review.exporting : strings.review.exportReview}
    </Button>
  )
}
