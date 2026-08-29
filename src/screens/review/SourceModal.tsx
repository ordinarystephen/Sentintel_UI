/**
 * Source modal (build-spec §5.3): filename · section · page (mono), the
 * provenance badge (section image vs page image), the quote, and the image
 * area — with NEUTRAL (not red) degradation when no image is available.
 */
import type { Evidence } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { strings } from '@/strings'

export function SourceModal({ evidence, onClose }: { evidence: Evidence; onClose: () => void }) {
  const s = strings.source
  return (
    <Modal title={s.title(evidence.sectionName)} onClose={onClose} closeLabel={s.close}>
      <div className="mb-3 flex flex-wrap items-center gap-[10px] text-dense text-muted">
        <span className="font-mono text-[12px]">
          {evidence.sourceDoc} · {evidence.sectionName}
        </span>
        <span className="font-mono text-[12px]">{s.page(evidence.page)}</span>
        <Badge tone="green">
          {evidence.imageKind === 'section' ? s.sectionImage : s.pageImage}
        </Badge>
      </div>
      <blockquote className="mb-3.5 max-h-[120px] overflow-auto border-l-2 border-rule-strong pl-3 font-display text-[14px] text-ink-soft italic">
        “{evidence.quote}”
      </blockquote>
      <div className="flex justify-center rounded-lg border border-rule bg-bg-subtle p-3.5">
        {evidence.imageRef ? (
          <svg
            viewBox="0 0 420 150"
            role="img"
            aria-label={s.imageAria}
            className="h-auto w-full max-w-[420px]"
          >
            <rect x="1" y="1" width="418" height="148" className="fill-bg stroke-rule-strong" />
            <rect x="16" y="14" width="150" height="9" className="fill-muted" />
            {[34, 46, 58].map((y, i) => (
              <rect
                key={y}
                x="16"
                y={y}
                width={[380, 380, 290][i]}
                height="6"
                className="fill-rule"
              />
            ))}
            {[76, 88, 100].map((y, i) => (
              <rect
                key={y}
                x="16"
                y={y}
                width={[386, 386, 310][i]}
                height="6"
                className="fill-rule-strong"
              />
            ))}
            {[118, 130].map((y, i) => (
              <rect key={y} x="16" y={y} width={[200, 260][i]} height="6" className="fill-rule" />
            ))}
          </svg>
        ) : (
          <p className="py-6 text-center text-ui-sm text-muted">{s.noImage}</p>
        )}
      </div>
    </Modal>
  )
}
