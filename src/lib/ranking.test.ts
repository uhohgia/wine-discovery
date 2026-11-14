import { describe, expect, it } from 'vitest'
import { SEED_BOTTLES } from '@/data/bottles'
import { PAIRING_RULES, PAIRING_WEIGHT } from '@/data/pairingRules'
import { emptyProfile } from './profile'
import { quizToProfile } from './quiz'
import { pairingFit } from './pairing'
import { rankForMeal } from './ranking'
import { applyRating } from './rating'
import { scoreBottle } from './scoring'

const rank = (profile = quizToProfile({}), rule = 'bbq' as keyof typeof PAIRING_RULES, bottles = SEED_BOTTLES, ratings = 0) =>
  rankForMeal(profile, bottles, PAIRING_RULES[rule], ratings)
const names = (r: ReturnType<typeof rank>) => r.map((x) => x.bottle.name)

const bigBold = quizToProfile({ type: ['red'], body: ['whole'], tannin: ['like'], fruit: ['blackberry'], fruitStyle: ['jammy'] })
const lightWhiteFan = quizToProfile({ type: ['white'], body: ['skim'], acidity: ['lemonade'], fruitStyle: ['fresh'], fruit: ['lemon'] })
const berry = quizToProfile({ type: ['red'], body: ['skim'], fruit: ['strawberry'], fruitStyle: ['fresh'] })

describe('rankForMeal', () => {
  it('returns every bottle on the shelf, best first, and nothing for an empty shelf', () => {
    const r = rank(bigBold, 'bbq')
    expect(r).toHaveLength(10)
    for (let i = 1; i < r.length; i++) expect(r[i - 1]!.combined).toBeGreaterThanOrEqual(r[i]!.combined)
    expect(rank(bigBold, 'bbq', [])).toEqual([])
  })

  it('blends pairing and taste about 50/50', () => {
    expect(PAIRING_WEIGHT).toBe(0.5)
    const [top] = rank(bigBold, 'bbq')
    expect(top!.combined).toBeCloseTo(0.5 * top!.pairing + 0.5 * top!.taste, 10)
    const b = top!.bottle
    expect(top!.pairing).toBeCloseTo(pairingFit(PAIRING_RULES.bbq, b).score, 10)
    expect(top!.taste).toBeCloseTo(scoreBottle(bigBold, b).score, 10)
  })

  it('a Big & Bold drinker gets the big red first for BBQ, with a good-bet label', () => {
    const [top] = rank(bigBold, 'bbq')
    expect(top!.bottle.name).toBe('Sample Red 3')
    expect(top!.confidence).toBe('worth-a-try') // not easy to like and no ratings yet, so not a "good bet"
  })

  it('the same meal ranks differently for different tastes', () => {
    const forBold = names(rank(bigBold, 'spicy-takeout'))
    const forWhiteFan = names(rank(lightWhiteFan, 'spicy-takeout'))
    expect(forWhiteFan[0]).toBe('Sample White 2')
    expect(forBold.indexOf('Sample White 2')).toBeGreaterThan(forWhiteFan.indexOf('Sample White 2'))
  })

  it('rating "not for me" (changing the profile) visibly changes the order', () => {
    const before = names(rank(berry, 'pizza'))
    const steerAwayFromRed = { ...berry, types: { ...berry.types, red: -0.8, white: 0.8 } }
    const after = names(rank(steerAwayFromRed, 'pizza'))
    expect(after).not.toEqual(before)
    expect(after.indexOf('Sample White 1')).toBeLessThan(before.indexOf('Sample White 1'))
  })

  it('an easy-to-like bottle can be "A good bet" for a meal; a stretch is labelled honestly', () => {
    const r = rank(lightWhiteFan, 'seafood')
    const white1 = r.find((x) => x.bottle.id === 'sample-white-1')!
    expect(white1.confidence).toBe('good-bet')
    const red3 = r.find((x) => x.bottle.id === 'sample-red-3')!
    expect(red3.confidence).toBe('a-stretch')
    expect(r[0]!.bottle.id).toBe('sample-white-1')
  })

  it('enough ratings can turn "worth a try" into "a good bet" for a tricky bottle', () => {
    const few = rank(bigBold, 'bbq', SEED_BOTTLES, 0).find((x) => x.bottle.id === 'sample-red-3')!
    const many = rank(bigBold, 'bbq', SEED_BOTTLES, 5).find((x) => x.bottle.id === 'sample-red-3')!
    expect(few.confidence).toBe('worth-a-try')
    expect(many.confidence).toBe('good-bet')
  })

  it('without a taste profile it ranks by the pairing alone, with no labels', () => {
    const r = rank(emptyProfile(), 'spicy-takeout')
    expect(r[0]!.bottle.name).toBe('Sample White 2')
    expect(r.every((x) => x.confidence === null)).toBe(true)
    expect(r.every((x) => x.combined === x.pairing)).toBe(true)
  })

  it('every result explains itself in plain words, with no jargon', () => {
    for (const profile of [bigBold, lightWhiteFan, berry, emptyProfile()]) {
      for (const rule of Object.keys(PAIRING_RULES) as (keyof typeof PAIRING_RULES)[]) {
        for (const x of rank(profile, rule)) {
          expect(x.why.length, `${rule}/${x.bottle.id}`).toBeGreaterThan(10)
          expect(x.why).not.toMatch(/tannin|acidity|astringen|structure|finish|palate|terroir/i)
          expect(x.why).toMatch(/\.$/)
        }
      }
    }
  })

  it('explains both the pairing and the taste', () => {
    const top = rank(lightWhiteFan, 'seafood')[0]!
    expect(top.why).toMatch(/^[A-Z]/)
    expect(top.why).toMatch(/seafood|lemon|light/i)
    expect(top.why).toMatch(/like you like|you like|reach for/)
  })

  it('breaks ties steadily, by taste and then name', () => {
    const a = rank(berry, 'weeknight').map((x) => x.bottle.id)
    const b = rank(berry, 'weeknight').map((x) => x.bottle.id)
    expect(a).toEqual(b)
  })

  it('a "not for me: too sharp" rating lowers zippy bottles for later recommendations', () => {
    const zippy = SEED_BOTTLES.find((b) => b.id === 'sample-white-1')!
    const fan = quizToProfile({ type: ['white'], acidity: ['lemonade'], body: ['skim'] })
    const after = applyRating(fan, zippy, 'not-for-me', ['too-sharp']).profile
    const taste = (p: typeof fan, id: string) => rankForMeal(p, SEED_BOTTLES, PAIRING_RULES.pizza, 0).find((r) => r.bottle.id === id)!.taste
    expect(taste(after, 'sample-white-1')).toBeLessThan(taste(fan, 'sample-white-1'))
    expect(taste(after, 'sample-bubbly-1')).toBeLessThan(taste(fan, 'sample-bubbly-1')) // other zippy bottles too
    expect(taste(after, 'sample-white-3')).toBeGreaterThan(taste(fan, 'sample-white-3')) // a softer white now suits better
  })
})
