import fs from 'node:fs'
import path from 'node:path'
import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import type { VantageBlock } from '@/api/types'
import { BlockRenderer } from './BlockRenderer'
import { renderableFigures } from './blockContract'
import { deriveDocMeta } from './docMeta'

describe('the block contract', () => {
  it('a figure without a derivation must not render', () => {
    const items = [
      { label: 'Good', value: '3 of 42', derivation: 'names with exposure > 25.0m' },
      { label: 'Bad', value: '21.6m', derivation: '' },
      { label: 'Worse', value: '9', derivation: '   ' },
    ]
    expect(renderableFigures(items).map((f) => f.label)).toEqual(['Good'])
    render(<BlockRenderer blocks={[{ type: 'figures', items }]} />)
    expect(screen.getByText('3 of 42')).toBeInTheDocument()
    expect(screen.queryByText('21.6m')).toBeNull()
  })

  it('an unknown block type renders the honest labeled fallback — never a broken state, never skipped', () => {
    const blocks = [
      { type: 'prose', paragraphs: ['Known content.'] },
      { type: 'hologram', payload: { spin: true } } as unknown as VantageBlock,
    ] as VantageBlock[]
    render(<BlockRenderer blocks={blocks} />)
    expect(screen.getByText('Known content.')).toBeInTheDocument()
    expect(screen.getByRole('note')).toHaveTextContent(
      "This answer contains a content type this version can't display.",
    )
  })

  it('table cells flag amber only when the payload says needs-you', () => {
    render(
      <BlockRenderer
        blocks={[
          {
            type: 'table',
            columns: [{ key: 'a', label: 'A' }],
            rows: [{ a: 'fine' }, { a: { value: 'No approval found', warn: true } }],
          },
        ]}
      />,
    )
    expect(screen.getByText('No approval found').className).toMatch(/text-warn/)
    expect(screen.getByText('fine').className).not.toMatch(/text-warn/)
  })
})

describe('upload kind/meta derivation', () => {
  it('derives kind from the extension and meta from size', () => {
    expect(deriveDocMeta('Exposure_Register_FY25.csv', 18_432)).toMatchObject({
      kind: 'csv',
      meta: '43 rows',
    })
    expect(deriveDocMeta('Policy.pdf', 1_258_291)).toMatchObject({ kind: 'pdf', meta: '14 pages' })
    expect(deriveDocMeta('Minutes.docx', 88_000)).toMatchObject({ kind: 'docx', meta: '1 pages' })
    expect(deriveDocMeta('notes.txt', 10)).toBeNull()
  })
})

describe('the no-repository guard (hold the line)', () => {
  it('nothing under src/screens/vantage touches the repository or its picker', () => {
    const dir = path.dirname(new URL(import.meta.url).pathname)
    const offenders: string[] = []
    for (const f of fs.readdirSync(dir)) {
      if (!/\.tsx?$/.test(f) || f.endsWith('.test.tsx')) continue
      const text = fs.readFileSync(path.join(dir, f), 'utf8')
      if (/searchRepository|RepositoryPicker/.test(text)) offenders.push(f)
    }
    expect(offenders).toEqual([])
  })
})
