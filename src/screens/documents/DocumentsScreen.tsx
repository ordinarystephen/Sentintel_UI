/**
 * Documents (`/documents`, build-spec §5.5): passage search over everything
 * Sentinel has read. Query and filters live in the URL (`?q=&lob=&cp=&type=`)
 * and execute against the seam. Hits carry provenance, a source modal, and a
 * deep link into the review a passage fed.
 */
import { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useDocumentSearch } from '@/api/hooks'
import { LOBS, type DocumentFilters, type DocumentHit, type Evidence, type Lob } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { SearchInput } from '@/components/SearchInput'
import { Select } from '@/components/Select'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { sectionAnchor } from '@/lib/sections'
import { SourceModal } from '@/screens/review/SourceModal'
import { strings } from '@/strings'

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

  function set(key: string, value: string) {
    const next = new URLSearchParams(params)
    if (value === '' || value === 'all') next.delete(key)
    else next.set(key, value)
    setParams(next, { replace: true })
  }

  return (
    <div>
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
              <dt className="font-mono text-[11.5px] text-ink-soft">{syntax}</dt>
              <dd>{meaning}</dd>
            </div>
          ))}
        </dl>
      )}

      {res.data && (
        <>
          <p className="mt-[10px] mb-3 text-dense text-faint" aria-live="polite">
            {s.count(res.data.totalPassages, res.data.totalDocuments, debounced.trim().length > 0)}
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
                  {[s.counterpartyPill(h.counterparty), s.typePill(h.docType), h.date].map(
                    (pill) => (
                      <span
                        key={pill}
                        className="rounded border border-rule bg-bg-subtle px-1.5 text-[10px] text-muted"
                      >
                        {pill}
                      </span>
                    ),
                  )}
                </div>
                {/* snippetHtml is trusted markup from the API seam: text plus <mark>. */}
                <p
                  className="mt-[9px] border-l-2 border-rule-strong pl-3 font-display text-ui leading-[1.55] text-ink-soft italic"
                  dangerouslySetInnerHTML={{ __html: `“${h.snippetHtml}”` }}
                />
                <div className="mt-1.5 flex flex-wrap items-center gap-[10px] text-micro text-faint">
                  <span>
                    {h.sectionName} · <span className="font-mono">p. {h.page}</span>
                  </span>
                  <Button variant="link" onClick={() => setSource(toEvidence(h))}>
                    {s.viewSource}
                  </Button>
                  {h.usedInReviewId && (
                    <Link
                      to={`/review/${h.usedInReviewId}${h.usedInSectionN ? `#${sectionAnchor(h.usedInSectionN)}` : ''}`}
                      className="text-[12px] text-muted underline underline-offset-2 hover:text-ink"
                    >
                      {s.usedIn(h.usedInBorrower ?? h.counterparty)}
                    </Link>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </>
      )}
      {source && <SourceModal evidence={source} onClose={() => setSource(null)} />}
    </div>
  )
}
