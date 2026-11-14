import { describe, expect, it } from 'vitest'
import { GLOSSARY, NOTE_IDS } from '@/data/glossary'
import { SEED_BOTTLES } from '@/data/bottles'
import { TYPES } from '@/data/vocab'
import { searchBottles } from './searchBottles'

const names = (q: string) => searchBottles(SEED_BOTTLES, q).map((b) => b.name)

describe('searchBottles', () => {
  it('returns everything for an empty search', () => {
    expect(searchBottles(SEED_BOTTLES, '  ')).toHaveLength(10)
  })
  it('finds by name or producer, ignoring case, accents and punctuation', () => {
    expect(names('sample red 3')).toEqual(['Sample Red 3'])
    expect(names('SAMPLE-ROSE')[0]).toBe('Sample Rosé 1') // other bottles with rose-scented notes can follow
    expect(names('placeholder')).toHaveLength(10)
  })
  it('finds by everyday description', () => {
    expect(names('bubbly')).toEqual(['Sample Bubbly 1'])
    expect(names('light red')[0]).toBe('Sample Red 1') // the red comes first; a rosé with red-berry flavors may follow
    expect(names('crisp')).toEqual(expect.arrayContaining(['Sample White 1', 'Sample Bubbly 1']))
    expect(names('bold')).toEqual(expect.arrayContaining(['Sample Red 3']))
  })
  it('finds by flavor and by food', () => {
    expect(names('strawberry')).toEqual(expect.arrayContaining(['Sample Red 1']))
    expect(names('spicy takeout')).toEqual(['Sample White 2'])
    expect(names('steak')).toEqual(['Sample Red 3'])
  })
  it('matches the start of words, so a number does not hit a vintage', () => {
    expect(names('sample red 3')).toEqual(['Sample Red 3'])
    expect(names('rose')).toEqual(expect.arrayContaining(['Sample Rosé 1', 'Sample Red 1']))
  })
  it('needs every word to match, and says nothing for nonsense', () => {
    expect(names('light bold')).toEqual([])
    expect(names('zzzz')).toEqual([])
  })
})

describe('glossary', () => {
  it('has a plain-language entry for every flavor note and every wine type', () => {
    for (const id of [...NOTE_IDS, ...TYPES]) expect(GLOSSARY[id], id).toBeDefined()
  })
  it('explains each of the four feel words, with the technical name one tap away', () => {
    expect(GLOSSARY.tannin!.alsoCalled).toBe('tannin')
    expect(GLOSSARY.acidity!.alsoCalled).toBe('acidity')
    expect(GLOSSARY.body).toBeDefined()
    expect(GLOSSARY.sweetness).toBeDefined()
  })
  it('keeps definitions short and friendly', () => {
    for (const [id, e] of Object.entries(GLOSSARY)) {
      expect(e.plain.length, id).toBeLessThan(200)
      expect(e.plain.trim().length, id).toBeGreaterThan(10)
    }
  })
})
