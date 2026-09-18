/**
 * CRR start (`/crr`, build-spec §5.1 + refinement round 2026-09-18): drop
 * zone (shared upload rows: progress + named-rule rejection) OR the shared
 * repository picker — uploads and picks mix, and a repository-only review
 * works end to end. Optional context, "Begin review · N documents", the
 * Workpaper-configuration disclosure (in place of the REMOVED extraction
 * settings — parsing is the platform's job), and Recent reviews. Borrower
 * and ID are detected during processing; no metadata form.
 */
import { useMemo, useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateReview, useMyReviews } from '@/api/hooks'
import type { RepositoryDoc } from '@/api/types'
import { ChevronIcon } from '@/app/icons'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Collapsible } from '@/components/Collapsible'
import { UploadFileRows } from '@/components/upload/UploadFileRows'
import { useUploadList } from '@/components/upload/uploadList'
import { RepositoryPicker } from '@/components/viewers/RepositoryPicker'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { SECTIONS } from '@/lib/sections'
import { ReviewRow } from '@/screens/reviews/ReviewRow'
import { strings } from '@/strings'
import { WORKPAPER_TEMPLATES } from './config'

const isPdf = (name: string) => /\.pdf$/i.test(name)

export function LandingScreen() {
  const s = strings.landing
  const navigate = useNavigate()
  const upload = useUploadList(isPdf)
  const [picked, setPicked] = useState<RepositoryDoc[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [context, setContext] = useState('')
  const [dragging, setDragging] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const create = useCreateReview()
  const recents = useMyReviews()

  // Workpaper configuration (placeholder vocabulary — see ./config)
  const [wpcOpen, setWpcOpen] = useState(false)
  const [template, setTemplate] = useState<string>(WORKPAPER_TEMPLATES[0])
  const [sections, setSections] = useState<number[]>(SECTIONS.map((x) => x.n))
  const [topics, setTopics] = useState('')

  const totalDocs = upload.files.length + picked.length
  const pickedIds = useMemo(() => picked.map((d) => d.repoId), [picked])

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    upload.addFiles(e.dataTransfer.files)
  }

  function onZoneKey(e: KeyboardEvent) {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault()
      inputRef.current?.click()
    }
  }

  async function begin() {
    setError(null)
    try {
      const { id } = await create.mutateAsync({
        files: upload.files,
        contextText: context,
        repositoryDocIds: pickedIds,
        config: { template, sections, customTopics: topics.trim() || undefined },
      })
      navigate(`/crr/review/${id}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="settle">
      <div className="mx-auto mt-[26px] max-w-[600px]">
        <p className="micro text-faint">{s.eyebrow}</p>
        <h1 className="mt-1 mb-1 font-display text-screen-title font-semibold tracking-display text-balance">
          {s.title}
        </h1>
        <p className="mb-5 max-w-[52ch] text-ui text-muted">{s.sub}</p>

        <div
          role="button"
          tabIndex={0}
          aria-label={s.dropAria}
          onClick={() => inputRef.current?.click()}
          onKeyDown={onZoneKey}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={cx(
            'cursor-pointer rounded-xl border-[1.5px] border-dashed px-6 py-[38px] text-center transition-colors duration-100',
            dragging
              ? 'border-faint bg-bg-hover'
              : 'border-rule-strong bg-bg-subtle hover:border-faint hover:bg-bg-hover',
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.7"
            aria-hidden="true"
            className="mx-auto mb-[10px] h-[26px] w-[26px] text-faint"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
            <polyline points="17 8 12 3 7 8" />
            <line x1="12" y1="3" x2="12" y2="15" />
          </svg>
          <div className="text-[0.9375rem] font-semibold">{s.dropBig}</div>
          <div className="mt-[3px] text-ui-sm text-muted">
            {s.dropOr} <span className="text-ink underline underline-offset-2">{s.browse}</span>{' '}
            <button
              type="button"
              className="text-ink underline underline-offset-2"
              onClick={(e) => {
                e.stopPropagation()
                setPickerOpen(true)
              }}
            >
              {s.fromRepo}
            </button>
          </div>
          <div className="mt-3 text-micro tracking-[0.04em] text-faint">{s.dropHint}</div>
          <input
            ref={inputRef}
            type="file"
            accept="application/pdf,.pdf"
            multiple
            aria-label={s.chooseFilesAria}
            className="sr-only"
            onChange={(e) => {
              if (e.target.files) upload.addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        <UploadFileRows
          files={upload.files}
          rejected={upload.rejected}
          progressOf={upload.progressOf}
          onRemove={upload.removeFile}
          onRemoveRejected={upload.removeRejected}
          listAria={s.fileListAria}
        />

        {picked.length > 0 && (
          <ul className="mt-2 flex flex-col gap-1.5" aria-label={s.pickedListAria}>
            {picked.map((d) => (
              <li
                key={d.repoId}
                className="flex items-center gap-2.5 rounded-lg border border-rule bg-bg px-3 py-2 text-[0.78125rem]"
              >
                <span className="truncate font-mono text-[0.75rem]">{d.fileName}</span>
                <Badge>{d.docType}</Badge>
                <span className="flex-none text-micro normal-case tracking-normal text-faint">
                  {d.counterparty}
                </span>
                <button
                  type="button"
                  onClick={() => setPicked((prev) => prev.filter((x) => x.repoId !== d.repoId))}
                  className="ml-auto flex-none text-[0.75rem] text-faint underline underline-offset-2 hover:text-ink"
                >
                  {strings.upload.remove}
                </button>
              </li>
            ))}
          </ul>
        )}

        <div className="mt-5 mb-1.5 flex items-baseline gap-2">
          <label htmlFor="ctx" className="micro">
            {s.contextLabel}
          </label>
          <span className="text-micro text-faint">{s.optional}</span>
        </div>
        <textarea
          id="ctx"
          value={context}
          onChange={(e) => setContext(e.target.value)}
          placeholder={s.contextPlaceholder}
          className="min-h-16 w-full resize-y rounded-lg border border-rule-strong bg-bg px-[11px] py-[9px] text-ui"
        />

        <div className="mt-4 flex items-center gap-3.5">
          <Button variant="primary" onClick={begin} disabled={create.isPending}>
            {fmt(s.beginCount, {
              documents: plural(totalDocs, s.documentCountOne, s.documentCountOther),
            })}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-ui-sm text-error">
            {error}
          </p>
        )}

        <div className="mt-4">
          <button
            type="button"
            aria-expanded={wpcOpen}
            aria-controls="wpc-body"
            onClick={() => setWpcOpen((o) => !o)}
            className="inline-flex items-center gap-[7px] text-dense text-muted"
          >
            <ChevronIcon
              className={cx(
                'h-[9px] w-[9px] flex-none text-faint transition-transform duration-200',
                wpcOpen && 'rotate-90',
              )}
            />
            {s.wpcSummary}
            <span className="font-mono text-micro text-faint">{s.wpcHint}</span>
          </button>
          <Collapsible open={wpcOpen} id="wpc-body">
            {/* Option vocabulary is a deliberate placeholder — ./config. */}
            <div className="mt-[9px] grid grid-cols-[220px_1fr] items-center gap-x-4 gap-y-2.5 rounded-[10px] border border-rule bg-bg-subtle px-[15px] py-[13px] text-[0.78125rem] max-[700px]:grid-cols-1">
              <label htmlFor="wpc-template" className="micro">
                {s.wpcTemplate}
              </label>
              <select
                id="wpc-template"
                value={template}
                onChange={(e) => setTemplate(e.target.value)}
                className="max-w-[320px] rounded-[7px] border border-rule-strong bg-bg px-2 py-[7px] text-[0.78125rem] text-ink-soft"
              >
                {WORKPAPER_TEMPLATES.map((t) => (
                  <option key={t}>{t}</option>
                ))}
              </select>
              <span className="micro">{s.wpcSections}</span>
              <span className="flex flex-wrap gap-1">
                {SECTIONS.map((sec) => {
                  const on = sections.includes(sec.n)
                  return (
                    <button
                      key={sec.n}
                      type="button"
                      aria-pressed={on}
                      onClick={() =>
                        setSections((prev) =>
                          on ? prev.filter((n) => n !== sec.n) : [...prev, sec.n].sort(),
                        )
                      }
                      className={cx(
                        'rounded border px-[7px] text-[0.65625rem]',
                        on
                          ? 'border-indigo-line bg-indigo-bg text-indigo'
                          : 'border-rule-strong bg-bg text-faint',
                      )}
                    >
                      {sec.n} {sec.short}
                    </button>
                  )
                })}
              </span>
              <label htmlFor="wpc-topics" className="micro">
                {s.wpcTopics}
              </label>
              <input
                id="wpc-topics"
                type="text"
                value={topics}
                onChange={(e) => setTopics(e.target.value)}
                placeholder={s.wpcTopicsPlaceholder}
                className="rounded-[7px] border border-rule-strong bg-bg px-2.5 py-[7px] text-[0.78125rem]"
              />
            </div>
          </Collapsible>
        </div>
      </div>

      <div className="mx-auto mt-10 max-w-[600px]">
        <h3 className="micro mb-[10px] text-faint">{s.recent}</h3>
        {recents.data && recents.data.length === 0 && (
          <p className="text-ui-sm text-faint">{s.noRecents}</p>
        )}
        {recents.data?.slice(0, 6).map((r) => (
          <ReviewRow key={r.id} review={r} variant="my" />
        ))}
      </div>

      {pickerOpen && (
        <RepositoryPicker
          onClose={() => setPickerOpen(false)}
          onDone={(docs) => {
            setPicked((p) => {
              const have = new Set(p.map((x) => x.repoId))
              return [...p, ...docs.filter((d) => !have.has(d.repoId))]
            })
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}
