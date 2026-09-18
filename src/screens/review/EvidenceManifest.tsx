/**
 * Evidence manifest — "Documents in this review" (amend-evidence round,
 * 2026-09-17). A quiet disclosure under the ratings line, same pattern as
 * Reference data, REPLACING the old standalone "Run completed" line (that
 * status folds into the summary). Structural: renders on every review,
 * collapsed by default. Rows: mono filename · type badge · date · origin
 * chip ("opening set", or amber "added mid-review · time") · Preview into
 * the extracted text (only when the document's text is on system). A
 * mid-review addition also carries the reviewer's recorded why — serif
 * italic, quoted: the evidence-log voice.
 */
import { useEffect, useState } from 'react'
import type { Review, ReviewDocument } from '@/api/types'
import { ChevronIcon } from '@/app/icons'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Collapsible } from '@/components/Collapsible'
import { DocumentPreviewModal } from '@/components/viewers/DocumentPreviewModal'
import { cx } from '@/lib/cx'
import { fmt } from '@/lib/fmt'
import { amendReRunning } from './amendState'
import { strings } from '@/strings'

const s = strings.review

const formatTime = (iso: string) =>
  new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })

function summaryLine(review: Review, reRunning: boolean): string {
  const n = review.documents.length
  if (review.evidenceAmendedAt) {
    const time = formatTime(review.evidenceAmendedAt)
    return fmt(reRunning ? s.manifestAmendedRunning : s.manifestAmended, { n, time })
  }
  return fmt(s.manifestRun, { n, time: formatTime(review.runCompletedAt) })
}

function ManifestRow({ doc }: { doc: ReviewDocument }) {
  const [preview, setPreview] = useState(false)
  const amended = doc.origin === 'amended'
  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-rule py-[7px] first:border-t-0">
      <span className="font-mono text-ui-sm">{doc.fileName}</span>
      <Badge>{doc.kind}</Badge>
      <span className="text-dense text-faint">{doc.date}</span>
      {amended && doc.addedAt ? (
        <Badge tone="amber">{fmt(s.manifestAdded, { time: formatTime(doc.addedAt) })}</Badge>
      ) : (
        <Badge tone="neutral">{s.manifestOpening}</Badge>
      )}
      {doc.docId && (
        <Button variant="link" onClick={() => setPreview(true)}>
          {s.manifestPreview}
        </Button>
      )}
      {amended && doc.why && (
        <span className="w-full border-l-2 border-rule-strong pl-3 font-display text-ui-sm text-ink-soft italic">
          “{doc.why}”
        </span>
      )}
      {preview && doc.docId && (
        <DocumentPreviewModal
          docId={doc.docId}
          fileName={doc.fileName}
          onClose={() => setPreview(false)}
        />
      )}
    </div>
  )
}

export function EvidenceManifest({ review }: { review: Review }) {
  const [open, setOpen] = useState(false)
  const [reRunning, setReRunning] = useState(() => amendReRunning(review))

  // While impacted checks re-run, settle the status line when the mock's
  // window elapses (no polling: one timer to the known settle instant).
  useEffect(() => {
    const running = amendReRunning(review)
    setReRunning(running)
    if (!running || !review.amendSettlesAt) return
    const t = setTimeout(
      () => setReRunning(false),
      Math.max(0, Date.parse(review.amendSettlesAt) - Date.now()),
    )
    return () => clearTimeout(t)
  }, [review])

  return (
    <div className="-mt-1.5 mb-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="manifest-body"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-[7px] text-dense text-muted"
      >
        <ChevronIcon
          className={cx(
            'h-[9px] w-[9px] flex-none text-faint transition-transform duration-200',
            open && 'rotate-90',
          )}
        />
        {s.manifestHeading}
        <span className="font-mono text-micro text-faint">{summaryLine(review, reRunning)}</span>
      </button>
      <Collapsible open={open} id="manifest-body">
        <div className="mt-[9px] rounded-[10px] border border-rule bg-bg-subtle px-[15px] py-[5px]">
          {review.documents.map((d) => (
            <ManifestRow key={d.fileName} doc={d} />
          ))}
        </div>
      </Collapsible>
    </div>
  )
}
