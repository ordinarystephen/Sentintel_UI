/**
 * Ask (`/vantage`): the Documents zone (SHARED upload states; upload only
 * — no repository picker, no browse, anywhere in Vantage) and one
 * question. The answer is a run, not a chat.
 */
import { useRef, useState, type DragEvent, type KeyboardEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useVantageMutations } from '@/api/hooks'
import type { VantageDocument } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { UploadFileRows } from '@/components/upload/UploadFileRows'
import { useUploadList } from '@/components/upload/uploadList'
import { cx } from '@/lib/cx'
import { plural } from '@/lib/fmt'
import { formatBytes } from '@/lib/format'
import { strings } from '@/strings'
import { deriveDocMeta } from './docMeta'

const s = strings.vantage.ask
const isAccepted = (name: string) => /\.(pdf|docx|xlsx|csv)$/i.test(name)

export function VantageAskScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  // A follow-up arrives with the prior run's docset — a NEW run, no context.
  const carried = (location.state as { documents?: VantageDocument[] } | null)?.documents
  const upload = useUploadList(isAccepted)
  const [question, setQuestion] = useState(
    (location.state as { question?: string } | null)?.question ?? '',
  )
  const [carriedDocs, setCarriedDocs] = useState<VantageDocument[]>(carried ?? [])
  const [error, setError] = useState<string | null>(null)
  const [dragging, setDragging] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)
  const m = useVantageMutations()

  const documents: VantageDocument[] = [
    ...carriedDocs,
    ...upload.files
      .map((f) => deriveDocMeta(f.name, f.size))
      .filter((d): d is VantageDocument => d !== null),
  ]

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

  async function ask() {
    setError(null)
    try {
      const { runId } = await m.ask.mutateAsync({ question, documents })
      navigate(`/vantage/runs/${runId}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <div className="settle">
      <div>
        <h1 className="font-display text-[1.375rem] font-semibold tracking-display">{s.title}</h1>
        <p className="mb-5 max-w-[56ch] text-ui-sm text-muted">{s.sub}</p>
      </div>

      <div>
        <div className="mt-[18px] mb-2.5 flex items-baseline gap-2.5">
          <h3 className="font-display text-[1rem] font-semibold">{s.documentsZone}</h3>
          <span className="text-dense text-faint">{s.documentsAside}</span>
        </div>
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
            'cursor-pointer rounded-xl border-[1.5px] border-dashed px-6 py-[30px] text-center transition-colors duration-100',
            dragging
              ? 'border-faint bg-bg-hover'
              : 'border-rule-strong bg-bg-subtle hover:border-faint hover:bg-bg-hover',
          )}
        >
          <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.6"
            aria-hidden="true"
            className="mx-auto mb-[10px] h-[26px] w-[26px] text-faint"
          >
            <path d="M12 16V4m0 0-4 4m4-4 4 4" />
            <path d="M4 17v2a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2" />
          </svg>
          <div className="text-[0.9375rem] font-semibold">{s.dropTitle}</div>
          <div className="mt-[3px] text-[0.78125rem] text-muted">
            <span className="text-ink underline underline-offset-2">{s.dropBrowse}</span>
          </div>
          <div className="mt-3 text-micro tracking-[0.04em] text-faint">{s.dropHint}</div>
          <input
            ref={inputRef}
            type="file"
            hidden
            multiple
            accept=".pdf,.docx,.xlsx,.csv"
            aria-label={s.dropAria}
            onChange={(e) => {
              if (e.target.files) upload.addFiles(e.target.files)
              e.target.value = ''
            }}
          />
        </div>

        {carriedDocs.map((d) => (
          <div
            key={d.name}
            className="mt-2 flex items-center gap-2.5 rounded-[10px] border border-rule bg-bg px-[13px] py-[9px]"
          >
            <span className="min-w-0 flex-1 truncate font-mono text-[0.78125rem] font-medium">
              {d.name}
            </span>
            <Badge tone="neutral">
              {d.kind} · {d.meta}
            </Badge>
            {d.sizeBytes !== undefined && (
              <span className="flex-none text-dense text-faint">{formatBytes(d.sizeBytes)}</span>
            )}
            <button
              type="button"
              aria-label={`${strings.upload.remove} ${d.name}`}
              onClick={() => setCarriedDocs((prev) => prev.filter((x) => x.name !== d.name))}
              className="ml-auto flex-none text-[0.75rem] text-faint underline underline-offset-2 hover:text-ink"
            >
              {strings.upload.remove}
            </button>
          </div>
        ))}
        <UploadFileRows
          files={upload.files}
          rejected={upload.rejected}
          progressOf={upload.progressOf}
          onRemove={upload.removeFile}
          onRemoveRejected={upload.removeRejected}
          listAria={s.documentsZone}
        />
      </div>

      <div>
        <div className="mt-[26px] mb-2.5 flex items-baseline gap-2.5">
          <h3 className="font-display text-[1rem] font-semibold">{s.questionZone}</h3>
          <span className="text-dense text-faint">{s.questionAside}</span>
        </div>
        <textarea
          aria-label={s.questionAria}
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
          className="min-h-[84px] w-full resize-y rounded-lg border border-rule-strong bg-bg px-3 py-2.5 text-[0.84375rem]"
        />
        <div className="mt-3 flex flex-wrap items-center gap-3">
          <Button variant="primary" disabled={m.ask.isPending} onClick={ask}>
            {s.askBtn}
          </Button>
          <span className="text-[0.75rem] text-faint">
            {plural(documents.length, s.attachedOne, s.attachedOther)}
          </span>
        </div>
        {error && (
          <p role="alert" className="mt-2 text-ui-sm text-error">
            {error}
          </p>
        )}
      </div>
      <p className="mt-[30px] border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
        {strings.suite.fictionalNote}
      </p>
    </div>
  )
}
