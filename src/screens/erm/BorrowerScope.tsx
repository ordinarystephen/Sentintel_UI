/**
 * Borrower scope (demo feedback round; concept pin E15, "one borrower is a
 * population too"): the optional field that leads the population zone —
 * a typeahead over the borrower index by the ratified search keys (name
 * or RXM). Choosing a borrower replaces the input with the chip (serif
 * name · mono RXM · clear ✕); the caller stands the four dropdowns down
 * and the run's population becomes that borrower. Clearing restores the
 * full scope. Shared by every application running the CPEA workflow.
 *
 * WAI-ARIA combobox (list autocomplete): ArrowDown/ArrowUp move the active
 * option, Enter picks it, Escape and blur close the list. Focus moves to
 * the chip's ✕ after picking and back to the input after clearing.
 */
import { useEffect, useId, useRef, useState, type ReactNode } from 'react'
import { useBorrowerSearch } from '@/api/hooks'
import type { BorrowerIndexEntry, BorrowerRef } from '@/api/types'
import { cx } from '@/lib/cx'
import { useDebouncedValue } from '@/lib/useDebouncedValue'
import { usePortfolioApp } from './portfolioApp'

export function BorrowerScope({
  value,
  onChange,
}: {
  value: BorrowerRef | null
  onChange: (borrower: BorrowerRef | null) => void
}) {
  const s = usePortfolioApp().copy.start
  const [query, setQuery] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const debounced = useDebouncedValue(query.trim(), 120)
  const results = useBorrowerSearch(debounced, debounced.length > 0)
  const options: BorrowerIndexEntry[] = debounced ? (results.data ?? []) : []
  const inputId = useId()
  const listId = useId()
  const inputRef = useRef<HTMLInputElement>(null)
  const clearRef = useRef<HTMLButtonElement>(null)
  const focusNext = useRef<'clear' | 'input' | null>(null)

  // after pick/clear the focused element is replaced — move focus on
  useEffect(() => {
    if (focusNext.current === 'clear') clearRef.current?.focus()
    else if (focusNext.current === 'input') inputRef.current?.focus()
    focusNext.current = null
  })

  const showList = open && query.trim().length > 0

  function pick(b: BorrowerIndexEntry) {
    focusNext.current = 'clear'
    setOpen(false)
    setQuery('')
    onChange({ rxm: b.rxm, name: b.name })
  }

  function clear() {
    focusNext.current = 'input'
    onChange(null)
  }

  if (value)
    return (
      <Frame inputId={inputId}>
        <span
          data-testid="borrower-chip"
          className="inline-flex items-center gap-[9px] rounded-full border border-rule-strong bg-bg py-1.5 pr-2 pl-3.5 text-[0.8125rem]"
        >
          <b className="font-display font-semibold">{value.name}</b>
          <span className="font-mono text-[0.75rem] text-muted">{value.rxm}</span>
          <button
            ref={clearRef}
            type="button"
            aria-label={s.borrowerClear}
            onClick={clear}
            className="grid h-5 w-5 place-items-center rounded-full leading-none text-faint hover:bg-bg-hover hover:text-ink"
          >
            ✕
          </button>
        </span>
      </Frame>
    )

  return (
    <Frame inputId={inputId}>
      <input
        ref={inputRef}
        id={inputId}
        type="text"
        role="combobox"
        aria-label={s.borrowerAria}
        aria-expanded={showList}
        aria-controls={listId}
        aria-autocomplete="list"
        aria-activedescendant={showList && options[active] ? `${listId}-${active}` : undefined}
        autoComplete="off"
        placeholder={s.borrowerPlaceholder}
        value={query}
        onChange={(e) => {
          setQuery(e.target.value)
          setActive(0)
          setOpen(true)
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
            e.preventDefault()
            setOpen(true)
            if (options.length > 0)
              setActive(
                (i) => (i + (e.key === 'ArrowDown' ? 1 : options.length - 1)) % options.length,
              )
          } else if (e.key === 'Enter' && showList && options[active]) {
            e.preventDefault()
            pick(options[active])
          } else if (e.key === 'Escape' && showList) {
            e.preventDefault()
            setOpen(false)
          }
        }}
        className="w-full rounded-lg border border-rule-strong bg-bg px-[11px] py-2 text-[0.8125rem]"
      />
      {showList && options.length > 0 && (
        <ul
          id={listId}
          role="listbox"
          aria-label={s.borrowerListAria}
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-30 overflow-hidden rounded-[9px] border border-rule-strong bg-bg shadow-md"
        >
          {options.map((b, i) => (
            <li
              key={b.rxm}
              id={`${listId}-${i}`}
              role="option"
              aria-selected={i === active}
              // keep focus in the input so blur never eats the click
              onMouseDown={(e) => e.preventDefault()}
              onMouseEnter={() => setActive(i)}
              onClick={() => pick(b)}
              className={cx(
                'flex cursor-pointer items-baseline gap-2.5 px-[13px] py-[9px] text-[0.8125rem]',
                i === active && 'bg-bg-hover',
              )}
            >
              <b className="font-display font-semibold">{b.name}</b>
              <span className="font-mono text-[0.75rem] text-muted">{b.rxm}</span>
            </li>
          ))}
        </ul>
      )}
      {showList && results.data && !results.isPlaceholderData && options.length === 0 && (
        <p
          role="status"
          className="absolute top-[calc(100%+4px)] right-0 left-0 z-30 rounded-[9px] border border-rule-strong bg-bg px-[13px] py-[9px] text-[0.8125rem] text-faint shadow-md"
        >
          {s.borrowerNoMatch}
        </p>
      )}
    </Frame>
  )
}

/** The labelled row: "BORROWER — optional", then the 520px-max input/chip slot. */
function Frame({ inputId, children }: { inputId: string; children: ReactNode }) {
  const s = usePortfolioApp().copy.start
  return (
    <div className="relative z-[5] mt-2 mb-3.5" data-testid="borrower-scope">
      <label htmlFor={inputId} className="micro mb-[5px] block">
        {s.borrowerLabel}{' '}
        <span className="font-normal tracking-normal normal-case">{s.borrowerOptional}</span>
      </label>
      <div className="relative z-[45] max-w-[520px]">{children}</div>
    </div>
  )
}
