/**
 * Shared upload-list model (v1.6 — the vendored upload-states behavior,
 * first-party, re-skinned to tokens): accepted files carry simulated
 * per-file progress; rejected files carry the rule they hit, named
 * honestly (amber, never red drama). Used by CRR start, the add-document
 * modal, CPEA start, and the Add-new question-set modal.
 */
import { useCallback, useRef, useState } from 'react'
import { MAX_UPLOAD_BYTES } from './config'

export type RejectReason = 'over_limit' | 'wrong_type'

export interface RejectedFile {
  name: string
  size: number
  reason: RejectReason
}

/** The pure gate — unit-tested; the hook and every dropzone go through it. */
export function gateFile(
  file: { name: string; size: number },
  accept?: (name: string) => boolean,
): RejectReason | null {
  if (accept && !accept(file.name)) return 'wrong_type'
  if (file.size > MAX_UPLOAD_BYTES) return 'over_limit'
  return null
}

export function useUploadList(accept?: (name: string) => boolean) {
  const [files, setFiles] = useState<File[]>([])
  const [rejected, setRejected] = useState<RejectedFile[]>([])
  const [progress, setProgress] = useState<Record<string, number>>({})
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({})

  const addFiles = useCallback(
    (list: FileList | File[]) => {
      const incoming = Array.from(list)
      const bad: RejectedFile[] = []
      const good: File[] = []
      for (const f of incoming) {
        const reason = gateFile(f, accept)
        if (reason) bad.push({ name: f.name, size: f.size, reason })
        else good.push(f)
      }
      if (bad.length)
        setRejected((prev) => [...prev, ...bad.filter((b) => !prev.some((p) => p.name === b.name))])
      setFiles((prev) => {
        const seen = new Set(prev.map((f) => `${f.name}:${f.size}`))
        const fresh = good.filter((f) => !seen.has(`${f.name}:${f.size}`))
        for (const f of fresh) {
          const key = `${f.name}:${f.size}`
          setProgress((p) => ({ ...p, [key]: 8 }))
          timers.current[key] = setInterval(() => {
            setProgress((p) => {
              const next = Math.min(100, (p[key] ?? 0) + 18 + Math.random() * 20)
              if (next >= 100) {
                clearInterval(timers.current[key])
                delete timers.current[key]
              }
              return { ...p, [key]: next }
            })
          }, 140)
        }
        return [...prev, ...fresh]
      })
    },
    [accept],
  )

  const removeFile = useCallback((f: File) => setFiles((prev) => prev.filter((x) => x !== f)), [])
  const removeRejected = useCallback(
    (name: string) => setRejected((prev) => prev.filter((r) => r.name !== name)),
    [],
  )
  const progressOf = (f: File) => progress[`${f.name}:${f.size}`] ?? 100
  return { files, rejected, addFiles, removeFile, removeRejected, progressOf }
}
