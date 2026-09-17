import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { renderAt } from '@/test/renderAt'

const pdf = (name: string, size = 500_000) =>
  new File([new Uint8Array(size)], name, { type: 'application/pdf' })

describe('landing', () => {
  it('shows the hero copy, no metadata form, and recents', async () => {
    renderAt('/crr')
    expect(screen.getByRole('heading', { level: 1 })).toHaveTextContent('Start a review')
    expect(screen.getByRole('button', { name: 'Upload documents' })).toBeInTheDocument()
    expect(screen.getByLabelText('Anything Sentinel should know?')).toBeInTheDocument()
    expect(screen.queryByLabelText(/borrower/i)).toBeNull()
    const recent = await screen.findByRole('link', { name: /Veyland US Holdco LLC/ })
    expect(within(recent).getByText('4 open')).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Ambervale Foods Group/ })).toHaveTextContent(
      '6/6 sections',
    )
  })

  it('accepts PDFs (and only PDFs), lists chips with size, and removes them', async () => {
    const user = userEvent.setup({ applyAccept: false })
    renderAt('/crr')
    const input = screen.getByLabelText('Choose PDF files')
    await user.upload(input, [
      pdf('Veyland_Holdco_Annual_Review_FY25.pdf', 2_516_582),
      new File(['x'], 'notes.txt', { type: 'text/plain' }),
    ])
    const list = screen.getByRole('list', { name: 'Documents to review' })
    expect(within(list).getByText('Veyland_Holdco_Annual_Review_FY25.pdf')).toBeInTheDocument()
    expect(within(list).getByText('2.4 MB')).toBeInTheDocument()
    expect(screen.getByRole('alert')).toHaveTextContent('notes.txt')
    expect(screen.getByText('1 document')).toBeInTheDocument()
    await user.click(
      screen.getByRole('button', { name: 'Remove file Veyland_Holdco_Annual_Review_FY25.pdf' }),
    )
    expect(screen.queryByRole('list', { name: 'Documents to review' })).toBeNull()
  })

  it('Begin with nothing added surfaces the API message; Begin with files lands on the processing state', async () => {
    const user = userEvent.setup()
    renderAt('/crr')
    await user.click(screen.getByRole('button', { name: 'Begin review' }))
    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Add at least one PDF to begin a review.',
    )

    await user.upload(screen.getByLabelText('Choose PDF files'), [
      pdf('Acme_Annual.pdf'),
      pdf('Acme_Q3.pdf'),
    ])
    await user.type(
      screen.getByLabelText('Anything Sentinel should know?'),
      'Focus on covenant headroom.',
    )
    await user.click(screen.getByRole('button', { name: 'Begin review' }))
    await waitFor(() =>
      expect(screen.getByRole('heading', { level: 2 })).toHaveTextContent('Reading the documents'),
    )
    expect(screen.getByText('Acme_Annual.pdf · Acme_Q3.pdf')).toBeInTheDocument()
    expect(screen.getByText(/^Reading Acme_Annual.pdf…$/)).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Cancel this review' })).toBeInTheDocument()
    // the rail's contextual zone shows the unnamed review
    expect(screen.getByRole('region', { name: 'New review — reading…' })).toBeInTheDocument()
  })

  it('advanced extraction settings are demoted behind the link and persist', async () => {
    const user = userEvent.setup()
    renderAt('/crr')
    expect(screen.queryByLabelText('Parser')).toBeNull()
    await user.click(screen.getByRole('button', { name: 'Advanced extraction settings' }))
    await user.selectOptions(screen.getByLabelText('Parser'), 'docling')
    expect(JSON.parse(localStorage.getItem('sentinel.extraction.settings')!)).toMatchObject({
      parser: 'docling',
    })
  })
})
