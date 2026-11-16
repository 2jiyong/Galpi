import { describe, expect, it } from 'vitest'
import { displayTitle } from './phraseTitle'

describe('displayTitle', () => {
  it('usesTitleWhenPresent', () => {
    expect(displayTitle({ title: '다리로 밀기', content: '팔보다 다리' })).toBe('다리로 밀기')
  })

  it('fallsBackToFirstLineOfContent', () => {
    expect(displayTitle({ title: null, content: '  첫 줄\n둘째 줄' })).toBe('첫 줄')
  })

  it('cutsLongContentAtThirtyCharacters', () => {
    expect(displayTitle({ title: null, content: '가'.repeat(31) })).toBe(`${'가'.repeat(30)}…`)
    expect(displayTitle({ title: null, content: '가'.repeat(30) })).toBe('가'.repeat(30))
  })
})
