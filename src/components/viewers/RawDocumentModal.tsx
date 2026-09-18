/**
 * Raw-document viewer — the "other face" of a document (the rendered
 * pages), shared platform surface. Mock page renders come from fixtures'
 * page metadata: placeholder page panels with a provenance badge — and an
 * honest, labeled absence when a document has no page images. Never a
 * broken state.
 */
import type { DocumentText } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { fmt } from '@/lib/fmt'
import { strings } from '@/strings'

const s = strings.erm.rawViewer
const MAX_PAGES = 3

export function RawDocumentModal({
  fileName,
  doc,
  onClose,
}: {
  fileName: string
  /** The document's index-store record, when on system; null = no pages. */
  doc: DocumentText | null
  onClose: () => void
}) {
  const pages = doc?.pages ?? 0
  const shown = Math.min(pages, MAX_PAGES)
  return (
    <Modal title={fmt(s.title, { file: fileName })} closeLabel={s.close} onClose={onClose}>
      {pages === 0 ? (
        <p className="rounded-lg border border-rule bg-bg-subtle px-4 py-6 text-center text-ui-sm text-muted">
          {s.noPages}
        </p>
      ) : (
        <>
          <div className="mb-2 flex items-center gap-2 text-dense text-muted">
            <Badge tone="green">{s.provenance}</Badge>
            <span>{fmt(s.pagesShown, { shown, total: pages })}</span>
          </div>
          {Array.from({ length: shown }, (_, i) => (
            <div key={i} className="mb-3 rounded-lg border border-rule bg-bg-subtle p-3.5">
              <svg
                viewBox="0 0 420 160"
                role="img"
                aria-label={fmt(s.pageLabel, { n: i + 1 })}
                className="h-auto w-full max-w-[420px]"
              >
                <rect x="1" y="1" width="418" height="158" className="fill-bg stroke-rule-strong" />
                <line x1="20" y1="30" x2="400" y2="30" className="stroke-rule" />
                <line x1="20" y1="52" x2="400" y2="52" className="stroke-rule" />
                <line x1="20" y1="74" x2="360" y2="74" className="stroke-rule" />
                <line x1="20" y1="96" x2="400" y2="96" className="stroke-rule" />
                <line x1="20" y1="118" x2="330" y2="118" className="stroke-rule" />
                <text x="20" y="148" className="fill-faint font-mono" fontSize="9">
                  {fmt(s.pageLabel, { n: i + 1 })}
                </text>
              </svg>
            </div>
          ))}
        </>
      )}
    </Modal>
  )
}
