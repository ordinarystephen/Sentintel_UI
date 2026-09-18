/**
 * ERM Documents — the shared platform repository through ERM's lens
 * (concept pins E5/E11): grouped by borrower (serif group header),
 * collapsible groups with 3 documents visible then scroll, name/RXM
 * search, data-driven in-monitor-scope chips (from the latest run), and
 * both faces of a document — the extraction (shared preview viewer) and
 * the raw pages (shared raw viewer). The lens = the latest run's
 * population universe (included + indeterminate); nothing here is a
 * second document store.
 */
import { useMemo, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import type { BorrowerRef, DocumentText, RepositoryDoc } from '@/api/types'
import { useRuns } from '@/api/hooks'
import { Badge } from '@/components/Badge'
import { BorrowerGroups } from '@/components/viewers/BorrowerGroups'
import { DocumentPreviewModal } from '@/components/viewers/DocumentPreviewModal'
import { RawDocumentModal } from '@/components/viewers/RawDocumentModal'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'

const s = strings.erm.documents

export function ErmDocumentsScreen() {
  const [query, setQuery] = useState('')
  const runs = useRuns()
  const repo = useQuery({
    queryKey: ['repository', 'erm', query],
    queryFn: () => api.searchRepository(query),
  })
  const [preview, setPreview] = useState<{ docId: string; fileName: string } | null>(null)
  const [raw, setRaw] = useState<{ fileName: string; doc: DocumentText | null } | null>(null)

  const latest = runs.data?.find((r) => r.state === 'completed')
  const lens = useMemo<BorrowerRef[]>(() => {
    if (!latest) return []
    return [...latest.population.included, ...latest.population.indeterminate.map((i) => i.ref)]
  }, [latest])
  const inScope = useMemo(() => new Set(latest?.documents ?? []), [latest])

  const groups = useMemo(() => {
    const byRxm = new Map<string, RepositoryDoc[]>()
    for (const d of repo.data ?? []) {
      if (!byRxm.has(d.rxm)) byRxm.set(d.rxm, [])
      byRxm.get(d.rxm)!.push(d)
    }
    return lens
      .map((b) => ({ borrower: b, docs: byRxm.get(b.rxm) ?? [] }))
      .filter((g) => g.docs.length > 0)
      .sort((a, b) => b.docs.length - a.docs.length)
  }, [repo.data, lens])

  const totalDocs = groups.reduce((n, g) => n + g.docs.length, 0)

  async function openRaw(d: RepositoryDoc) {
    if (!d.docId) {
      setRaw({ fileName: d.fileName, doc: null })
      return
    }
    try {
      setRaw({ fileName: d.fileName, doc: await api.getDocumentText(d.docId) })
    } catch {
      setRaw({ fileName: d.fileName, doc: null })
    }
  }

  return (
    <div className="settle">
      <div>
        <h1 className="font-display text-[1.375rem] font-semibold tracking-display">{s.title}</h1>
        <p className="mb-4 max-w-[56ch] text-ui-sm text-muted">{s.sub}</p>
      </div>
      <div>
        <input
          type="search"
          aria-label={s.searchAria}
          placeholder={s.searchPlaceholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="w-full rounded-lg border border-rule-strong bg-bg px-3 py-[9px] text-[0.8125rem]"
        />
        <p className="mt-1 mb-3 text-dense text-faint">
          {totalDocs === 0 && query
            ? s.empty
            : fmt(s.hint, {
                documents: plural(totalDocs, s.docsOne, s.docsOther),
                borrowers: plural(groups.length, s.borrowersOne, s.borrowersOther),
              })}
        </p>
      </div>

      <BorrowerGroups
        groups={groups}
        renderDoc={(d) => (
          <div
            key={d.repoId}
            className="mb-2 flex flex-wrap items-center gap-3 rounded-[10px] border border-rule bg-bg px-3.5 py-[11px]"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-[0.78125rem] font-medium">
              {d.fileName}
            </span>
            <Badge tone="neutral">{d.docType}</Badge>
            <span
              className={cx(
                'rounded px-[7px] text-[0.625rem] font-semibold',
                inScope.has(d.fileName)
                  ? 'border border-indigo-line bg-indigo-bg text-indigo'
                  : 'border border-rule-strong bg-bg-subtle font-normal text-faint',
              )}
            >
              {inScope.has(d.fileName) ? s.inScope : s.notInScope}
            </span>
            <span className="ml-auto flex flex-none gap-3">
              <button
                type="button"
                disabled={!d.docId}
                onClick={() => d.docId && setPreview({ docId: d.docId, fileName: d.fileName })}
                className="text-[0.75rem] text-muted underline underline-offset-2 disabled:no-underline disabled:opacity-50"
              >
                {s.viewExtraction}
              </button>
              <button
                type="button"
                onClick={() => openRaw(d)}
                className="text-[0.75rem] text-muted underline underline-offset-2"
              >
                {s.rawDocument}
              </button>
            </span>
          </div>
        )}
      />

      {preview && (
        <DocumentPreviewModal
          docId={preview.docId}
          fileName={preview.fileName}
          onClose={() => setPreview(null)}
        />
      )}
      {raw && (
        <RawDocumentModal fileName={raw.fileName} doc={raw.doc} onClose={() => setRaw(null)} />
      )}
      <p className="mt-[30px] border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
        {strings.suite.fictionalNote}
      </p>
    </div>
  )
}
