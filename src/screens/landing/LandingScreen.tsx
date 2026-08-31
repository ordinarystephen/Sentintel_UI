/**
 * Landing (`/`, build-spec §5.1): drop zone + optional context, "Begin
 * review", the demoted extraction settings, and Recent reviews. No metadata
 * form — borrower and ID are detected during processing. A review starts
 * with exactly two interactions: drop, Begin.
 */
import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { useCreateReview, useMyReviews } from '@/api/hooks'
import { DEFAULT_EXTRACTION, type ExtractionSettings } from '@/api/types'
import { FileIcon } from '@/app/icons'
import { Button } from '@/components/Button'
import { cx } from '@/lib/cx'
import { formatBytes } from '@/lib/format'
import { usePersistedState } from '@/lib/usePersistedState'
import { ReviewRow } from '@/screens/reviews/ReviewRow'
import { strings } from '@/strings'
import { plural } from '@/lib/fmt'

const isPdf = (f: File) => f.type === 'application/pdf' || /\.pdf$/i.test(f.name)
const isSettings = (v: unknown): v is ExtractionSettings =>
  typeof v === 'object' && v !== null && 'parser' in v && 'preset' in v && 'concurrency' in v

export function LandingScreen() {
  const s = strings.landing
  const navigate = useNavigate()
  const [files, setFiles] = useState<File[]>([])
  const [rejected, setRejected] = useState<string[]>([])
  const [context, setContext] = useState('')
  const [dragging, setDragging] = useState(false)
  const [advanced, setAdvanced] = useState(false)
  const [settings, setSettings] = usePersistedState(
    'extraction.settings',
    DEFAULT_EXTRACTION,
    isSettings,
  )
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const create = useCreateReview()
  const recents = useMyReviews()

  function addFiles(list: FileList | File[]) {
    const incoming = Array.from(list)
    const bad = incoming.filter((f) => !isPdf(f)).map((f) => f.name)
    setRejected(bad)
    setFiles((prev) => {
      const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
      return [...prev, ...incoming.filter((f) => isPdf(f) && !seen.has(`${f.name}:${f.size}`))]
    })
    setError(null)
  }

  function onDrop(e: DragEvent) {
    e.preventDefault()
    setDragging(false)
    addFiles(e.dataTransfer.files)
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
      const { id } = await create.mutateAsync({ files, contextText: context, settings })
      navigate(`/review/${id}`)
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
          <div className="text-[15px] font-semibold">{s.dropBig}</div>
          <div className="mt-[3px] text-ui-sm text-muted">
            {s.dropOr} <span className="text-ink underline underline-offset-2">{s.browse}</span>
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
              if (e.target.files) addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {rejected.length > 0 && (
          <p role="alert" className="mt-2 text-dense text-warn">
            {s.onlyPdf} <span className="font-mono">{rejected.join(', ')}</span>
          </p>
        )}

        {files.length > 0 && (
          <ul className="mt-3 flex flex-col gap-1.5" aria-label={s.fileListAria}>
            {files.map((f) => (
              <li
                key={`${f.name}:${f.size}`}
                className="flex items-center gap-[9px] rounded-lg border border-rule bg-bg px-[11px] py-[7px] text-ui-sm"
              >
                <FileIcon className="h-[13px] w-[13px] flex-none text-faint" />
                <span className="truncate font-mono text-[12px]">{f.name}</span>
                <span className="flex-none text-micro text-faint">{formatBytes(f.size)}</span>
                <button
                  type="button"
                  aria-label={`${s.removeFile} ${f.name}`}
                  onClick={() => setFiles((prev) => prev.filter((x) => x !== f))}
                  className="ml-auto flex-none text-faint hover:text-ink"
                >
                  ✕
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
            {s.begin}
          </Button>
          <span className="text-[12px] text-faint">
            {plural(files.length, s.documentCountOne, s.documentCountOther)}
          </span>
          <Button
            variant="quiet"
            className="ml-auto"
            onClick={() => setAdvanced((a) => !a)}
            aria-expanded={advanced}
            aria-controls="advanced-settings"
          >
            {s.advanced}
          </Button>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-ui-sm text-error">
            {error}
          </p>
        )}

        {advanced && (
          <div
            id="advanced-settings"
            className="mt-3 flex flex-wrap gap-3 rounded-lg border border-rule bg-bg-subtle px-3.5 py-3"
          >
            <Setting
              label={s.parser}
              value={settings.parser}
              options={['pdfplumber', 'pymupdf', 'docling']}
              onChange={(v) =>
                setSettings({ ...settings, parser: v as ExtractionSettings['parser'] })
              }
            />
            <Setting
              label={s.preset}
              value={settings.preset}
              options={['ib_lending', 'generic']}
              onChange={(v) =>
                setSettings({ ...settings, preset: v as ExtractionSettings['preset'] })
              }
            />
            <Setting
              label={s.concurrency}
              value={String(settings.concurrency)}
              options={['2', '4', '8']}
              onChange={(v) =>
                setSettings({
                  ...settings,
                  concurrency: Number(v) as ExtractionSettings['concurrency'],
                })
              }
            />
          </div>
        )}
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
    </div>
  )
}

function Setting({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: string
  options: string[]
  onChange: (v: string) => void
}) {
  const id = `setting-${label.replace(/\s+/g, '-').toLowerCase()}`
  return (
    <label htmlFor={id} className="flex items-center gap-2 text-[12px] text-muted">
      {label}
      <select
        id={id}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="rounded-[7px] border border-rule-strong bg-bg px-2 py-1 font-mono text-[12px] text-ink-soft"
      >
        {options.map((o) => (
          <option key={o} value={o}>
            {o}
          </option>
        ))}
      </select>
    </label>
  )
}
