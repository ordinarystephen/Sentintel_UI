/**
 * "Preview extracted text" — the document's extracted text organized by the
 * DOCUMENT's own sections as collapsible entries with mono page ranges; the
 * first section opens by default. Content comes from the seam
 * (getDocumentText); Esc / overlay-click close via the shared Modal.
 */
import { useState } from 'react'
import { useDocumentText } from '@/api/hooks'
import { ChevronIcon } from '@/app/icons'
import { Badge } from '@/components/Badge'
import { Collapsible } from '@/components/Collapsible'
import { Modal } from '@/components/Modal'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { formatDate } from '@/lib/format'
import { strings } from '@/strings'

export function DocumentPreviewModal({
  docId,
  fileName,
  onClose,
}: {
  docId: string
  fileName: string
  onClose: () => void
}) {
  const s = strings.documents
  const q = useDocumentText(docId)
  const [open, setOpen] = useState(0)

  return (
    <Modal
      title={fmt(s.previewTitle, { fileName })}
      onClose={onClose}
      closeLabel={strings.source.close}
    >
      {q.isError && (
        <p role="alert" className="text-ui-sm text-error">
          {(q.error as Error).message}
        </p>
      )}
      {q.data && (
        <>
          <div className="mb-3 flex flex-wrap items-center gap-[10px] text-dense text-muted">
            <span className="font-mono text-[0.75rem]">
              {plural(q.data.pages, s.previewPagesOne, s.previewPagesOther)}
            </span>
            <span className="font-mono text-[0.75rem]">
              {fmt(s.previewParsed, { date: formatDate(q.data.parsedAt) })}
            </span>
            <Badge tone="green">{s.extracted}</Badge>
            <span>
              {plural(q.data.sections.length, s.previewSectionsOne, s.previewSectionsOther)}
            </span>
          </div>
          <div className="border-t border-rule">
            {q.data.sections.map((sec, i) => (
              <section key={sec.title} className="border-b border-rule">
                <button
                  type="button"
                  aria-expanded={open === i}
                  aria-controls={`doc-sec-${i}`}
                  onClick={() => setOpen(open === i ? -1 : i)}
                  className="flex w-full items-center gap-[11px] px-0.5 py-[11px] text-left hover:bg-bg-subtle"
                >
                  <span className="flex-1 font-display text-ui font-semibold">{sec.title}</span>
                  <span className="flex-none font-mono text-micro text-faint">
                    {sec.pageStart === sec.pageEnd
                      ? fmt(strings.common.pageRef, { n: sec.pageStart })
                      : fmt(s.pageRange, { start: sec.pageStart, end: sec.pageEnd })}
                  </span>
                  <ChevronIcon
                    className={cx(
                      'h-[13px] w-[13px] flex-none text-faint transition-transform duration-200',
                      open === i && 'rotate-90',
                    )}
                  />
                </button>
                <Collapsible open={open === i} id={`doc-sec-${i}`}>
                  <p className="max-w-[70ch] pb-3.5 pl-0.5 text-ui-sm leading-[1.6] text-ink-soft">
                    {sec.text}
                  </p>
                </Collapsible>
              </section>
            ))}
          </div>
        </>
      )}
    </Modal>
  )
}
