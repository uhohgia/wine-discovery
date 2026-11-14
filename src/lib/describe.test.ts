import { describe, expect, it } from 'vitest'
import { PROFILE_NAMES } from '@/data/profileNames'
import { evidenceLine, favoriteTypes, likedNotes, pickProfileName, summarize } from './describe'
import { emptyProfile, TasteProfileSchema, type TasteProfile } from './profile'
import { quizToProfile } from './quiz'

const make = (patch: Partial<TasteProfile>): TasteProfile => ({ ...emptyProfile(), ...patch })

describe('summarize', () => {
  it('invites the quiz when nothing is known', () => {
    expect(summarize(emptyProfile())).toMatch(/quick quiz/i)
  })

  it('describes a light, fresh, red-berry, floral drinker in plain words', () => {
    const p = quizToProfile({ body: ['skim'], fruitStyle: ['fresh'], fruit: ['strawberry'], scent: ['roses'] })
    expect(summarize(p)).toBe('You like lighter, fresh, red-berry wines with a little floral.')
  })

  it('mentions what you mostly reach for, grip and spice', () => {
    const p = quizToProfile({ type: ['red'], body: ['whole'], tannin: ['like'], scent: ['vanilla'] })
    expect(summarize(p)).toBe('You mostly reach for red. You like fuller wines with a touch of vanilla and a bit of grip.')
  })

  it('stays gentle and jargon-free', () => {
    const p = quizToProfile({ type: ['white'], body: ['2pct'], sweetness: ['sweet'], tannin: ['dislike'], acidity: ['lemonade'] })
    const text = summarize(p)
    expect(text).not.toMatch(/tannin|acidity|body|astringen/i)
    expect(text).toMatch(/zippy/)
  })

  it('works for a profile with only a few answers', () => {
    expect(summarize(quizToProfile({ type: ['red', 'white'], body: ['skim'] }))).toBe('You mostly reach for red and white. You like lighter wines.')
  })
})

describe('pickProfileName', () => {
  const name = (p: TasteProfile) => pickProfileName(p).name

  it('has about 8 names and the last rule always matches', () => {
    expect(PROFILE_NAMES.length).toBeGreaterThanOrEqual(8)
    expect(PROFILE_NAMES.length).toBeLessThanOrEqual(10)
    expect(PROFILE_NAMES[PROFILE_NAMES.length - 1]!.when(emptyProfile())).toBe(true)
    expect(new Set(PROFILE_NAMES.map((n) => n.name)).size).toBe(PROFILE_NAMES.length)
  })

  it('names each archetype', () => {
    expect(name(quizToProfile({ body: ['skim'], fruit: ['strawberry'] }))).toBe('Bright & Berry')
    expect(name(quizToProfile({ body: ['whole'], tannin: ['like'] }))).toBe('Big & Bold')
    expect(name(quizToProfile({ fruitStyle: ['jammy'] }))).toBe('Ripe & Jammy')
    expect(name(quizToProfile({ acidity: ['lemonade'], fruit: ['lemon'] }))).toBe('Crisp & Citrusy')
    expect(name(quizToProfile({ scent: ['roses'] }))).toBe('Floral & Fancy')
    expect(name(quizToProfile({ scent: ['vanilla'] }))).toBe('Warm & Toasty')
    expect(name(quizToProfile({ sweetness: ['sweet'] }))).toBe('Soft & Sweet')
    expect(name(quizToProfile({ tannin: ['dislike'], acidity: ['plain-water'] }))).toBe('Smooth & Easygoing')
    expect(name(emptyProfile())).toBe('Curious Explorer')
  })

  it('is stable: the first matching rule wins', () => {
    // Bold and berry: bold comes first in the list.
    const p = make({ body: 2, tannin: 2, fruitNotes: { 'red-berry': 1 } })
    expect(name(p)).toBe('Big & Bold')
  })
})

describe('evidenceLine', () => {
  it('is honest about how little we know', () => {
    expect(evidenceLine(0)).toMatch(/quiz answers/i)
    expect(evidenceLine(1)).toBe('Based on 1 rating, so more bottles will sharpen this.')
    expect(evidenceLine(2)).toBe('Based on 2 ratings, so more bottles will sharpen this.')
  })
})

describe('profile word lists', () => {
  it('lists favorite types and liked notes in plain words', () => {
    const p = quizToProfile({ type: ['sparkling', 'red'], fruit: ['peach'], scent: ['smoke'] })
    expect(favoriteTypes(p).sort()).toEqual(['Bubbly', 'Red'])
    expect(likedNotes(p)).toEqual(['Peach', 'Smoke'])
  })
  it('the schema rejects out-of-range numbers', () => {
    expect(TasteProfileSchema.safeParse({ body: 5 }).success).toBe(false)
    expect(TasteProfileSchema.safeParse({ types: { red: 2 } }).success).toBe(false)
    expect(TasteProfileSchema.safeParse({ fruitNotes: { banana: 1 } }).success).toBe(false)
  })
})
