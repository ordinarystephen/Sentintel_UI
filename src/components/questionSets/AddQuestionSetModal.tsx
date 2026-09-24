/**
 * "Add a question set" — the ONE modal behind every shelf's Add new (CPEA,
 * Vantage) and Vantage's "Save as a question set" (demo feedback round:
 * the one-off intake and the saved-set upload are the same capability at
 * two commitment levels). A dropped file goes through the same shared
 * upload states and the same parse seam as the one-off intake; saving
 * writes to THIS application's store only. `prefill` arrives from a
 * reviewed one-off file — the file, a derived title, the questions kept.
 */
import { useRef, useState } from 'react'
import { useParseQuestionFile, useQuestionSetMutations } from '@/api/hooks'
import type { ParsedQuestionFile, QuestionSet, QuestionSetStore } from '@/api/types'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { UploadFileRows } from '@/components/upload/UploadFileRows'
import { gateFile, useUploadList } from '@/components/upload/uploadList'
import { fmt, plural } from '@/lib/fmt'
import { formatBytes } from '@/lib/format'
import { strings } from '@/strings'

const s = strings.questionSets
const isQuestionFile = (name: string) => /\.(csv|xlsx)$/i.test(name)

export interface QuestionSetPrefill {
  file: { name: string; size: number }
  title: string
  /** The questions the user KEPT in review (the set's fields, in order). */
  questions: string[]
  /** How many the file yielded, before any were removed. */
  read: number
  placeholder?: true
}

/** What was read, said honestly: all of it, some of it, or placeholders. */
function ReadLine({ read, of }: { read: ParsedQuestionFile; of?: number }) {
  const n = read.questions.length
  const text = read.placeholder
    ? fmt(plural(n, s.filePlaceholderOne, s.filePlaceholderOther), { file: read.fileName })
    : of !== undefined && n < of
      ? fmt(s.fileKept, { kept: n, read: of, file: read.fileName })
      : fmt(plural(n, s.fileReadOne, s.fileReadOther), { file: read.fileName })
  return <p className="mt-2 text-dense text-muted">{text}</p>
}

export function AddQuestionSetModal({
  store,
  prefill,
  onClose,
  onSaved,
}: {
  store: QuestionSetStore
  prefill?: QuestionSetPrefill
  onClose: () => void
  onSaved?: (set: QuestionSet) => void
}) {
  const m = useQuestionSetMutations(store)
  const parse = useParseQuestionFile()
  const upload = useUploadList(isQuestionFile)
  const [title, setTitle] = useState(prefill?.title ?? '')
  const [desc, setDesc] = useState('')
  const [read, setRead] = useState<ParsedQuestionFile | null>(
    prefill
      ? {
          fileName: prefill.file.name,
          questions: prefill.questions,
          placeholder: prefill.placeholder,
        }
      : null,
  )
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  // the file whose read may land — a removed or superseded file's never does
  const latest = useRef<File | null>(null)

  function addFiles(list: FileList | File[]) {
    const files = Array.from(list)
    // the latest accepted file is the set's file — ONE at a time, so the
    // file listed is always the file whose read is shown
    const file = files.filter((f) => gateFile(f, isQuestionFile) === null).pop()
    if (file) for (const f of upload.files) upload.removeFile(f)
    upload.addFiles(files.filter((f) => f === file || gateFile(f, isQuestionFile) !== null))
    if (!file) return
    latest.current = file
    setError(null)
    parse.mutateAsync(file).then(
      (r) => {
        if (latest.current === file) setRead(r)
      },
      (e: Error) => {
        if (latest.current !== file) return
        setRead(null)
        setError(e.message)
      },
    )
  }

  async function saveSet() {
    try {
      const set = await m.addQuestionSet.mutateAsync({
        name: title.trim(),
        description: desc.trim(),
        fileName: read?.fileName ?? upload.files[0]?.name,
        questions: read?.questions,
      })
      onSaved?.(set)
      onClose()
    } catch (e) {
      setError((e as Error).message)
    }
  }

  return (
    <Modal title={s.modalTitle} closeLabel={s.modalClose} onClose={onClose}>
      {prefill ? (
        <div className="flex items-center gap-2.5 rounded-lg border border-rule bg-bg px-3 py-2 text-[0.78125rem]">
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
            className="flex-none text-success"
          >
            <path d="m4 12.5 5 5L20 6.5" />
          </svg>
          <span className="min-w-0 flex-1 truncate font-mono text-[0.75rem]">
            {prefill.file.name}
          </span>
          <span className="flex-none text-micro normal-case tracking-normal text-faint">
            {formatBytes(prefill.file.size)}
          </span>
        </div>
      ) : (
        <>
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
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault()
              addFiles(e.dataTransfer.files)
            }}
            className="cursor-pointer rounded-xl border-[1.5px] border-dashed border-rule-strong bg-bg-subtle px-[18px] py-5 text-center hover:border-faint hover:bg-bg-hover"
          >
            <div className="text-[0.84375rem] font-semibold">{s.dropTitle}</div>
            <div className="mt-0.5 text-[0.78125rem] text-muted">{s.dropHint}</div>
            <input
              ref={fileInput}
              type="file"
              hidden
              accept=".csv,.xlsx"
              aria-label={s.dropAria}
              onChange={(e) => {
                if (e.target.files) addFiles(e.target.files)
                e.target.value = ''
              }}
            />
          </div>
          <UploadFileRows
            files={upload.files}
            rejected={upload.rejected}
            progressOf={upload.progressOf}
            onRemove={(f) => {
              upload.removeFile(f)
              if (latest.current === f) {
                latest.current = null
                setRead(null)
              }
            }}
            onRemoveRejected={upload.removeRejected}
            listAria={s.listAria}
          />
          {parse.isPending && (
            <p className="mt-2 text-dense text-faint" aria-live="polite">
              {fmt(s.readingFile, { file: upload.files[upload.files.length - 1]?.name ?? '' })}
            </p>
          )}
        </>
      )}
      {read && !parse.isPending && <ReadLine read={read} of={prefill?.read} />}
      {error && (
        <p role="alert" className="mt-2 text-ui-sm text-warn">
          {error}
        </p>
      )}
      <div className="mt-3.5">
        <label htmlFor="qs-title" className="micro mb-[5px] block">
          {s.titleLabel}
        </label>
        <input
          id="qs-title"
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          placeholder={s.titlePlaceholder}
          className="w-full rounded-lg border border-rule-strong bg-bg px-[11px] py-2 text-[0.8125rem]"
        />
      </div>
      <div className="mt-3">
        <label htmlFor="qs-desc" className="micro mb-[5px] block">
          {s.descLabel}
        </label>
        <input
          id="qs-desc"
          type="text"
          value={desc}
          onChange={(e) => setDesc(e.target.value)}
          placeholder={s.descPlaceholder}
          className="w-full rounded-lg border border-rule-strong bg-bg px-[11px] py-2 text-[0.8125rem]"
        />
      </div>
      <div className="mt-[18px] flex justify-end gap-2">
        <Button variant="outline" small onClick={onClose}>
          {s.cancel}
        </Button>
        <Button
          variant="primary"
          small
          disabled={
            !title.trim() ||
            parse.isPending ||
            m.addQuestionSet.isPending ||
            (read !== null && read.questions.length === 0) ||
            // a listed file with no successful read must never save as invented placeholders
            (upload.files.length > 0 && read === null)
          }
          onClick={saveSet}
        >
          {s.save}
        </Button>
      </div>
    </Modal>
  )
}
