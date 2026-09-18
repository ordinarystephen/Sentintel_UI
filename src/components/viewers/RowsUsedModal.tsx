/**
 * Rows-used viewer — the tabular equivalent of the section image
 * ("rows are pages", Vantage round 2026-09-18): the verbatim rows as
 * they appear in the source file, mono, with the provenance note. A
 * shared platform viewer — CPEA and CRR will want it once their
 * tabular sources cite rows.
 */
import type { VantageCitation } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Modal } from '@/components/Modal'
import { fmt } from '@/lib/fmt'
import { strings } from '@/strings'

const s = strings.vantage.rowsViewer

export function RowsUsedModal({
  citation,
  onClose,
}: {
  citation: Extract<VantageCitation, { kind: 'tabular' }>
  onClose: () => void
}) {
  return (
    <Modal title={fmt(s.title, { file: citation.file })} closeLabel={s.close} onClose={onClose}>
      <div className="mb-3.5 flex flex-wrap items-center gap-2 text-dense text-muted">
        <span className="font-mono text-[0.75rem]">{citation.file}</span>
        <span className="font-mono text-[0.75rem]">
          {fmt(s.loc, { rows: citation.rows.join(', '), of: citation.of })}
        </span>
        <Badge tone="green">{s.badge}</Badge>
      </div>
      <div className="overflow-hidden rounded-lg border border-rule">
        <table className="w-full border-collapse font-mono text-[0.75rem]">
          <thead>
            <tr>
              <th className="border-b border-rule bg-bg-subtle px-3 py-[7px] text-left font-body text-micro font-semibold text-muted">
                {s.rowCol}
              </th>
              {citation.columns.map((c) => (
                <th
                  key={c}
                  className="border-b border-rule bg-bg-subtle px-3 py-[7px] text-left font-body text-micro font-semibold text-muted"
                >
                  {c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {citation.rowData.map((r) => (
              <tr key={r.n}>
                <td className="border-b border-rule px-3 py-[7px] text-micro normal-case tracking-normal text-faint last:border-b-0">
                  {r.n}
                </td>
                {r.cells.map((c, i) => (
                  <td key={i} className="border-b border-rule px-3 py-[7px]">
                    {c}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-dense text-muted">
        <b className="text-micro font-bold text-warn">{s.provenanceLabel}</b> — {s.provenance}
        {citation.note && <> {citation.note}.</>}
      </p>
    </Modal>
  )
}
