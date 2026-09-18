/**
 * The block renderer — the round's centerpiece (Vantage 2026-09-18):
 * an answer is an ordered list of TYPED blocks; this component knows the
 * handful of shapes and draws each properly. THE CONTRACT IT ENFORCES:
 * a figure without a derivation must not render; an unknown block type
 * renders an honest labeled fallback, never a broken state, never a
 * silent skip — that is what makes the vocabulary additive.
 */
import { useState } from 'react'
import type { Evidence, VantageBlock, VantageCitation } from '@/api/types'
import { renderableFigures } from './blockContract'
import { Button } from '@/components/Button'
import { RowsUsedModal } from '@/components/viewers/RowsUsedModal'
import { SourceModal } from '@/components/viewers/SourceModal'
import { cx } from '@/lib/cx'
import { fmt } from '@/lib/fmt'
import { strings } from '@/strings'

const s = strings.vantage.answer

function toEvidence(c: Extract<VantageCitation, { kind: 'document' }>): Evidence {
  return {
    quote: c.quote ?? '',
    sourceDoc: c.file,
    sectionName: c.section ?? c.file,
    page: c.page ?? 1,
    imageKind: c.imageKind === 'page' ? 'page' : 'section',
    imageRef: c.imageKind === 'none' ? undefined : c.imageRef,
  }
}

function CitationRow({
  citations,
  onDoc,
  onRows,
  flush,
}: {
  citations: VantageCitation[] | undefined
  onDoc: (c: Extract<VantageCitation, { kind: 'document' }>) => void
  onRows: (c: Extract<VantageCitation, { kind: 'tabular' }>) => void
  flush?: boolean
}) {
  if (!citations || citations.length === 0) return null
  return (
    <div
      className={cx(
        'flex flex-wrap items-center gap-2.5 text-dense text-muted',
        flush ? 'border-t border-rule bg-bg-subtle px-3.5 py-2' : 'mt-2',
      )}
    >
      {citations.map((c, i) =>
        c.kind === 'document' ? (
          <span key={i} className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[0.6875rem]">{c.file}</span>
            <span className="text-faint">
              {[c.section, c.page !== undefined ? `p. ${c.page}` : null]
                .filter(Boolean)
                .join(' · ')}
            </span>
            <Button variant="link" onClick={() => onDoc(c)}>
              {s.viewSource}
            </Button>
          </span>
        ) : (
          <span key={i} className="flex flex-wrap items-center gap-2.5">
            <span className="font-mono text-[0.6875rem]">{c.file}</span>
            <span className="text-faint">
              {fmt(s.rowsLoc, { rows: c.rows.join(', '), of: c.of })}
              {c.note && <> · {c.note}</>}
            </span>
            <Button variant="link" onClick={() => onRows(c)}>
              {s.viewRows}
            </Button>
          </span>
        ),
      )}
    </div>
  )
}

export function BlockRenderer({ blocks }: { blocks: VantageBlock[] }) {
  const [doc, setDoc] = useState<Evidence | null>(null)
  const [rows, setRows] = useState<Extract<VantageCitation, { kind: 'tabular' }> | null>(null)
  const openDoc = (c: Extract<VantageCitation, { kind: 'document' }>) => setDoc(toEvidence(c))

  return (
    <div>
      {blocks.map((b, i) => (
        <div key={i} className={cx('mb-[22px]', b.type !== 'table' && 'max-w-[640px]')}>
          {b.type === 'prose' ? (
            <>
              {b.paragraphs.map((p, j) => (
                <p
                  key={j}
                  className="mt-2.5 max-w-[62ch] text-[0.875rem] leading-[1.65] text-ink first:mt-0"
                >
                  {p}
                </p>
              ))}
              <CitationRow citations={b.citations} onDoc={openDoc} onRows={setRows} />
            </>
          ) : b.type === 'figures' ? (
            <>
              <div className="flex flex-wrap gap-3">
                {renderableFigures(b.items).map((f) => (
                  <div
                    key={f.label}
                    className="min-w-[200px] flex-1 rounded-[10px] border border-rule bg-bg px-4 py-[13px]"
                  >
                    <div className="micro mb-0.5">{f.label}</div>
                    <div className="font-display text-[1.4375rem] font-semibold tracking-[-0.01em]">
                      {f.value}
                    </div>
                    <div className="mt-1.5 text-dense leading-normal text-faint">
                      {f.derivation}
                    </div>
                  </div>
                ))}
              </div>
              <CitationRow citations={b.citations} onDoc={openDoc} onRows={setRows} />
            </>
          ) : b.type === 'table' ? (
            <div className="overflow-hidden rounded-[10px] border border-rule bg-bg">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-[0.78125rem]">
                  <thead>
                    <tr>
                      {b.columns.map((c) => (
                        <th
                          key={c.key}
                          className={cx(
                            'border-b border-rule bg-bg-subtle px-3.5 py-2 text-micro font-semibold text-muted',
                            c.align === 'right' ? 'text-right' : 'text-left',
                          )}
                        >
                          {c.label}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {b.rows.map((row, ri) => (
                      <tr key={ri}>
                        {b.columns.map((c) => {
                          const cell = row[c.key]
                          const value = typeof cell === 'string' ? cell : (cell?.value ?? '—')
                          const warn = typeof cell === 'object' && !!cell?.warn
                          return (
                            <td
                              key={c.key}
                              className={cx(
                                'border-b border-rule px-3.5 py-[9px] last-row:border-b-0',
                                c.align === 'right' && 'text-right',
                                (c.kind === 'mono' || c.kind === 'num') &&
                                  'font-mono text-[0.71875rem]',
                                warn && 'font-semibold text-warn',
                              )}
                            >
                              {value}
                            </td>
                          )
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <CitationRow citations={b.citations} onDoc={openDoc} onRows={setRows} flush />
            </div>
          ) : b.type === 'quote' ? (
            <div className="rounded-[10px] border border-rule bg-bg-subtle px-4 py-[13px]">
              <blockquote className="border-l-2 border-rule-strong pl-3 font-display text-[0.84375rem] text-ink italic">
                “{b.text}”
              </blockquote>
              <CitationRow citations={b.citations} onDoc={openDoc} onRows={setRows} />
            </div>
          ) : b.type === 'absence' ? (
            <div className="rounded-r-[10px] border-l-[3px] border-warn-line bg-warn-bg px-4 py-[11px]">
              <div className="text-micro font-bold text-warn">{s.absenceHeading}</div>
              <p className="mt-0.5 max-w-[60ch] text-[0.8125rem] text-ink-soft">{b.text}</p>
            </div>
          ) : (
            // Unknown block type: an honest labeled fallback — the vocabulary
            // stays additive because old clients degrade legibly, never break.
            <div
              role="note"
              className="rounded-[10px] border border-dashed border-rule-strong bg-bg-subtle px-4 py-[11px]"
            >
              <div className="text-micro font-semibold text-muted">{s.unknownBlockLabel}</div>
              <p className="mt-0.5 text-dense text-faint">{s.unknownBlock}</p>
            </div>
          )}
        </div>
      ))}
      {doc && <SourceModal evidence={doc} onClose={() => setDoc(null)} />}
      {rows && <RowsUsedModal citation={rows} onClose={() => setRows(null)} />}
    </div>
  )
}
