import { describe, expect, it, vi } from 'vitest'
import { gateFile } from './uploadList'
import { MAX_UPLOAD_BYTES } from './config'

describe('the upload file-size gate', () => {
  const pdf = (name: string) => /\.pdf$/i.test(name)
  it('accepts a file at the limit; rejects one byte over, naming the rule', () => {
    expect(gateFile({ name: 'a.pdf', size: MAX_UPLOAD_BYTES }, pdf)).toBeNull()
    expect(gateFile({ name: 'a.pdf', size: MAX_UPLOAD_BYTES + 1 }, pdf)).toBe('over_limit')
  })
  it('rejects a wrong type before sizing it', () => {
    expect(gateFile({ name: 'notes.txt', size: 10 }, pdf)).toBe('wrong_type')
  })
  it('without an accept predicate only the size rule applies', () => {
    expect(gateFile({ name: 'anything.bin', size: 10 })).toBeNull()
  })
})

describe('the upload progress simulation', () => {
  // Contract guard, NOT a reproduction: the v1.8 stall (an impure updater
  // clearing its interval on one invocation while React committed another
  // invocation's sub-100 value) reproduced only in a real browser (about 1
  // in 8 e2e runs of the question-file intake), not in jsdom. The fix — pure
  // updaters, the step decided once in the interval callback — was verified
  // there; this pins the observable contract.
  it('every accepted file lands at 100 under StrictMode', async () => {
    const { StrictMode, createElement } = await import('react')
    const { act, renderHook } = await import('@testing-library/react')
    const { useUploadList } = await import('./uploadList')
    vi.useFakeTimers()
    try {
      // many rolls of the random step: a stall needs just one unlucky tick
      for (let run = 0; run < 25; run++) {
        const { result, unmount } = renderHook(() => useUploadList(), {
          wrapper: ({ children }) => createElement(StrictMode, null, children),
        })
        const file = new File([new Uint8Array(10)], `f${run}.pdf`)
        act(() => result.current.addFiles([file]))
        expect(result.current.progressOf(result.current.files[0])).toBeLessThan(100)
        act(() => void vi.advanceTimersByTime(140 * 12))
        expect(result.current.progressOf(result.current.files[0])).toBe(100)
        unmount()
      }
    } finally {
      vi.useRealTimers()
    }
  })

  it('dedupes by name + size and removes cleanly', async () => {
    const { act, renderHook } = await import('@testing-library/react')
    const { useUploadList } = await import('./uploadList')
    const { result } = renderHook(() => useUploadList())
    const a = new File([new Uint8Array(10)], 'a.pdf')
    act(() => result.current.addFiles([a, new File([new Uint8Array(10)], 'a.pdf')]))
    expect(result.current.files).toHaveLength(1)
    act(() => result.current.removeFile(result.current.files[0]))
    expect(result.current.files).toHaveLength(0)
    act(() => result.current.addFiles([a]))
    expect(result.current.files).toHaveLength(1)
  })
})
