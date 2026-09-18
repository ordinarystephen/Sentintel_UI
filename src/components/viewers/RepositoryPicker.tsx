/**
 * Shared repository picker (v1.5) — ERM's document attach today, the
 * future CRR picker's contract too. Name/RXM search over the shared
 * repository (searchRepository seam), multi-select, attach.
 */
import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import type { RepositoryDoc } from '@/api/types'
import { Badge } from '@/components/Badge'
import { Button } from '@/components/Button'
import { Modal } from '@/components/Modal'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'

const s = strings.erm.picker

export function RepositoryPicker({
  onDone,
  onClose,
}: {
  onDone: (docs: RepositoryDoc[]) => void
  onClose: () => void
}) {
  const [query, setQuery] = useState('')
  const [selected, setSelected] = useState<Map<string, RepositoryDoc>>(new Map())
  const q = useQuery({
    queryKey: ['repository', 'picker', query],
    queryFn: () => api.searchRepository(query),
  })
  const docs = q.data ?? []
  function toggle(d: RepositoryDoc) {
    setSelected((m) => {
      const next = new Map(m)
      if (next.has(d.repoId)) next.delete(d.repoId)
      else next.set(d.repoId, d)
      return next
    })
  }
  return (
    <Modal title={s.title} closeLabel={s.close} onClose={onClose}>
      <input
        type="search"
        aria-label={s.searchAria}
        placeholder={s.searchPlaceholder}
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        className="mb-2.5 w-full rounded-lg border border-rule-strong bg-bg px-[11px] py-2 text-[0.8125rem]"
      />
      <p className="mb-3 text-dense text-faint">
        {docs.length === 0 && query ? s.empty : plural(docs.length, s.countOne, s.countOther)}
      </p>
      <div className="max-h-[320px] overflow-y-auto">
        {docs.map((d) => (
          <div
            key={d.repoId}
            className={cx(
              'mb-2 flex flex-wrap items-center gap-2 rounded-[10px] border border-rule bg-bg px-3.5 py-2.5',
              selected.has(d.repoId) && 'border-ink shadow-sm',
            )}
          >
            <span className="min-w-0 flex-1 truncate font-mono text-ui-sm font-medium">
              {d.fileName}
            </span>
            <Badge>{d.docType}</Badge>
            <span className="text-dense text-faint">{d.counterparty}</span>
            <Button variant="outline" small onClick={() => toggle(d)}>
              {selected.has(d.repoId) ? s.selected : s.select}
            </Button>
          </div>
        ))}
      </div>
      <div className="mt-4 flex justify-end gap-2">
        <Button variant="outline" small onClick={onClose}>
          {s.cancel}
        </Button>
        <Button
          variant="primary"
          small
          disabled={selected.size === 0}
          onClick={() => onDone([...selected.values()])}
        >
          {fmt(s.done, { n: selected.size })}
        </Button>
      </div>
    </Modal>
  )
}
