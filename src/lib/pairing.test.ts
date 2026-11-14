import { describe, expect, it } from 'vitest'
import { SEED_BOTTLES, type Bottle } from '@/data/bottles'
import { MEAL_RULES, OCCASION_RULES, PAIRING_RULES, type PairingRule } from '@/data/pairingRules'
import { ACIDITY, MEALS, OCCASIONS, TYPES } from '@/data/vocab'
import { pairingFit, pairingSentence } from './pairing'

const bottle = (id: string): Bottle => SEED_BOTTLES.find((b) => b.id === id)!
const best = (rule: PairingRule) => [...SEED_BOTTLES].sort((a, b) => pairingFit(rule, b).score - pairingFit(rule, a).score)[0]!.name

describe('the pairing rule tables', () => {
  it('cover every meal and occasion in the brief, with no extras', () => {
    expect(Object.keys(PAIRING_RULES).sort()).toEqual([...MEALS, ...OCCASIONS].sort())
    expect(MEAL_RULES).toHaveLength(7)
    expect(OCCASION_RULES).toHaveLength(4)
    for (const r of Object.values(PAIRING_RULES)) expect(r.id, r.id).toBe(Object.entries(PAIRING_RULES).find(([, v]) => v === r)![0])
  })

  it('have friendly, unique labels and tile hints', () => {
    const labels = Object.values(PAIRING_RULES).map((r) => r.label)
    expect(new Set(labels).size).toBe(labels.length)
    for (const r of Object.values(PAIRING_RULES)) {
      expect(r.hint.length, r.id).toBeGreaterThan(3)
      expect(r.forWhat.length, r.id).toBeGreaterThan(2)
    }
  })

  it('use targets on the 0 to 2 scale, positive weights and real wine types', () => {
    for (const r of Object.values(PAIRING_RULES)) {
      for (const [dim, ideal] of Object.entries(r.ideal)) {
        expect(ideal.target, `${r.id}.${dim}`).toBeGreaterThanOrEqual(0)
        expect(ideal.target, `${r.id}.${dim}`).toBeLessThanOrEqual(2)
        expect(ideal.weight, `${r.id}.${dim}`).toBeGreaterThan(0)
      }
      for (const [t, v] of Object.entries(r.types ?? {})) {
        expect(TYPES as readonly string[], `${r.id}.${t}`).toContain(t)
        expect(v).toBeGreaterThanOrEqual(-1)
        expect(v).toBeLessThanOrEqual(1)
      }
    }
  })

  it('explain every dimension they score, in plain words without jargon', () => {
    for (const r of Object.values(PAIRING_RULES)) {
      const scored = [...Object.keys(r.ideal), ...(r.types ? ['type'] : []), ...(r.easyToLike ? ['easy'] : []), ...(r.price ? ['price'] : []), ...(r.occasionTag ? ['tag'] : [])]
      for (const key of scored) expect(r.reasons[key as keyof typeof r.reasons] ?? r.misses[key as keyof typeof r.misses], `${r.id}.${key}`).toBeDefined()
      for (const text of [...Object.values(r.reasons), ...Object.values(r.misses)]) expect(text, r.id).not.toMatch(/tannin|acidity|astringen|structure|finish|palate/i)
    }
    expect(ACIDITY.length).toBe(3)
  })
})

describe('pairingFit', () => {
  it('stays between 0 and 1', () => {
    for (const r of Object.values(PAIRING_RULES)) for (const b of SEED_BOTTLES) {
      const { score } = pairingFit(r, b)
      expect(score).toBeGreaterThanOrEqual(0)
      expect(score).toBeLessThanOrEqual(1)
    }
  })

  it('picks the classic bottle for each meal', () => {
    expect(best(PAIRING_RULES['spicy-takeout'])).toBe('Sample White 2') // off-dry, zippy, no grip
    expect(best(PAIRING_RULES.bbq)).toBe('Sample Red 3') // big, jammy, a little grippy
    expect(best(PAIRING_RULES.seafood)).toBe('Sample White 1') // light, zippy white
    expect(['Sample White 1', 'Sample Rosé 1']).toContain(best(PAIRING_RULES['salad-veggie']))
    expect(['Sample Red 2', 'Sample Red 1']).toContain(best(PAIRING_RULES['pasta-tomato']))
  })

  it('matches the examples in the brief: spicy takeout likes off-dry, low grip, zippy; BBQ likes bigger, grippier or jammy', () => {
    const spicy = PAIRING_RULES['spicy-takeout']
    expect(pairingFit(spicy, bottle('sample-white-2')).score).toBeGreaterThan(0.85)
    expect(pairingFit(spicy, bottle('sample-red-3')).score).toBeLessThan(0.4)
    const bbq = PAIRING_RULES.bbq
    expect(pairingFit(bbq, bottle('sample-red-3')).score).toBeGreaterThan(pairingFit(bbq, bottle('sample-red-1')).score)
    expect(pairingFit(bbq, bottle('sample-red-1')).score).toBeGreaterThan(pairingFit(bbq, bottle('sample-white-1')).score)
  })

  it('uses the occasion tag, easy-to-like and price for occasions', () => {
    expect(pairingFit(PAIRING_RULES.gift, bottle('sample-bubbly-1')).score).toBeGreaterThan(pairingFit(PAIRING_RULES.gift, bottle('sample-white-1')).score)
    expect(pairingFit(PAIRING_RULES.weeknight, bottle('sample-red-4')).score).toBeGreaterThan(pairingFit(PAIRING_RULES.weeknight, bottle('sample-red-3')).score)
    expect(pairingFit(PAIRING_RULES['dinner-party'], bottle('sample-red-2')).score).toBeGreaterThan(pairingFit(PAIRING_RULES['dinner-party'], bottle('sample-orange-1')).score)
  })
})

describe('pairingSentence', () => {
  it('names the strongest reason a pairing works', () => {
    const rule = PAIRING_RULES['spicy-takeout']
    expect(pairingSentence(rule, pairingFit(rule, bottle('sample-white-2')))).toBe('A touch of sweetness calms the heat.')
  })
  it('says honestly when it doesn’t', () => {
    const rule = PAIRING_RULES.seafood
    expect(pairingSentence(rule, pairingFit(rule, bottle('sample-red-3')))).toMatch(/heavy for delicate seafood|red wine usually overwhelms|dry, grippy/)
  })
  it('always ends like a sentence', () => {
    for (const r of Object.values(PAIRING_RULES)) for (const b of SEED_BOTTLES) {
      const s = pairingSentence(r, pairingFit(r, b))
      if (s) expect(s).toMatch(/^[A-Z].*\.$/)
    }
  })
})
