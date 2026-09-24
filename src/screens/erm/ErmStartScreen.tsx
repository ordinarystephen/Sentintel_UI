/**
 * Start — CPEA's "Start a portfolio analysis" and Inquiry's "Ask a
 * question of the portfolio": ONE screen, configured per application
 * (concept pin E6: the suite's three-beat arc; the monitor is a result,
 * not a home). The question (CPEA: the question-set slot — prompt only
 * OR a saved set; Inquiry, question sets off: the prompt box alone), the
 * documents (optional — upload or the shared repository picker), the
 * population (demo feedback round: an optional borrower scope leads it;
 * choosing one stands the four placeholder dropdowns down — pin E7 for
 * their vocabulary), a scope-preview line resolved on system, and Run.
 * Arriving from Documents' "Ask about this borrower →" pre-sets the scope
 * (router state).
 */
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { usePortfolioMutations, useResolvePopulation } from '@/api/hooks'
import type { BorrowerRef, PopulationCriteria, RepositoryDoc } from '@/api/types'
import { Button } from '@/components/Button'
import { RepositoryPicker } from '@/components/viewers/RepositoryPicker'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'
import { BorrowerScope } from './BorrowerScope'
import { POP_VOCAB } from './config'
import { usePortfolioApp } from './portfolioApp'
import { scopeLabel } from './runModel'

function PopSelect({
  label,
  options,
  value,
  onChange,
  disabled,
}: {
  label: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
  disabled: boolean
}) {
  return (
    <div>
      <label className="micro mb-[5px] block">{label}</label>
      <select
        aria-label={label}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className="w-full rounded-[7px] border border-rule-strong bg-bg px-2 py-[7px] text-[0.78125rem] text-ink-soft"
      >
        {options.map((o) => (
          <option key={o}>{o}</option>
        ))}
      </select>
    </div>
  )
}

function ZoneHeading({ title, aside }: { title: string; aside: string }) {
  return (
    <div className="mt-[26px] mb-2.5 flex items-baseline gap-2.5">
      <h3 className="font-display text-[1rem] font-semibold">{title}</h3>
      <span className="text-dense text-faint">{aside}</span>
    </div>
  )
}

export function ErmStartScreen() {
  const app = usePortfolioApp()
  const s = app.copy.start
  const navigate = useNavigate()
  const location = useLocation()
  const m = usePortfolioMutations(app.id)
  // The question-set control exists only where the app config turns it on
  // AND the route configuration wired it in (Inquiry: neither).
  const QuestionSets = app.config.questionSets ? app.slots.QuestionSets : undefined
  const [mode, setMode] = useState<'oneoff' | 'set'>('oneoff')
  const [prompt, setPrompt] = useState('')
  const [setId, setSetId] = useState<string>('qs-quarterly-pulse')
  const [files, setFiles] = useState<File[]>([])
  const [picked, setPicked] = useState<RepositoryDoc[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const populationRef = useRef<HTMLDivElement>(null)
  const arrivedWith = (location.state as { borrower?: BorrowerRef } | null)?.borrower ?? null
  const [borrower, setBorrower] = useState<BorrowerRef | null>(arrivedWith)
  const [criteria, setCriteria] = useState<PopulationCriteria>({
    portfolio: 'IB Lending',
    subPortfolio: 'All sub-portfolios',
    region: 'All regions',
    asOf: 'Latest on system',
  })
  // a chosen borrower IS the population; the dropdown values are carried, not applied
  const scoped = useMemo<PopulationCriteria>(
    () => (borrower ? { ...criteria, borrower } : criteria),
    [criteria, borrower],
  )
  const pop = useResolvePopulation(scoped)

  // arriving pre-scoped from Documents: bring the population zone into view,
  // and consume the router state — a scope the user then clears must not
  // come back on reload or Back
  useEffect(() => {
    if (!arrivedWith) return
    populationRef.current?.scrollIntoView?.({ block: 'center' })
    navigate(location.pathname, { replace: true, state: null })
  }, [arrivedWith, navigate, location.pathname])

  const attachedNames = useMemo(
    () => [...files.map((f) => f.name), ...picked.map((p) => p.fileName)],
    [files, picked],
  )
  const set = (k: keyof PopulationCriteria) => (v: string) => setCriteria((c) => ({ ...c, [k]: v }))

  async function go() {
    const setRun = !!QuestionSets && mode === 'set'
    // nothing to ask: say so in THIS application's words, before the seam does
    if (!setRun && !prompt.trim()) {
      setError(s.needsQuestion)
      return
    }
    setError(null)
    try {
      const { runId } = await m.startRun.mutateAsync(
        setRun
          ? { questionSetId: setId, criteria: scoped, documents: attachedNames }
          : { prompt, criteria: scoped, documents: attachedNames },
      )
      navigate(`${app.base}/runs/${runId}`)
    } catch (e) {
      setError((e as Error).message)
    }
  }

  const promptBox = (
    <textarea
      aria-label={s.promptAria}
      value={prompt}
      onChange={(e) => {
        setPrompt(e.target.value)
        setError(null)
      }}
      placeholder={s.promptPlaceholder}
      className="mt-3 min-h-[76px] w-full resize-y rounded-lg border border-rule-strong bg-bg px-3 py-2.5 text-[0.8125rem]"
    />
  )

  // the resolve line names what WAS resolved, so the scope and its counts never disagree
  const resolved = pop.data?.population
  return (
    <div className="settle">
      <div>
        <h1 className="font-display text-[1.375rem] font-semibold tracking-display">{s.title}</h1>
        <p className="mb-5 max-w-[56ch] text-ui-sm text-muted">{s.sub}</p>
      </div>

      <div>
        <ZoneHeading title={s.questionZone} aside={s.questionAside} />
        {QuestionSets ? (
          <QuestionSets
            mode={mode}
            onModeChange={(next) => {
              setMode(next)
              setError(null)
            }}
            selectedId={setId}
            onSelect={(id) => {
              setSetId(id)
              setError(null)
            }}
            prompt={promptBox}
          />
        ) : (
          promptBox
        )}
      </div>

      <div>
        <ZoneHeading title={s.documentsZone} aside={s.documentsAside} />
        <div
          role="button"
          tabIndex={0}
          aria-label={s.dropAria}
          onClick={() => fileInput.current?.click()}
          onKeyDown={(e) => {
            if (e.key === 'Enter' || e.key === ' ') {
              e.preventDefault()
              fileInput.current?.click()
            }
          }}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => {
            e.preventDefault()
            setFiles((f) => [...f, ...Array.from(e.dataTransfer.files)])
          }}
          className="cursor-pointer rounded-xl border-[1.5px] border-dashed border-rule-strong bg-bg-subtle px-[18px] py-5 text-center hover:border-faint hover:bg-bg-hover"
        >
          <div className="text-[0.84375rem] font-semibold">
            {attachedNames.length > 0
              ? fmt(s.attached, {
                  files: plural(attachedNames.length, s.filesOne, s.filesOther),
                })
              : s.dropTitle}
          </div>
          <div className="mt-0.5 text-[0.78125rem] text-muted">
            {s.dropBrowse}{' '}
            <button
              type="button"
              className="underline underline-offset-2"
              onClick={(e) => {
                e.stopPropagation()
                setPickerOpen(true)
              }}
            >
              {s.dropRepo}
            </button>
          </div>
          <input
            ref={fileInput}
            type="file"
            hidden
            multiple
            accept=".pdf,.docx,.xlsx"
            onChange={(e) => setFiles((f) => [...f, ...Array.from(e.target.files ?? [])])}
          />
        </div>
      </div>

      {/* the borrower typeahead's list overlays the blocks below this zone */}
      <div ref={populationRef} className="relative z-10">
        <ZoneHeading title={s.populationZone} aside={s.populationAside} />
        <BorrowerScope value={borrower} onChange={setBorrower} />
        {/* Option lists are placeholder vocabulary — see POP_VOCAB in ./config.
            A chosen borrower stands them down: dimmed AND disabled. */}
        <div
          data-testid="population-dropdowns"
          data-stood-down={borrower ? 'true' : undefined}
          className={cx(
            'grid grid-cols-4 gap-3 max-[900px]:grid-cols-2',
            borrower && 'pointer-events-none opacity-40',
          )}
        >
          <PopSelect
            label={s.popPortfolio}
            options={POP_VOCAB.portfolio}
            value={criteria.portfolio}
            onChange={set('portfolio')}
            disabled={!!borrower}
          />
          <PopSelect
            label={s.popSubPortfolio}
            options={POP_VOCAB.subPortfolio}
            value={criteria.subPortfolio}
            onChange={set('subPortfolio')}
            disabled={!!borrower}
          />
          <PopSelect
            label={s.popRegion}
            options={POP_VOCAB.region}
            value={criteria.region}
            onChange={set('region')}
            disabled={!!borrower}
          />
          <PopSelect
            label={s.popAsOf}
            options={POP_VOCAB.asOf}
            value={criteria.asOf}
            onChange={set('asOf')}
            disabled={!!borrower}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-[0.75rem] text-muted" data-testid="scope-line">
          {resolved &&
            pop.data &&
            fmt(s.scopeLine, {
              scope: scopeLabel(resolved.criteria, s.borrowerScope),
              borrowers: plural(resolved.included.length, s.borrowersOne, s.borrowersOther),
              documents: plural(
                pop.data.documentCount,
                app.copy.documents.docsOne,
                app.copy.documents.docsOther,
              ),
            })}
        </span>
        <span className="flex-1" />
        <Button variant="primary" disabled={m.startRun.isPending} onClick={go}>
          {s.run}
        </Button>
      </div>
      {error && (
        <p role="alert" className="mt-2 text-right text-ui-sm text-error">
          {error}
        </p>
      )}

      <p className="mt-[30px] border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
        {strings.suite.fictionalNote}
      </p>

      {pickerOpen && (
        <RepositoryPicker
          onClose={() => setPickerOpen(false)}
          onDone={(docs) => {
            setPicked((p) => {
              const have = new Set(p.map((x) => x.repoId))
              return [...p, ...docs.filter((d) => !have.has(d.repoId))]
            })
            setPickerOpen(false)
          }}
        />
      )}
    </div>
  )
}
