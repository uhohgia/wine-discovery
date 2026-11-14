import { describe, expect, it } from 'vitest'
import { SEED_BOTTLES, type Bottle } from '@/data/bottles'
import { DISLIKE_RULES, DISLIKE_STEP, LOVED_PULL } from '@/data/dislikeRules'
import { DISLIKE_REASONS } from '@/data/vocab'
import { emptyProfile, TasteProfileSchema, type TasteProfile } from './profile'
import { quizToProfile } from './quiz'
import { applyRating, replayRatings } from './rating'

const bottle = (id: string): Bottle => SEED_BOTTLES.find((b) => b.id === id)!
const white1 = bottle('sample-white-1') // light, dry, zippy, low grip, fresh, citrus + green
const red3 = bottle('sample-red-3') // full, dry, balanced, high grip, jammy, dark-fruit + blue, purple flowers, vanilla/spice/smoke
const bubbly = bottle('sample-bubbly-1')

const mid = quizToProfile({ body: ['2pct'], sweetness: ['little'], acidity: ['lemon-water'], tannin: ['no'], type: ['red', 'white'] })
const rate = (p: TasteProfile, b: Bottle, v: Parameters<typeof applyRating>[2], r: Parameters<typeof applyRating>[3] = []) => applyRating(p, b, v, r)

describe('applyRating: general rules', () => {
  it('never changes the profile it was given', () => {
    const before = structuredClone(mid)
    rate(mid, red3, 'not-for-me', ['too-heavy', 'flavor'])
    rate(mid, red3, 'loved')
    expect(mid).toEqual(before)
  })

  it('always returns a valid profile, whatever the rating', () => {
    for (const p of [emptyProfile(), mid]) {
      for (const b of SEED_BOTTLES) {
        for (const verdict of ['loved', 'fine', 'not-for-me'] as const) {
          expect(() => TasteProfileSchema.parse(rate(p, b, verdict, [...DISLIKE_REASONS]).profile)).not.toThrow()
        }
      }
    }
  })

  it('keeps the quiz answers so the quiz can be reopened', () => {
    expect(rate(mid, red3, 'loved').profile.quizAnswers).toEqual(mid.quizAnswers)
  })
})

describe('Loved it', () => {
  it('pulls each known target toward the bottle', () => {
    const r = rate(mid, red3, 'loved').profile
    expect(r.body).toBeCloseTo(1 + LOVED_PULL * (2 - 1)) // medium -> toward full
    expect(r.tannin).toBeCloseTo(1 + LOVED_PULL * (2 - 1))
    expect(r.sweetness).toBeCloseTo(1 + LOVED_PULL * (0 - 1)) // little sugar -> toward dry
  })

  it('adopts the bottle’s value where we knew nothing', () => {
    expect(rate(mid, red3, 'loved').profile.fruitCharacter).toBe(2) // jammy
  })

  it('makes the bottle’s type and flavors more liked', () => {
    const r = rate(emptyProfile(), red3, 'loved').profile
    expect(r.types.red).toBeCloseTo(0.3)
    expect(r.fruitNotes['dark-fruit']).toBeCloseTo(0.3)
    expect(r.flowerNotes['purple-flowers']).toBeCloseTo(0.3)
    expect(r.extras.smoke).toBeCloseTo(0.3)
    const again = rate(r, red3, 'loved').profile
    expect(again.fruitNotes['dark-fruit']).toBeCloseTo(0.6)
  })

  it('never goes past the ends of the scales', () => {
    let p = rate(emptyProfile(), red3, 'loved').profile
    for (let i = 0; i < 30; i++) p = rate(p, red3, 'loved').profile
    expect(p.body).toBeLessThanOrEqual(2)
    expect(p.types.red).toBeLessThanOrEqual(1)
    expect(p.fruitNotes['dark-fruit']).toBeLessThanOrEqual(1)
  })

  it('says something warm', () => {
    expect(rate(mid, red3, 'loved').confirmation).toBe('Great! We’ll look for more wines like this one.')
  })
})

describe('It was fine', () => {
  it('nudges lightly, and only where we had an opinion', () => {
    const r = rate(mid, red3, 'fine').profile
    expect(r.body).toBeCloseTo(1.1)
    expect(r.fruitCharacter).toBeNull()
    expect(r.types.red).toBe(mid.types.red)
  })
  it('on an empty profile changes nothing', () => {
    expect(rate(emptyProfile(), red3, 'fine').profile).toEqual(emptyProfile())
  })
})

describe('Not for me: each reason moves the matching preference', () => {
  const only = (reason: (typeof DISLIKE_REASONS)[number], p = mid, b = red3) => rate(p, b, 'not-for-me', [reason]).profile

  it('too sharp: steers toward softer, smoother wines', () => {
    expect(only('too-sharp', mid, white1).acidity).toBeCloseTo(1 - DISLIKE_STEP) // was lemon water (1), white1 is zippy (2): base min(1,2)=1
    expect(only('too-sharp', emptyProfile(), white1).acidity).toBeCloseTo(2 - DISLIKE_STEP) // adopt relative to the bottle
  })
  it('too heavy: lighter', () => {
    expect(only('too-heavy').body).toBeCloseTo(1 - DISLIKE_STEP)
  })
  it('too light or watery: fuller', () => {
    expect(only('too-light', mid, white1).body).toBeCloseTo(1 + DISLIKE_STEP)
  })
  it('too dry: sweeter', () => {
    expect(only('too-dry').sweetness).toBeCloseTo(1 + DISLIKE_STEP)
  })
  it('too sweet: drier', () => {
    expect(only('too-sweet', mid, bottle('sample-red-4')).sweetness).toBeCloseTo(1 - DISLIKE_STEP) // off-dry bottle (1)
  })
  it('mouth-drying or bitter: less grip', () => {
    expect(only('mouth-drying').tannin).toBeCloseTo(1 - DISLIKE_STEP)
  })
  it('didn’t like the flavor: those flavors become less liked', () => {
    const p = rate(quizToProfile({ fruit: ['blackberry'] }), red3, 'not-for-me', ['flavor']).profile
    expect(p.fruitNotes['dark-fruit']).toBeCloseTo(0.6) // 1 - 0.4
    expect(p.fruitNotes['blue-fruit']).toBeCloseTo(-0.4)
    expect(p.extras.vanilla).toBeCloseTo(-0.4)
  })
  it('not sure: changes nothing', () => {
    expect(only('not-sure')).toEqual(mid)
  })
  it('only touches what the reason is about', () => {
    const p = only('too-sharp', mid, white1)
    expect({ ...p, acidity: mid.acidity }).toEqual(mid)
  })
  it('several reasons all apply', () => {
    const p = rate(mid, red3, 'not-for-me', ['too-heavy', 'mouth-drying']).profile
    expect(p.body).toBeCloseTo(1 - DISLIKE_STEP)
    expect(p.tannin).toBeCloseTo(1 - DISLIKE_STEP)
  })
  it('repeating a reason does not stack within one rating', () => {
    expect(rate(mid, red3, 'not-for-me', ['too-heavy', 'too-heavy']).profile.body).toBeCloseTo(1 - DISLIKE_STEP)
  })
  it('a second complaint keeps moving away, but never past the ends', () => {
    let p = mid
    for (let i = 0; i < 6; i++) p = rate(p, white1, 'not-for-me', ['too-sharp']).profile
    expect(p.acidity).toBe(0)
  })
  it('pushes away from the bottle even if the person’s taste was on the far side already', () => {
    const likesZing = quizToProfile({ acidity: ['lemonade'] }) // 2
    expect(only('too-sharp', likesZing, white1).acidity).toBeCloseTo(2 - DISLIKE_STEP) // min(2, 2) - step
    const likesSoft = quizToProfile({ acidity: ['plain-water'] }) // 0
    expect(only('too-sharp', likesSoft, white1).acidity).toBe(0) // clamped, never negative
  })
})

describe('Not for me: the warm confirmation', () => {
  it('matches the brief for "too sharp"', () => {
    expect(rate(mid, white1, 'not-for-me', ['too-sharp']).confirmation).toBe('Good to know. We’ll steer away from sharp wines.')
  })
  it('joins several reasons naturally', () => {
    expect(rate(mid, red3, 'not-for-me', ['too-heavy', 'too-dry']).confirmation).toBe('Good to know. We’ll look for lighter wines and look for wines with a touch of sweetness.')
  })
  it('names the flavors for "didn’t like the flavor"', () => {
    expect(rate(mid, red3, 'not-for-me', ['flavor']).confirmation).toBe('Good to know. We’ll go easier on dark-fruit and blueberry flavors.')
    expect(rate(mid, white1, 'not-for-me', ['flavor']).confirmation).toBe('Good to know. We’ll go easier on citrus and green-pepper flavors.')
  })
  it('is kind when there is no specific reason', () => {
    expect(rate(mid, red3, 'not-for-me', []).confirmation).toBe('Not your style? That helps us too. We’ve noted it.')
    expect(rate(mid, red3, 'not-for-me', ['not-sure']).confirmation).toBe('Not your style? That helps us too. We’ve noted it.')
  })
  it('never shames, and never uses jargon', () => {
    for (const reason of DISLIKE_REASONS) {
      for (const b of SEED_BOTTLES) {
        const text = rate(mid, b, 'not-for-me', [reason]).confirmation
        expect(text).not.toMatch(/wrong|mistake|fail|tannin|acidity|astringen/i)
        expect(text).toMatch(/\.$/)
      }
    }
  })
})

describe('rules table', () => {
  it('covers every reason in the vocabulary, with friendly labels', () => {
    expect(Object.keys(DISLIKE_RULES).sort()).toEqual([...DISLIKE_REASONS].sort())
    for (const r of Object.values(DISLIKE_RULES)) expect(r.label.length).toBeGreaterThan(2)
    expect(DISLIKE_RULES['too-sharp'].label).toBe('Too sharp or sour')
    expect(DISLIKE_RULES['mouth-drying'].label).toBe('Mouth-drying or bitter')
  })
  it('uses the bubbly example from the brief’s demo bottle without error', () => {
    expect(() => rate(mid, bubbly, 'not-for-me', ['too-sharp', 'flavor'])).not.toThrow()
  })
})

describe('replayRatings', () => {
  it('returns the starting profile when there are no ratings', () => {
    expect(replayRatings(mid, [], SEED_BOTTLES)).toBe(mid)
  })
  it('applies ratings in order, exactly as saving them one by one would', () => {
    const ratings = [
      { bottleId: 'sample-red-3', verdict: 'loved' as const, reasons: [] },
      { bottleId: 'sample-white-1', verdict: 'not-for-me' as const, reasons: ['too-sharp' as const] },
    ]
    let sequential = mid
    sequential = applyRating(sequential, red3, 'loved', []).profile
    sequential = applyRating(sequential, white1, 'not-for-me', ['too-sharp']).profile
    expect(replayRatings(mid, ratings, SEED_BOTTLES)).toEqual(sequential)
  })
  it('skips ratings for bottles that are no longer in the catalog', () => {
    expect(replayRatings(mid, [{ bottleId: 'gone', verdict: 'loved', reasons: [] }], SEED_BOTTLES)).toEqual(mid)
  })
})
