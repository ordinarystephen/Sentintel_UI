/**
 * Command palette (refinement round — the vendored cmdk-style behavior,
 * FIRST-PARTY in-repo, re-skinned to tokens; no runtime dependency).
 * ⌘K / Ctrl-K or the masthead Search trigger; grouped Reviews / Documents
 * / Actions sourced from mock state; the ratified search keys (borrower
 * name or RXM) turned into the fastest interaction in the app.
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/api'
import { fmt } from '@/lib/fmt'
import { cx } from '@/lib/cx'
import { strings } from '@/strings'

const s = strings.palette

interface Item {
  key: string
  group: 'reviews' | 'documents' | 'actions'
  label: string
  meta?: string
  status?: string
  hay: string
  to: string
  serif?: boolean
}

function useItems(open: boolean): Item[] {
  const reviews = useQuery({
    queryKey: ['palette', 'reviews'],
    queryFn: () => api.listAllReviews({ period: 'all' }),
    enabled: open,
  })
  const docs = useQuery({
    queryKey: ['palette', 'documents'],
    queryFn: () => api.searchRepository(''),
    enabled: open,
  })
  return useMemo<Item[]>(() => {
    const out: Item[] = []
    for (const r of (reviews.data?.reviews ?? []).slice(0, 40)) {
      if (!r.borrowerName) continue
      out.push({
        key: `r:${r.id}`,
        group: 'reviews',
        label: r.borrowerName,
        meta: r.rxm ?? undefined,
        status: r.openItems > 0 ? fmt(s.statusInProgress, { n: r.openItems }) : s.statusReady,
        hay: `${r.borrowerName} ${r.rxm ?? ''}`.toLowerCase(),
        to: `/crr/review/${r.id}`,
        serif: true,
      })
    }
    for (const d of docs.data ?? []) {
      out.push({
        key: `d:${d.repoId}`,
        group: 'documents',
        label: d.fileName,
        status: d.docType,
        hay: `${d.fileName} ${d.counterparty} ${d.rxm}`.toLowerCase(),
        to: `/crr/documents?q=${encodeURIComponent(d.fileName.replace(/\.[a-z]+$/i, '').replaceAll('_', ' '))}`,
      })
    }
    const actions: Array<[string, string]> = [
      [s.actStartReview, '/crr'],
      [s.actStartAnalysis, '/erm'],
      [s.actAllReviews, '/crr/reviews/all'],
      [s.actCrrDocuments, '/crr/documents'],
      [s.actCpeaRuns, '/erm/runs'],
      [s.actPolicy, '/crr/policy'],
    ]
    for (const [label, to] of actions)
      out.push({ key: `a:${to}`, group: 'actions', label, hay: label.toLowerCase(), to })
    return out
  }, [reviews.data, docs.data])
}

export function CommandPalette({ open, onClose }: { open: boolean; onClose: () => void }) {
  const navigate = useNavigate()
  const items = useItems(open)
  const [query, setQuery] = useState('')
  const [index, setIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const listRef = useRef<HTMLDivElement>(null)

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase()
    const hit = q ? items.filter((i) => i.hay.includes(q)) : items
    // group order: Reviews, Documents, Actions
    const order = { reviews: 0, documents: 1, actions: 2 } as const
    return [...hit].sort((a, b) => order[a.group] - order[b.group]).slice(0, 24)
  }, [items, query])

  useEffect(() => {
    if (open) {
      setQuery('')
      setIndex(0)
      setTimeout(() => inputRef.current?.focus(), 0)
    }
  }, [open])
  useEffect(() => setIndex(0), [query])

  if (!open) return null

  function run(item: Item) {
    onClose()
    navigate(item.to)
  }

  function onKey(e: React.KeyboardEvent) {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      setIndex((i) => (i + (e.key === 'ArrowDown' ? 1 : visible.length - 1)) % visible.length)
      listRef.current
        ?.querySelectorAll('[role="option"]')
        [
          (index + (e.key === 'ArrowDown' ? 1 : visible.length - 1)) % visible.length
        ]?.scrollIntoView({ block: 'nearest' })
    } else if (e.key === 'Enter') {
      e.preventDefault()
      if (visible[index]) run(visible[index])
    } else if (e.key === 'Escape') {
      onClose()
    }
  }

  const groups: Array<['reviews' | 'documents' | 'actions', string]> = [
    ['reviews', s.groupReviews],
    ['documents', s.groupDocuments],
    ['actions', s.groupActions],
  ]

  const section = (id: 'reviews' | 'documents' | 'actions', label: string): ReactNode => {
    const rows = visible.filter((i) => i.group === id)
    if (rows.length === 0) return null
    return (
      <div key={id}>
        <div className="micro px-2.5 pt-2 pb-1 text-faint">{label}</div>
        {rows.map((item) => {
          const i = visible.indexOf(item)
          const selected = i === index
          return (
            <button
              key={item.key}
              type="button"
              role="option"
              aria-selected={selected}
              onMouseEnter={() => setIndex(i)}
              onClick={() => run(item)}
              className={cx(
                'flex w-full items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[0.8125rem]',
                selected && 'bg-bg-hover',
              )}
            >
              <span
                className={cx(
                  'min-w-0 truncate',
                  item.serif && 'font-display text-[0.875rem] font-semibold',
                )}
              >
                {item.group === 'documents' ? (
                  <span className="font-mono text-[0.75rem] text-ink">{item.label}</span>
                ) : (
                  item.label
                )}
              </span>
              {item.meta && (
                <span className="flex-none font-mono text-[0.75rem] text-muted">{item.meta}</span>
              )}
              {item.status && (
                <span className="ml-auto flex-none text-micro normal-case tracking-normal text-faint">
                  {item.status}
                </span>
              )}
            </button>
          )
        })}
      </div>
    )
  }

  return (
    <div
      className="fixed inset-0 z-[80] flex items-start justify-center bg-overlay px-5 pt-[12vh] pb-5"
      role="dialog"
      aria-modal="true"
      aria-label={s.triggerAria}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose()
      }}
    >
      <div className="w-full max-w-[580px] overflow-hidden rounded-xl border border-rule bg-bg shadow-md">
        <input
          ref={inputRef}
          type="text"
          role="combobox"
          aria-expanded="true"
          aria-label={s.inputAria}
          autoComplete="off"
          placeholder={s.placeholder}
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={onKey}
          className="w-full border-b border-rule bg-transparent px-[18px] py-3.5 text-[0.9375rem] outline-none"
        />
        <div
          ref={listRef}
          role="listbox"
          aria-label={s.triggerAria}
          className="max-h-[46vh] overflow-y-auto p-2"
        >
          {visible.length === 0 ? (
            <p className="px-2.5 py-3 text-ui-sm text-faint">{s.empty}</p>
          ) : (
            groups.map(([id, label]) => section(id, label))
          )}
        </div>
        <div className="flex gap-3.5 border-t border-rule px-3.5 py-2 text-micro normal-case tracking-normal text-faint">
          <span>
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> {s.navigate}
          </span>
          <span>
            <Kbd>↵</Kbd> {s.open}
          </span>
          <span>
            <Kbd>{s.kbdEsc}</Kbd> {s.close}
          </span>
        </div>
      </div>
    </div>
  )
}

function Kbd({ children }: { children: ReactNode }) {
  return (
    <kbd className="mr-0.5 rounded border border-rule-strong bg-bg-subtle px-1 font-mono text-[0.625rem]">
      {children}
    </kbd>
  )
}
