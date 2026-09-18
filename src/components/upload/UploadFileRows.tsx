/** The shared per-file rows: progress bar, or the amber named-rule rejection. */
import type { RejectedFile } from './uploadList'
import { MAX_UPLOAD_MB } from './config'
import { fmt } from '@/lib/fmt'
import { formatBytes } from '@/lib/format'
import { strings } from '@/strings'

const s = strings.upload

export function UploadFileRows({
  files,
  rejected,
  progressOf,
  onRemove,
  onRemoveRejected,
  listAria,
}: {
  files: File[]
  rejected: RejectedFile[]
  progressOf: (f: File) => number
  onRemove: (f: File) => void
  onRemoveRejected: (name: string) => void
  listAria: string
}) {
  if (files.length === 0 && rejected.length === 0) return null
  return (
    <ul className="mt-2 flex flex-col gap-2" aria-label={listAria}>
      {files.map((f) => {
        const pct = progressOf(f)
        return (
          <li
            key={`${f.name}:${f.size}`}
            className="flex items-center gap-2.5 rounded-lg border border-rule bg-bg px-3 py-2 text-[0.78125rem]"
          >
            {pct >= 100 ? (
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
            ) : (
              <span className="h-3.5 w-3.5 flex-none rounded-full border-2 border-rule-strong border-t-ink-soft motion-safe:animate-spin" />
            )}
            <span className="flex-none truncate font-mono text-[0.75rem]">{f.name}</span>
            <span className="flex-none text-micro normal-case tracking-normal text-faint">
              {formatBytes(f.size)}
            </span>
            <span className="h-1 min-w-[60px] flex-1 overflow-hidden rounded-full bg-rule">
              <i className="block h-full rounded-full bg-success" style={{ width: `${pct}%` }} />
            </span>
            <button
              type="button"
              aria-label={`${s.remove} ${f.name}`}
              onClick={() => onRemove(f)}
              className="ml-auto flex-none text-[0.75rem] text-faint underline underline-offset-2 hover:text-ink"
            >
              {s.remove}
            </button>
          </li>
        )
      })}
      {rejected.map((r) => (
        <li
          key={r.name}
          role="alert"
          className="flex items-center gap-2.5 rounded-lg border border-warn-line bg-warn-bg px-3 py-2 text-[0.78125rem]"
        >
          <svg
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.2"
            aria-hidden="true"
            className="flex-none text-warn"
          >
            <path d="M12 8v5m0 3.5v.5" />
            <circle cx="12" cy="12" r="9" />
          </svg>
          <span className="flex-none truncate font-mono text-[0.75rem]">{r.name}</span>
          <span className="text-[0.75rem] text-warn">
            {r.reason === 'over_limit'
              ? fmt(s.overLimit, { size: Math.round(r.size / 1024 / 1024), limit: MAX_UPLOAD_MB })
              : s.wrongType}
          </span>
          <button
            type="button"
            aria-label={`${s.remove} ${r.name}`}
            onClick={() => onRemoveRejected(r.name)}
            className="ml-auto flex-none text-[0.75rem] text-faint underline underline-offset-2 hover:text-ink"
          >
            {s.remove}
          </button>
        </li>
      ))}
    </ul>
  )
}
