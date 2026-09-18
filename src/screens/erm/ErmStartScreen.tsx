/**
 * ERM start — "Start a portfolio analysis" (concept pin E6: the suite's
 * three-beat arc; the monitor is a result, not a home). The question
 * (prompt + question set, combinable), the documents (optional — upload
 * or the shared repository picker), the population (labeled dropdowns
 * whose vocabulary is a deliberate placeholder — pin E7), a scope-preview
 * line resolved on system, and Run analysis.
 */
import { useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQuestionSets, useResolvePopulation, useErmMutations } from '@/api/hooks'
import type { PopulationCriteria, RepositoryDoc } from '@/api/types'
import { Button } from '@/components/Button'
import { RepositoryPicker } from '@/components/viewers/RepositoryPicker'
import { cx } from '@/lib/cx'
import { fmt, plural } from '@/lib/fmt'
import { strings } from '@/strings'
import { AddQuestionSetModal } from './AddQuestionSetModal'
import { POP_VOCAB } from './config'

const s = strings.erm.start

function PopSelect({
  label,
  options,
  value,
  onChange,
}: {
  label: string
  options: readonly string[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div>
      <label className="micro mb-[5px] block">{label}</label>
      <select
        aria-label={label}
        value={value}
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
  const navigate = useNavigate()
  const sets = useQuestionSets()
  const m = useErmMutations()
  const [mode, setMode] = useState<'prompt' | 'qset'>('prompt')
  const [prompt, setPrompt] = useState('')
  const [setId, setSetId] = useState<string>('qs-quarterly-pulse')
  const [addOpen, setAddOpen] = useState(false)
  const [files, setFiles] = useState<File[]>([])
  const [picked, setPicked] = useState<RepositoryDoc[]>([])
  const [pickerOpen, setPickerOpen] = useState(false)
  const fileInput = useRef<HTMLInputElement>(null)
  const [criteria, setCriteria] = useState<PopulationCriteria>({
    portfolio: 'IB Lending',
    subPortfolio: 'All sub-portfolios',
    region: 'All regions',
    asOf: 'Latest on system',
  })
  const pop = useResolvePopulation(criteria)

  const attachedNames = useMemo(
    () => [...files.map((f) => f.name), ...picked.map((p) => p.fileName)],
    [files, picked],
  )
  const set = (k: keyof PopulationCriteria) => (v: string) => setCriteria((c) => ({ ...c, [k]: v }))

  async function go() {
    const { runId } = await m.startRun.mutateAsync({
      questionSetId: mode === 'qset' ? setId : 'qs-quarterly-pulse',
      prompt: mode === 'prompt' ? prompt.trim() || undefined : undefined,
      criteria,
      documents: attachedNames,
    })
    navigate(`/erm/runs/${runId}`)
  }

  const scopeText = `${criteria.portfolio} · ${criteria.subPortfolio} · ${criteria.region}`
  return (
    <div className="settle">
      <div>
        <h1 className="font-display text-[1.375rem] font-semibold tracking-display">{s.title}</h1>
        <p className="mb-5 max-w-[56ch] text-ui-sm text-muted">{s.sub}</p>
      </div>

      <div>
        <ZoneHeading title={s.questionZone} aside={s.questionAside} />
        <div
          role="radiogroup"
          aria-label={s.modeAria}
          className="inline-flex gap-[3px] rounded-[9px] border border-rule bg-bg-subtle p-[3px]"
        >
          {(
            [
              ['prompt', s.modePrompt],
              ['qset', s.modeQset],
            ] as const
          ).map(([id, label]) => (
            <button
              key={id}
              type="button"
              role="radio"
              aria-checked={mode === id}
              onClick={() => setMode(id)}
              className={cx(
                'rounded-[7px] px-[18px] py-[7px] text-[0.8125rem] font-medium text-muted',
                mode === id && 'bg-bg font-semibold text-ink shadow-sm',
              )}
            >
              {label}
            </button>
          ))}
        </div>
        {mode === 'prompt' ? (
          <textarea
            aria-label={s.promptAria}
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder={s.promptPlaceholder}
            className="mt-3 min-h-[76px] w-full resize-y rounded-lg border border-rule-strong bg-bg px-3 py-2.5 text-[0.8125rem]"
          />
        ) : (
          <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(240px,1fr))] gap-2.5">
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center justify-center gap-2 rounded-[10px] border border-dashed border-rule bg-bg-subtle px-3.5 py-[9px] text-muted hover:text-ink"
            >
              <span className="text-[1.25rem] leading-none">＋</span>
              <span className="text-[0.8125rem] font-semibold">{s.addNew}</span>
              <span className="text-dense text-faint">{s.addNewHint}</span>
            </button>
            {(sets.data ?? []).map((q) => (
              <button
                key={q.id}
                type="button"
                aria-pressed={setId === q.id}
                onClick={() => setSetId(q.id)}
                className={cx(
                  'rounded-[10px] border border-rule bg-bg px-3.5 py-[9px] text-left transition-[box-shadow,border-color] duration-150 hover:border-rule-strong hover:shadow-md',
                  setId === q.id && 'border-primary shadow-[0_0_0_1px_var(--primary)]',
                )}
              >
                <h4 className="font-display text-[0.875rem] font-semibold">{q.name}</h4>
                <p className="line-clamp-2 text-dense text-muted">{q.description}</p>
              </button>
            ))}
          </div>
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

      <div>
        <ZoneHeading title={s.populationZone} aside={s.populationAside} />
        {/* Option lists are placeholder vocabulary — see POP_VOCAB in ./config. */}
        <div className="grid grid-cols-4 gap-3 max-[900px]:grid-cols-2">
          <PopSelect
            label={s.popPortfolio}
            options={POP_VOCAB.portfolio}
            value={criteria.portfolio}
            onChange={set('portfolio')}
          />
          <PopSelect
            label={s.popSubPortfolio}
            options={POP_VOCAB.subPortfolio}
            value={criteria.subPortfolio}
            onChange={set('subPortfolio')}
          />
          <PopSelect
            label={s.popRegion}
            options={POP_VOCAB.region}
            value={criteria.region}
            onChange={set('region')}
          />
          <PopSelect
            label={s.popAsOf}
            options={POP_VOCAB.asOf}
            value={criteria.asOf}
            onChange={set('asOf')}
          />
        </div>
      </div>

      <div className="mt-5 flex flex-wrap items-center gap-2">
        <span className="text-[0.75rem] text-muted">
          {pop.data &&
            fmt(s.scopeLine, {
              scope: scopeText,
              borrowers: plural(
                pop.data.population.included.length,
                s.borrowersOne,
                s.borrowersOther,
              ),
              documents: plural(
                pop.data.documentCount,
                strings.erm.documents.docsOne,
                strings.erm.documents.docsOther,
              ),
            })}
        </span>
        <span className="flex-1" />
        <Button variant="primary" disabled={m.startRun.isPending} onClick={go}>
          {s.run}
        </Button>
      </div>

      <p className="mt-[30px] border-t border-rule pt-3 text-micro normal-case tracking-normal text-faint">
        {strings.suite.fictionalNote}
      </p>

      {addOpen && <AddQuestionSetModal onClose={() => setAddOpen(false)} />}
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
