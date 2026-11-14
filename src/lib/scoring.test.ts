import { describe, expect, it } from 'vitest'
import { SEED_BOTTLES, type Bottle } from '@/data/bottles'
import { GOOD_BET_MIN, MIN_RATINGS_FOR_CONFIDENCE, NEUTRAL_SCORE, WORTH_A_TRY_MIN } from '@/data/scoringWeights'
import { emptyProfile, type TasteProfile } from './profile'
import { quizToProfile } from './quiz'
import { confidenceFor, explainWhy, scoreBottle } from './scoring'

const bottle = (id: string): Bottle => SEED_BOTTLES.find((b) => b.id === id)!
const red1 = bottle('sample-red-1') // light, dry, balanced, soft, fresh red-berry + roses, easy to like
const red3 = bottle('sample-red-3') // full, dry, grippy, jammy dark-fruit, not easy
const white1 = bottle('sample-white-1') // light, dry, zippy white

const brightBerry = quizToProfile({ type: ['red'], body: ['skim'], fruit: ['strawberry'], fruitStyle: ['fresh'], scent: ['roses'] })
const bigBold = quizToProfile({ type: ['red'], body: ['whole'], tannin: ['like'], fruit: ['blackberry'], fruitStyle: ['jammy'] })
const score = (p: TasteProfile, b: Bottle) => scoreBottle(p, b).score

describe('scoreBottle', () => {
  it('stays between 0 and 1, for every profile and bottle', () => {
    for (const p of [emptyProfile(), brightBerry, bigBold]) {
      for (const b of SEED_BOTTLES) {
        expect(score(p, b)).toBeGreaterThanOrEqual(0)
        expect(score(p, b)).toBeLessThanOrEqual(1)
      }
    }
  })

  it('knows nothing from an empty profile, and says so with the neutral score', () => {
    const s = scoreBottle(emptyProfile(), red1)
    expect(s.known).toBe(false)
    expect(s.score).toBe(NEUTRAL_SCORE)
  })

  it('ranks a light berry red above a big jammy red for a Bright & Berry drinker, and the reverse for Big & Bold', () => {
    expect(score(brightBerry, red1)).toBeGreaterThan(score(brightBerry, red3))
    expect(score(bigBold, red3)).toBeGreaterThan(score(bigBold, red1))
  })

  it('gives a near-perfect match a high score', () => {
    expect(score(brightBerry, red1)).toBeGreaterThan(0.9)
  })

  it('applies a strong penalty for a type the person steers away from', () => {
    const likesWhite = quizToProfile({ type: ['white'], body: ['skim'] })
    const hatesWhite = quizToProfile({ type: ['red'], body: ['skim'] }) // white becomes a mismatch
    const a = scoreBottle(likesWhite, white1)
    const b = scoreBottle(hatesWhite, white1)
    expect(b.typeMismatch).toBe(true)
    expect(a.typeMismatch).toBe(false)
    expect(b.score).toBeLessThan(a.score * 0.7)
  })

  it('does not penalize types the quiz never asked about', () => {
    expect(scoreBottle(quizToProfile({ type: ['red'], body: ['2pct'] }), bottle('sample-orange-1')).typeMismatch).toBe(false)
  })

  it('only counts what we know: a profile with just a body answer still scores on body', () => {
    const p = quizToProfile({ body: ['skim'] })
    const s = scoreBottle(p, red1)
    expect(s.matches.map((m) => m.dim)).toEqual(['body'])
    expect(s.score).toBe(1)
    expect(score(p, red3)).toBe(0)
  })

  it('scores notes by liking, and treats "None of these" scents as a mild negative', () => {
    const noScents = quizToProfile({ scent: ['none'] })
    expect(score(noScents, red1)).toBeLessThan(0.5) // red-1 has roses; flowers disliked
    expect(score(noScents, white1)).toBe(NEUTRAL_SCORE) // no flowers or extras: nothing to say
  })
})

describe('confidenceFor', () => {
  const make = (score: number, known = true) => ({ score, matches: [], typeMismatch: false, known })
  const easy = { ...red1, easy_to_like: true }
  const hard = { ...red1, easy_to_like: false }

  it('"A good bet": high score and an easy-to-like bottle', () => {
    expect(confidenceFor(make(GOOD_BET_MIN), easy, 0)).toBe('good-bet')
  })

  it('"A good bet": high score and enough ratings, even for a tricky bottle', () => {
    expect(confidenceFor(make(0.9), hard, MIN_RATINGS_FOR_CONFIDENCE)).toBe('good-bet')
  })

  it('a high score without easy-to-like or enough ratings is only "Worth a try"', () => {
    expect(confidenceFor(make(0.95), hard, MIN_RATINGS_FOR_CONFIDENCE - 1)).toBe('worth-a-try')
  })

  it('"Worth a try" in the middle, "A stretch" below', () => {
    expect(confidenceFor(make(WORTH_A_TRY_MIN), hard, 0)).toBe('worth-a-try')
    expect(confidenceFor(make(WORTH_A_TRY_MIN - 0.01), easy, 10)).toBe('a-stretch')
    expect(confidenceFor(make(0), easy, 10)).toBe('a-stretch')
  })

  it('says nothing when we know nothing', () => {
    expect(confidenceFor(make(0.5, false), easy, 5)).toBeNull()
  })

  it('works end to end on the placeholder bottles', () => {
    const label = (p: TasteProfile, b: Bottle) => confidenceFor(scoreBottle(p, b), b, 0)
    expect(label(brightBerry, red1)).toBe('good-bet')
    expect(label(brightBerry, red3)).toBe('a-stretch')
  })
})

describe('explainWhy', () => {
  const why = (p: TasteProfile, b: Bottle) => explainWhy(p, b, scoreBottle(p, b))

  it('explains a good match in plain words, naming the strongest fits', () => {
    expect(why(brightBerry, red1)).toBe('It’s light and fresh, just the way you like it. It has the red-berry and rose flavors you like. It’s a red, which you usually reach for.')
  })

  it('explains a clash honestly', () => {
    const text = why(brightBerry, red3)
    expect(text).toBe('It’s a red, which you usually reach for. But it’s full-bodied and jammy, and you like lighter wines and fresh, crisp fruit.')
    expect(text).toMatch(/you like lighter wines/)
  })

  it('mentions a type mismatch gently', () => {
    const p = quizToProfile({ type: ['red'], body: ['skim'] })
    expect(why(p, white1)).toMatch(/Also, it’s a white, and you usually reach for red/)
  })

  it('asks for the quiz when it has nothing to go on', () => {
    expect(why(emptyProfile(), red1)).toMatch(/quick quiz/)
  })

  it('never uses wine jargon', () => {
    for (const p of [brightBerry, bigBold, quizToProfile({ type: ['white'], acidity: ['lemonade'], tannin: ['dislike'] })]) {
      for (const b of SEED_BOTTLES) expect(why(p, b)).not.toMatch(/tannin|acidity|astringen|structure|finish|palate|terroir/i)
    }
  })
})
