/**
 * Questions by spreadsheet (Vantage one-off mode, demo feedback round;
 * concept pin V12): people keep question lists in Excel and want to run
 * them once. The slim drop row takes an .xlsx through the SHARED upload
 * states (progress; amber, rule-named rejection over the limit or for the
 * wrong type); the file is read back through the parse seam and handed
 * up for REVIEW before anything runs. Nothing is retained unless the user
 * saves the questions as a set.
 *
 * ParsedQuestionsCard is that review: mono file name, "N questions read",
 * each question in serif italic with its own remove ✕, the file's ✕, and
 * "Save as a question set". Three rows show; the rest open on request —
 * "review all before running".
 */
import { useEffect, useRef, useState } from 'react'
import { useParseQuestionFile } from '@/api/hooks'
import type { ParsedQuestionFile } from '@/api/types'
import { Badge } from '@/components/Badge'
import { UploadFileRows } from '@/components/upload/UploadFileRows'
import { gateFile, useUploadList } from '@/components/upload/uploadList'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'

const s = strings.vantage.ask
const isXlsx = (name: string) => /\.xlsx$/i.test(name)
const VISIBLE_ROWS = 3

export function QuestionFileIntake({
  onParsed,
}: {
  onParsed: (file: File, parsed: ParsedQuestionFile) => void
}) {
  const upload = useUploadList(isXlsx)
  const parse = useParseQuestionFile()
  const [results, setResults] = useState<ReadonlyMap<File, ParsedQuestionFile>>(new Map())
  const [error, setError] = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  function add(list: FileList | File[]) {
    const files = Array.from(list)
    upload.addFiles(files)
    const file = files.filter((f) => gateFile(f, isXlsx) === null).pop()
    if (!file) return
    setError(null)
    parse.mutateAsync(file).then(
      (r) => setResults((prev) => new Map(prev).set(file, r)),
      (e: Error) => {
        upload.removeFile(file)
        setError(e.message)
      },
    )
  }

  // hand a file up for review once its upload has landed AND it has been
  // read; each hand-off removes the file, so this settles after one pass
  useEffect(() => {
    for (const f of upload.files) {
      const r = results.get(f)
      if (!r || upload.progressOf(f) < 100) continue
      onParsed(f, r)
      upload.removeFile(f)
      setResults((prev) => {
        const next = new Map(prev)
        next.delete(f)
        return next
      })
    }
  }, [upload, results, onParsed])

  return (
    <>
      <div
        role="button"
        tabIndex={0}
        aria-label={s.fileAria}
        onClick={() => inputRef.current?.click()}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            inputRef.current?.click()
          }
        }}
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          add(e.dataTransfer.files)
        }}
        className="mt-2.5 flex cursor-pointer items-center gap-2.5 rounded-[10px] border-[1.5px] border-dashed border-rule-strong bg-bg-subtle px-3.5 py-2.5 text-[0.78125rem] text-muted hover:border-faint hover:bg-bg-hover"
      >
        <svg
          viewBox="0 0 24 24"
          width="15"
          height="15"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          aria-hidden="true"
          className="flex-none text-faint"
        >
          <path d="M12 16V4m0 0-4 4m4-4 4 4" />
          <path d="M4 17v2a1.5 1.5 0 0 0 1.5 1.5h13A1.5 1.5 0 0 0 20 19v-2" />
        </svg>
        <span>
          {s.fileRowPre} <span className="font-mono">{s.fileRowExt}</span> {s.fileRowPost}
        </span>
        <input
          ref={inputRef}
          type="file"
          hidden
          accept=".xlsx"
          aria-label={s.fileAria}
          onChange={(e) => {
            if (e.target.files) add(e.target.files)
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
        listAria={s.fileAria}
      />
      {error && (
        <p role="alert" className="mt-2 text-ui-sm text-warn">
          {error}
        </p>
      )}
    </>
  )
}

export function ParsedQuestionsCard({
  fileName,
  read,
  questions,
  saved,
  onRemoveQuestion,
  onRemoveFile,
  onSaveAsSet,
}: {
  fileName: string
  /** How many questions the file yielded (the badge — a fact about the file). */
  read: number
  /** The questions still kept for this run, in file order. */
  questions: string[]
  saved: boolean
  onRemoveQuestion: (index: number) => void
  onRemoveFile: () => void
  onSaveAsSet: () => void
}) {
  const [expanded, setExpanded] = useState(false)
  const shown = expanded ? questions : questions.slice(0, VISIBLE_ROWS)
  return (
    <div
      data-testid="parsed-questions"
      className="mt-2.5 overflow-hidden rounded-[10px] border border-rule bg-bg"
    >
      <div className="flex items-center gap-2.5 px-3.5 py-[9px]">
        <span className="min-w-0 flex-1 truncate font-mono text-[0.78125rem] font-medium">
          {fileName}
        </span>
        <Badge tone="green">{plural(read, s.parsedOne, s.parsedOther)}</Badge>
        {saved ? (
          <span className="text-[0.75rem] text-faint">{s.savedAsSet}</span>
        ) : (
          <button
            type="button"
            onClick={onSaveAsSet}
            className="text-[0.75rem] text-muted underline underline-offset-2 hover:text-ink"
          >
            {s.saveAsSet}
          </button>
        )}
        <button
          type="button"
          aria-label={fmt(s.removeFile, { file: fileName })}
          onClick={onRemoveFile}
          className="rounded-[5px] px-1.5 py-0.5 text-[0.8125rem] text-faint hover:bg-bg-hover hover:text-ink"
        >
          ✕
        </button>
      </div>
      <ul aria-label={fmt(s.parsedListAria, { file: fileName })}>
        {shown.map((q, i) => (
          <li
            key={`${i}:${q}`}
            className="flex items-baseline gap-2.5 border-t border-rule px-3.5 py-[7px]"
          >
            <span className="min-w-0 flex-1 font-display text-[0.8125rem] text-ink-soft italic">
              {fmt(s.quotedQuestion, { question: q })}
            </span>
            <button
              type="button"
              aria-label={fmt(s.removeQuestion, { n: i + 1 })}
              onClick={() => onRemoveQuestion(i)}
              className="flex-none rounded-[5px] px-1.5 text-[0.75rem] text-faint hover:bg-bg-hover hover:text-ink"
            >
              ✕
            </button>
          </li>
        ))}
      </ul>
      {!expanded && questions.length > VISIBLE_ROWS && (
        <div className="border-t border-rule px-3.5 py-2">
          <button
            type="button"
            onClick={() => setExpanded(true)}
            className="text-[0.75rem] text-muted underline underline-offset-2 hover:text-ink"
          >
            {fmt(s.moreQuestions, { n: questions.length - VISIBLE_ROWS })}
          </button>
        </div>
      )}
    </div>
  )
}
