/**
 * Documents (`/documents`, build-spec §5.5 + the doc-browser revision).
 *
 * Two states:
 * - BROWSE (no query): document rows — mono filename, extraction badge, LOB,
 *   mono date. No preview text. Clicking a row selects it (single-select,
 *   the work-paper selection language) and reveals an inline action bar:
 *   Preview extracted text · Download original · Used in [borrower] review →.
 *   The bar is a list; future actions append without layout surgery.
 * - SEARCH (query non-empty): the hit cards with matched passages and marked
 *   terms — match evidence, not preview.
 *
 * Query and filters live in the URL and execute against the seam.
 */
import { useMemo, useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDocumentSearch, useDownloadDocument } from '@/api/hooks'
import { LOBS, type DocumentFilters, type DocumentHit, type Evidence, type Lob } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { SearchInput } from '@/components/SearchInput'
import { Select } from '@/components/Select'
import { useToast } from '@/components/toastContext'
import { cx } from '@/lib/cx'
import { download } from '@/lib/download'
import { fmt, plural } from '@/lib/fmt'
import { sectionAnchor } from '@/lib/sections'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { SourceModal } from '@/screens/review/SourceModal'
import { strings } from '@/strings'
import { DocumentPreviewModal } from './DocumentPreviewModal'

const isLob = (v: string | null): v is Lob => LOBS.includes(v as Lob)

function toEvidence(h: DocumentHit): Evidence {
  return {
    quote: h.snippet,
    sourceDoc: h.fileName,
    sectionName: h.sectionName,
    page: h.page,
    imageKind: 'section',
    imageRef: h.imageRef,
  }
}

/** One document, grouped from its passages (browse state rows). */
interface DocRow {
  docId: string
  fileName: string
  lob: Lob
  date: string
  extracted: boolean
  usedInReviewId?: string
  usedInBorrower?: string
  usedInSectionN?: number
}

function groupDocuments(hits: DocumentHit[]): DocRow[] {
  const map = new Map<string, DocRow>()
  for (const h of hits) {
    const existing = map.get(h.docId)
    if (!existing) {
      map.set(h.docId, {
        docId: h.docId,
        fileName: h.fileName,
        lob: h.lob,
        date: h.date,
        extracted: h.extracted,
        usedInReviewId: h.usedInReviewId,
        usedInBorrower: h.usedInBorrower,
        usedInSectionN: h.usedInSectionN,
      })
    } else if (!existing.usedInReviewId && h.usedInReviewId) {
      existing.usedInReviewId = h.usedInReviewId
      existing.usedInBorrower = h.usedInBorrower
      existing.usedInSectionN = h.usedInSectionN
    }
  }
  return [...map.values()].sort((a, b) => b.date.localeCompare(a.date))
}

export function DocumentsScreen() {
  const s = strings.documents
  const [params, setParams] = useSearchParams()
  const query = params.get('q') ?? ''
  const lob: Lob | 'all' = isLob(params.get('lob')) ? (params.get('lob') as Lob) : 'all'
  const counterparty = params.get('cp') ?? 'all'
  const docType = params.get('type') ?? 'all'
  const debounced = useDebouncedValue(query, 300)
  const filters: DocumentFilters = { lob, counterparty, docType }
  const res = useDocumentSearch(debounced, filters)
  const [advanced, setAdvanced] = useState(false)
  const [source, setSource] = useState<Evidence | null>(null)
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{ docId: string; fileName: string } | null>(null)
  const downloadDoc = useDownloadDocument()
  const { toast } = useToast()

  const browsing = debounced.trim().length === 0
  const docRows = useMemo(
    () => (res.data && browsing ? groupDocuments(res.data.hits) : []),
    [res.data, browsing],
  )

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  async function downloadOriginal(doc: DocRow) {
    try {
      const r = await downloadDoc.mutateAsync(doc.docId)
      download(r.blob, r.fileName)
      toast({ message: fmt(s.downloaded, { fileName: r.fileName }), tone: 'success' })
    } catch (e) {
      toast({ message: (e as Error).message, tone: 'error' })
    }
  }

  return (
    <div className="settle">
      <p className="micro text-faint">{s.eyebrow}</p>
      <h1 className="mt-1 font-display text-screen-title font-semibold tracking-display">
        {s.title}
      </h1>
      <p className="mt-1 mb-3.5 max-w-[60ch] text-ui text-muted">{s.sub}</p>

      <div className="mb-1.5 flex flex-wrap items-center gap-2">
        <SearchInput
          aria-label={s.searchAria}
          placeholder={s.searchPlaceholder}
          value={query}
          onChange={(e) => set('q', e.target.value)}
        />
        <Select aria-label={s.lobAria} value={lob} onChange={(e) => set('lob', e.target.value)}>
          <option value="all">{s.allLobs}</option>
          {LOBS.map((l) => (
            <option key={l} value={l}>
              {l}
            </option>
          ))}
        </Select>
        <Select
          aria-label={s.counterpartyAria}
          value={counterparty}
          onChange={(e) => set('cp', e.target.value)}
        >
          <option value="all">{s.allCounterparties}</option>
          {(res.data?.counterparties ?? []).map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </Select>
        <Select
          aria-label={s.docTypeAria}
          value={docType}
          onChange={(e) => set('type', e.target.value)}
        >
          <option value="all">{s.allTypes}</option>
          {(res.data?.docTypes ?? []).map((t) => (
            <option key={t} value={t}>
              {t}
            </option>
          ))}
        </Select>
        <Button
          variant="quiet"
          onClick={() => setAdvanced((a) => !a)}
          aria-expanded={advanced}
          aria-controls="advanced-search"
        >
          {s.advanced}
        </Button>
      </div>
      {advanced && (
        <dl
          id="advanced-search"
          className="mb-2 flex flex-wrap gap-x-5 gap-y-1 rounded-lg border border-rule bg-bg-subtle px-3.5 py-2.5 text-dense text-muted"
        >
          {s.advancedHelp.map(([syntax, meaning]) => (
            <div key={syntax} className="flex items-baseline gap-2">
              <dt className="font-mono text-[0.71875rem] text-ink-soft">{syntax}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      )}

      {res.data && browsing && (
        <>
          <p className="mt-[10px] mb-3 text-dense text-faint" aria-live="polite">
            {plural(docRows.length, s.browseCountOne, s.browseCountOther)}
          </p>
          {docRows.length === 0 && <p className="text-ui-sm text-faint">{s.empty}</p>}
          <ul>
            {docRows.map((doc) => {
              const selected = selectedDocId === doc.docId
              const actions: Array<
                | {
                    key: string
                    label: string
                    onClick: () => void
                    disabled?: boolean
                    hint?: string
                  }
                | { key: string; label: string; to: string }
              > = [
                {
                  key: 'preview',
                  label: s.previewAction,
                  onClick: () => setPreview({ docId: doc.docId, fileName: doc.fileName }),
                  disabled: !doc.extracted,
                  hint: doc.extracted ? undefined : s.previewUnavailable,
                },
                { key: 'download', label: s.downloadAction, onClick: () => downloadOriginal(doc) },
                ...(doc.usedInReviewId
                  ? [
                      {
                        key: 'used',
                        label: fmt(s.usedIn, { borrower: doc.usedInBorrower ?? '' }),
                        to: `/review/${doc.usedInReviewId}${doc.usedInSectionN ? `#${sectionAnchor(doc.usedInSectionN)}` : ''}`,
                      },
                    ]
                  : []),
              ]
              return (
                <li
                  key={doc.docId}
                  className={cx(
                    'mb-1.5 rounded-[10px] border border-rule bg-bg',
                    selected && 'border-rule-strong',
                  )}
                >
                  <div
                    role="button"
                    tabIndex={0}
                    aria-pressed={selected}
                    aria-label={fmt(s.selectDocAria, { fileName: doc.fileName })}
                    onClick={() => setSelectedDocId(selected ? null : doc.docId)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' || e.key === ' ') {
                        if (e.target !== e.currentTarget) return
                        e.preventDefault()
                        setSelectedDocId(selected ? null : doc.docId)
                      }
                    }}
                    className={cx(
                      'flex cursor-default flex-wrap items-center gap-3 rounded-[10px] px-3.5 py-[11px]',
                      selected
                        ? 'rounded-b-none bg-bg-subtle shadow-[inset_2px_0_0_var(--indigo)]'
                        : 'hover:bg-bg-subtle',
                    )}
                  >
                    <span className="min-w-0 flex-1 truncate font-mono text-ui-sm font-medium">
                      {doc.fileName}
                    </span>
                    {doc.extracted ? (
                      <Badge tone="green">{s.extracted}</Badge>
                    ) : (
                      <Badge tone="slate">{s.notExtracted}</Badge>
                    )}
                    <span className="flex-none text-dense text-faint">
                      {strings.lobShort[doc.lob] ?? doc.lob}
                    </span>
                    <span className="flex-none font-mono text-micro text-faint">{doc.date}</span>
                  </div>
                  {selected && (
                    <ul className="flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-rule px-3.5 py-2">
                      {actions.map((a) => (
                        <li key={a.key}>
                          {'to' in a ? (
                            <Link
                              to={a.to}
                              className="text-[0.75rem] text-muted underline underline-offset-2 hover:text-ink"
                            >
                              {a.label}
                            </Link>
                          ) : (
                            <Button
                              variant="link"
                              disabled={a.disabled}
                              title={a.hint}
                              className={cx(
                                a.disabled && 'cursor-not-allowed text-faint no-underline',
                              )}
                              onClick={a.onClick}
                            >
                              {a.label}
                            </Button>
                          )}
                        </li>
                      ))}
                    </ul>
                  )}
                </li>
              )
            })}
          </ul>
        </>
      )}

      {res.data && !browsing && (
        <>
          <p className="mt-[10px] mb-3 text-dense text-faint" aria-live="polite">
            {fmt(s.countLine, {
              passages: plural(res.data.totalPassages, s.passagesOne, s.passagesOther),
              documents: plural(res.data.totalDocuments, s.documentsOne, s.documentsOther),
              order: s.orderRelevance,
            })}
          </p>
          {res.data.hits.length === 0 && <p className="text-ui-sm text-faint">{s.empty}</p>}
          <ul>
            {res.data.hits.map((h) => (
              <li
                key={h.id}
                className="mb-[10px] rounded-[10px] border border-rule bg-bg px-3.5 py-3"
              >
                <div className="flex flex-wrap items-center gap-2 font-mono text-ui-sm font-medium">
                  {h.fileName}
                  {h.extracted ? (
                    <Badge tone="green">{s.extracted}</Badge>
                  ) : (
                    <Badge tone="slate">{s.notExtracted}</Badge>
                  )}
                </div>
                <div className="mt-1.5 flex flex-wrap gap-1">
                  {[
                    fmt(s.counterpartyPill, { name: h.counterparty }),
                    fmt(s.typePill, { type: h.docType }),
                    h.date,
                  ].map((pill) => (
                    <span
                      key={pill}
                      className="rounded border border-rule bg-bg-subtle px-1.5 text-[0.625rem] text-muted"
                    >
                      {pill}
                    </span>
                  ))}
                </div>
                {/* snippetHtml is trusted markup from the API seam: text plus <mark>. */}
                <p
                  className="mt-[9px] border-l-2 border-rule-strong pl-3 font-display text-ui leading-[1.55] text-ink-soft italic"
                  dangerouslySetInnerHTML={{ __html: `“${h.snippetHtml}”` }}
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-[10px] text-micro text-faint">
                  <span>
                    {h.sectionName} ·{' '}
                    <span className="font-mono">{fmt(strings.common.pageRef, { n: h.page })}</span>
                  </span>
                  <Button variant="link" onClick={() => setSource(toEvidence(h))}>
                    {s.viewSource}
                  </Button>
                  {h.usedInReviewId && (
                    <Link
                      to={`/review/${h.usedInReviewId}${h.usedInSectionN ? `#${sectionAnchor(h.usedInSectionN)}` : ''}`}
                      className="text-[0.75rem] text-muted underline underline-offset-2 hover:text-ink"
                    >
                      {fmt(s.usedIn, { borrower: h.usedInBorrower ?? h.counterparty })}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}

      {source && <SourceModal evidence={source} onClose={() => setSource(null)} />}
      {preview && (
        <DocumentPreviewModal
          docId={preview.docId}
          fileName={preview.fileName}
          onClose={() => setPreview(null)}
        />
      )}
    </div>
  )
}
