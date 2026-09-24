/**
 * Shared upload-list model (v1.6 — the vendored upload-states behavior,
 * first-party, re-skinned to tokens): accepted files carry simulated
 * per-file progress; rejected files carry the rule they hit, named
 * honestly (amber, never red drama). Used by CRR start, the add-document
 * modal, CPEA start, and the Add-new question-set modal.
 */
import { useCallback, useEffect, useRef, useState } from 'react'
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

const keyOf = (f: { name: string; size: number }) => `${f.name}:${f.size}`

export function useUploadList(accept?: (name: string) => boolean) {
  const [files, setFiles] = useState<File[]>([])
  const [rejected, setRejected] = useState<RejectedFile[]>([])
  const [progress, setProgress] = useState<Record<string, number>>({})
  const timers = useRef<Record<string, ReturnType<typeof setInterval>>>({})
  // The files as last committed — dedupe reads this, so no side effect ever
  // runs inside a state updater (StrictMode calls updaters twice; v1.8 fix:
  // a random step + clearInterval inside the updater could clear the timer
  // on one call while React kept the other call's sub-100 value, stalling a
  // row's progress below 100 for good).
  const filesRef = useRef<File[]>([])

  useEffect(() => {
    const live = timers.current
    return () => Object.values(live).forEach(clearInterval)
  }, [])

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
      // one row per name + size — against what is listed AND within this batch
      const seen = new Set(filesRef.current.map(keyOf))
      const fresh = good.filter((f) => !seen.has(keyOf(f)) && !!seen.add(keyOf(f)))
      if (fresh.length === 0) return
      filesRef.current = [...filesRef.current, ...fresh]
      setFiles(filesRef.current)
      for (const f of fresh) {
        const key = keyOf(f)
        let pct = 8
        setProgress((p) => ({ ...p, [key]: pct }))
        const id = setInterval(() => {
          // the step is decided HERE, once; the updater below stays pure
          pct = Math.min(100, pct + 18 + Math.random() * 20)
          const value = pct
          setProgress((p) => ({ ...p, [key]: value }))
          if (value >= 100) {
            clearInterval(id)
            delete timers.current[key]
          }
        }, 140)
        timers.current[key] = id
      }
    },
    [accept],
  )

  const removeFile = useCallback((f: File) => {
    filesRef.current = filesRef.current.filter((x) => x !== f)
    setFiles(filesRef.current)
    // stop its simulated upload, so a re-drop of the same file starts clean
    const key = keyOf(f)
    if (!filesRef.current.some((x) => keyOf(x) === key) && timers.current[key]) {
      clearInterval(timers.current[key])
      delete timers.current[key]
    }
  }, [])
  const removeRejected = useCallback(
    (name: string) => setRejected((prev) => prev.filter((r) => r.name !== name)),
    [],
  )
  const progressOf = (f: File) => progress[`${f.name}:${f.size}`] ?? 100
  return { files, rejected, addFiles, removeFile, removeRejected, progressOf }
}
