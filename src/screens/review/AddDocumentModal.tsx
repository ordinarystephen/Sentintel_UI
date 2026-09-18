/**
 * "Add document" — the amend-evidence modal (round 2026-09-17). Two paths:
 * upload new (same interaction language as the landing dropzone) or select
 * from the repository (documents on system for THIS borrower, ratified
 * search keys, not yet in the review). The rationale is REQUIRED — it is
 * recorded in the review's evidence log and shown on the manifest row.
 * "Add to review" stays disabled until (a file OR a repository selection)
 * AND a non-empty why. On add the review stays put — impacted checks
 * re-run in place (no bounce to the processing screen).
 */
import { useEffect, useRef, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import type { AmendSource, RepositoryDoc, Review } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'
import type { ReviewActions } from './useReviewActions'

const s = strings.review.addDoc

type Tab = 'upload' | 'repo'

export function AddDocumentModal({
  review,
  actions,
  onClose,
}: {
  review: Review
  actions: ReviewActions
  onClose: () => void
}) {
  const [tab, setTab] = useState<Tab>('upload')
  const [file, setFile] = useState<File | null>(null)
  const [repoSel, setRepoSel] = useState<RepositoryDoc | null>(null)
  const [query, setQuery] = useState('')
  const [why, setWhy] = useState('')
  const fileInput = useRef<HTMLInputElement>(null)

  const repo = useQuery({
    queryKey: ['repository', review.id, query],
    queryFn: () => api.searchRepository(query, { rxm: review.rxm, notInReviewId: review.id }),
  })

  const source: AmendSource | null = file
    ? { kind: 'upload', fileName: file.name, sizeBytes: file.size }
    : repoSel
      ? { kind: 'repo', repoId: repoSel.repoId }
      : null
  const ready = source !== null && why.trim().length > 0

  async function confirm() {
    if (!source) return
    const ok = await actions.amendEvidence(source, why.trim())
    if (ok) onClose()
  }

  // The dropzone mirrors the landing upload's interaction language.
  const [dragOver, setDragOver] = useState(false)
  useEffect(() => setDragOver(false), [tab])

  return (
    <Modal title={s.title} closeLabel={s.close} onClose={onClose}>
      <div role="tablist" className="mb-3.5 inline-flex gap-0.5 rounded-lg bg-bg-subtle p-0.5">
        {(
          [
            ['upload', s.tabUpload],
            ['repo', s.tabRepo],
          ] as const
        ).map(([id, label]) => (
          <button
            key={id}
            type="button"
            role="tab"
            aria-selected={tab === id}
            onClick={() => setTab(id)}
            className={cx(
              'rounded-md px-[13px] py-[5px] text-[0.75rem] text-muted',
              tab === id && 'bg-bg font-medium text-ink shadow-sm',
            )}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'upload' ? (
        <div
          role="button"
          tabIndex={0}
          aria-label={s.dropAria}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInput.current?.click()
            }
          }}
          onDragOver={(e) => {
            e.preventDefault()
            setDragOver(true)
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            e.preventDefault()
            setDragOver(false)
            const f = e.dataTransfer.files[0]
            if (f) setFile(f)
          }}
          className={cx(
            'flex cursor-pointer flex-col items-center gap-1 rounded-xl border-2 border-dashed border-rule-strong px-[18px] py-6 text-center',
            dragOver && 'border-ink bg-bg-hover',
          )}
        >
          <div className="text-ui font-semibold">{file ? file.name : s.dropTitle}</div>
          <div className="text-dense text-muted underline underline-offset-2">{s.dropBrowse}</div>
          <div className="text-micro normal-case tracking-normal text-faint">{s.dropHint}</div>
          <input
            ref={fileInput}
            type="file"
            hidden
            accept=".pdf,.docx,.xlsx"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
      ) : (
        <div>
          <input
            type="search"
            aria-label={s.searchAria}
            placeholder={s.searchPlaceholder}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="mb-2.5 w-full rounded-lg border border-rule-strong bg-bg px-[11px] py-2 text-[0.8125rem]"
          />
          <p className="mb-3 text-dense text-faint">
            {plural(
              repo.data?.length ?? 0,
              fmt(s.hitOne, { rxm: review.rxm }),
              fmt(s.hitOther, { n: repo.data?.length ?? 0, rxm: review.rxm }),
            )}
          </p>
          {(repo.data ?? []).map((r) => (
            <div
              key={r.repoId}
              className={cx(
                'mb-2 rounded-[10px] border border-rule bg-bg px-3.5 py-3',
                repoSel?.repoId === r.repoId && 'border-ink shadow-sm',
              )}
            >
              <div className="flex flex-wrap items-center gap-2 font-mono text-ui-sm font-medium">
                {r.fileName}
                <Badge>{r.docType}</Badge>
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-2 text-dense text-faint">
                <span>{fmt(s.uploaded, { date: r.uploadedAt })}</span>
                <span>·</span>
                <span>{fmt(s.pagesParsed, { n: r.pages })}</span>
                <span className="ml-auto">
                  <Button
                    variant="outline"
                    small
                    onClick={() => setRepoSel(repoSel?.repoId === r.repoId ? null : r)}
                  >
                    {repoSel?.repoId === r.repoId ? s.selected : s.select}
                  </Button>
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <label htmlFor="adddoc-why" className="mb-[5px] block text-dense text-muted">
          {s.whyLabel} <span className="text-faint">{s.whyNote}</span>
        </label>
        <input
          id="adddoc-why"
          type="text"
          value={why}
          onChange={(e) => setWhy(e.target.value)}
          placeholder={s.whyPlaceholder}
          className="w-full rounded-lg border border-rule-strong bg-bg px-[11px] py-2 text-[0.8125rem]"
        />
      </div>

      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" small onClick={onClose}>
          {s.cancel}
        </Button>
        <Button variant="primary" small disabled={!ready || actions.pending} onClick={confirm}>
          {s.confirm}
        </Button>
      </div>
    </Modal>
  )
}
