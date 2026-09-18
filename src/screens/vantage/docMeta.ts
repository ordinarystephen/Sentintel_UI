/**
 * Mock upload metadata: kind from the extension, meta derived from size
 * (pages ≈ size/90KB for text documents, rows ≈ size/430B for tabular) —
 * the same honest-approximation idiom CRR's mock upload uses.
 */
import type { VantageDocument } from '@/api/types'

export function deriveDocMeta(name: string, sizeBytes: number): VantageDocument | null {
  const ext = name.toLowerCase().match(/\.(pdf|docx|xlsx|csv)$/)?.[1] as
    VantageDocument['kind'] | undefined
  if (!ext) return null
  const meta =
    ext === 'csv' || ext === 'xlsx'
      ? `${Math.max(1, Math.round(sizeBytes / 430))} rows`
      : `${Math.max(1, Math.round(sizeBytes / 90_000))} pages`
  return { name, kind: ext, meta, sizeBytes }
}
