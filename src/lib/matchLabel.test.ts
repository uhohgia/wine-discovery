import { describe, expect, it } from 'vitest'
import { REAL_BOTTLES } from '@/data/bottles'
import { matchLabel, type LabelReading } from './matchLabel'

const r = (producer: string | null, name: string | null, vintage: number | null, type: LabelReading['type']): LabelReading => ({
  is_wine_label: true,
  producer,
  name,
  vintage,
  type,
})

// What a good reader would say after looking at the FRONT of each of your 10 bottles (their labels, as printed).
const FRONTS: [string, LabelReading][] = [
  ['moet-imperial-brut', r('Moët & Chandon', 'Impérial Brut', null, 'sparkling')],
  ['decoy-brut-cuvee', r('Decoy', 'Brut Cuvée', null, 'sparkling')],
  ['canvasback-cabernet', r('Canvasback', 'Red Mountain Cabernet Sauvignon', 2022, 'red')],
  ['goldeneye-pinot-noir', r('Goldeneye', 'Pinot Noir Anderson Valley', 2022, 'red')],
  ['story-syrah', r('Story', 'Syrah Bailey Vineyard Amador County', 2020, 'red')],
  // The Clos du Val front has no maker name, only "Estate Grown \\ Cabernet Franc 2022".
  ['clos-du-val-cabernet-franc', r(null, 'Estate Grown Cabernet Franc', 2022, 'red')],
  ['beachaven-founders-rose', r('Beachaven Vineyards & Winery', 'Founders Rosé Tennessee Table Wine', null, 'rosé')],
  ['migration-chardonnay', r('Migration', 'Chardonnay Sonoma Coast Keefer Ranch', 2023, 'white')],
  ['duckhorn-sauvignon-blanc', r('Duckhorn Vineyards', 'North Coast Sauvignon Blanc', 2025, 'white')],
  ['dr-loosen-blue-slate-riesling', r('Dr. Loosen', 'Blue Slate Riesling Kabinett Mosel', 2025, 'white')],
]

describe('matchLabel: the front of each real bottle', () => {
  it.each(FRONTS)('%s', (id, reading) => {
    const m = matchLabel(REAL_BOTTLES, reading)
    expect(m.kind).toBe('match')
    if (m.kind === 'match') expect(m.bottle.id).toBe(id)
  })

  it('still matches with only the maker and name (no year, no type)', () => {
    for (const [id, reading] of FRONTS.filter(([, x]) => x.producer !== null)) {
      const m = matchLabel(REAL_BOTTLES, { ...reading, vintage: null, type: null })
      expect(m.kind === 'match' ? m.bottle.id : m.kind, id).toBe(id)
    }
  })
})

describe('matchLabel: backs and imperfect reads', () => {
  it('matches the Clos du Val back label, which names the maker', () => {
    const m = matchLabel(REAL_BOTTLES, r('Clos du Val', 'Cabernet Franc Hirondelle Vineyard Stags Leap District', 2022, 'red'))
    expect(m.kind === 'match' && m.bottle.id).toBe('clos-du-val-cabernet-franc')
  })
  it('forgives one misread letter in a long word', () => {
    const m = matchLabel(REAL_BOTTLES, r('Goldeneyc', 'Pinot Noir', 2022, 'red'))
    expect(m.kind === 'match' && m.bottle.id).toBe('goldeneye-pinot-noir')
  })
  it('treats the same wine from another year as the same wine', () => {
    const m = matchLabel(REAL_BOTTLES, r('Duckhorn Vineyards', 'North Coast Sauvignon Blanc', 2024, 'white'))
    expect(m.kind === 'match' && m.bottle.id).toBe('duckhorn-sauvignon-blanc')
  })
  it('does not pick Moët when it reads a different bubbly that shares the word Brut', () => {
    const m = matchLabel(REAL_BOTTLES, r('Decoy', 'Brut Cuvée', null, 'sparkling'))
    expect(m.kind === 'match' && m.bottle.id).toBe('decoy-brut-cuvee')
  })
})

describe('matchLabel: bottles we do not have', () => {
  it('says "none" for a wine that is not in the catalog', () => {
    expect(matchLabel(REAL_BOTTLES, r('Opus One', 'Overture', 2019, 'red')).kind).toBe('none')
    expect(matchLabel(REAL_BOTTLES, r('Silver Oak', 'Cabernet Sauvignon Alexander Valley', 2019, 'red')).kind).not.toBe('match')
  })
  it('with no maker on the label, only a matching year makes it sure', () => {
    const noYear = matchLabel(REAL_BOTTLES, r(null, 'Estate Grown Cabernet Franc', null, 'red'))
    expect(noYear.kind).toBe('similar')
  })
  it('does not guess from a grape name alone', () => {
    const m = matchLabel(REAL_BOTTLES, r(null, 'Cabernet Sauvignon', null, 'red'))
    expect(m.kind).not.toBe('match')
  })
  it('says "none" for a photo that is not a wine label, or a reading with nothing in it', () => {
    expect(matchLabel(REAL_BOTTLES, { is_wine_label: false, producer: null, name: null, vintage: null, type: null }).kind).toBe('none')
    expect(matchLabel(REAL_BOTTLES, r(null, null, null, null)).kind).toBe('none')
  })
  it('offers close ones when it is not sure', () => {
    const m = matchLabel(REAL_BOTTLES, r(null, 'Cabernet', null, 'red'))
    if (m.kind === 'similar') expect(m.bottles.length).toBeGreaterThan(0)
    expect(m.kind).not.toBe('match')
  })
  it('an empty catalog never matches', () => {
    expect(matchLabel([], FRONTS[0]![1]).kind).toBe('none')
  })
})
