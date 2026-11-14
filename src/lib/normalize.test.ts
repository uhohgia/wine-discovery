import { describe, expect, it } from 'vitest'
import { foldText } from './normalize'

describe('foldText', () => {
  it('folds case, diacritics and punctuation', () => {
    expect(foldText("Château d'Yquem!")).toBe('chateau d yquem')
    expect(foldText('  Domaine   TEMPIER ')).toBe('domaine tempier')
    expect(foldText('Müller-Catoir')).toBe('muller catoir')
  })
  it('treats & as "and" and collapses spacing', () => {
    expect(foldText('Ernst & Young')).toBe('ernst and young')
    expect(foldText('a   b\t c')).toBe('a b c')
  })
  it('keeps numbers and handles empty input', () => {
    expect(foldText('Sample Red 3')).toBe('sample red 3')
    expect(foldText('')).toBe('')
  })
})
