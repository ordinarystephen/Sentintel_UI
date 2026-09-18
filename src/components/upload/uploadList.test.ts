import { describe, expect, it } from 'vitest'
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
