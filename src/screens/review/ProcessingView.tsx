/**
 * The processing state of `/review/:id` (build-spec §5.2): calm and ambient —
 * mono doc names, serif-italic "Reading the documents", one thin bar, ONE
 * status line cycling coarse phases. No pipeline anatomy, no percentages.
 * Failures interrupt loudly with the backend's message.
 */
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import { useReviewMutations } from '@/api/hooks'
import type { ProcessingReview } from '@/api/types'
import { useRegisterCurrentReview, type CurrentReview } from '@/app/ShellContext'
import { ErrorBanner } from '@/components/Banner'
import { Button } from '@/components/Button'
import { SECTIONS } from '@/lib/sections'
import { strings } from '@/strings'

const WIDTH: Record<ProcessingReview['phase'], string> = {
  reading: '22%',
  indexing: '58%',
  policy_checks: '86%',
}

export function ProcessingView({ record }: { record: ProcessingReview }) {
  const s = strings.processing
  const { cancel } = useReviewMutations(record.id)
  const current = useMemo<CurrentReview>(
    () => ({
      id: record.id,
      name: record.borrowerName ?? strings.landing.newReview,
      openItems: 0,
      sections: SECTIONS.map((x) => ({ n: x.n, status: 'pending' as const })),
    }),
    [record.id, record.borrowerName],
  )
  useRegisterCurrentReview(current)

  return (
    <div className="mx-auto mt-[90px] max-w-[460px] text-center">
      <p className="mb-[26px] font-mono text-[12px] text-faint">
        {record.documents.map((d) => d.fileName).join(' · ')}
      </p>
      {record.status === 'failed' ? (
        <div className="text-left">
          <ErrorBanner
            eyebrow={s.failedEyebrow}
            message={record.error?.message ?? 'Processing failed.'}
          />
          <Link to="/" className="mt-4 inline-block text-[12px] underline underline-offset-2">
            {s.startAnother}
          </Link>
        </div>
      ) : record.status === 'cancelled' ? (
        <div>
          <p className="text-ui text-muted">{s.cancelled}</p>
          <Link to="/" className="mt-4 inline-block text-[12px] underline underline-offset-2">
            {s.startAnother}
          </Link>
        </div>
      ) : (
        <>
          <h2 className="mb-[22px] font-display text-[19px] font-normal tracking-[0.01em] text-ink-soft italic">
            {s.title}
          </h2>
          <div className="mb-3.5 h-[3px] overflow-hidden rounded-sm bg-rule" aria-hidden="true">
            <div
              className="h-full rounded-sm bg-ink transition-[width] duration-[1200ms] ease-out"
              style={{ width: WIDTH[record.phase] }}
            />
          </div>
          <p className="text-ui-sm text-muted" aria-live="polite">
            {record.statusLine}
          </p>
          <p className="mt-[34px] text-[12px] leading-[1.6] text-faint">{s.away}</p>
          <div className="mt-[18px]">
            <Button variant="quiet" onClick={() => cancel.mutate()} disabled={cancel.isPending}>
              {s.cancel}
            </Button>
          </div>
          {cancel.error && (
            <p role="alert" className="mt-2 text-ui-sm text-error">
              {(cancel.error as Error).message}
            </p>
          )}
        </>
      )}
    </div>
  )
}
