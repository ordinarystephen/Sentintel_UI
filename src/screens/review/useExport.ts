/**
 * Export Review behaviour (§5.3): success downloads the rendered document and
 * toasts the file name; failure surfaces the API message as toast + inline
 * message — never a raw error page.
 */
import { useState } from 'react'
import { useReviewMutations } from '@/api/hooks'
import { useToast } from '@/components/toastContext'
import { strings } from '@/strings'
import { fmt } from '@/lib/fmt'

function download(blob: Blob, fileName: string) {
  if (typeof URL.createObjectURL !== 'function') return
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = fileName
  document.body.appendChild(a)
  a.click()
  a.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 1000)
}

export function useExport(reviewId: string) {
  const { exportReview } = useReviewMutations(reviewId)
  const { toast } = useToast()
  const [error, setError] = useState<string | null>(null)
  const run = () => {
    setError(null)
    exportReview.mutate(undefined, {
      onSuccess: (res) => {
        download(res.blob, res.fileName)
        toast({
          message: fmt(strings.review.exported, { fileName: res.fileName }),
          tone: 'success',
        })
      },
      onError: (e) => {
        setError((e as Error).message)
        toast({ message: (e as Error).message, tone: 'error' })
      },
    })
  }
  return { run, pending: exportReview.isPending, error }
}
