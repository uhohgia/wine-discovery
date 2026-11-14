import { describe, expect, it } from 'vitest'
import { QUIZ_STEPS, UNSURE } from '@/data/quizRules'
import { FLOWER_NOTES, EXTRAS } from '@/data/vocab'
import { isEmptyProfile, TasteProfileSchema } from './profile'
import { chosen, cleanAnswers, quizToProfile, stepsAnswered } from './quiz'

describe('quizToProfile', () => {
  it('knows nothing from no answers, and from "Not sure" everywhere', () => {
    expect(isEmptyProfile(quizToProfile({}))).toBe(true)
    const allUnsure = Object.fromEntries(QUIZ_STEPS.flatMap((s) => s.questions.map((q) => [q.id, [UNSURE]])))
    expect(isEmptyProfile(quizToProfile(allUnsure))).toBe(true)
  })

  it('maps the milk question to body', () => {
    expect(quizToProfile({ body: ['skim'] }).body).toBe(0)
    expect(quizToProfile({ body: ['2pct'] }).body).toBe(1)
    expect(quizToProfile({ body: ['whole'] }).body).toBe(2)
  })

  it('maps coffee sugar to sweetness and black-tea reaction to tannin', () => {
    expect(quizToProfile({ sweetness: ['none'] }).sweetness).toBe(0)
    expect(quizToProfile({ sweetness: ['sweet'] }).sweetness).toBe(2)
    expect(quizToProfile({ tannin: ['like'] }).tannin).toBe(2)
    expect(quizToProfile({ tannin: ['dislike'] }).tannin).toBe(0)
    expect(quizToProfile({ tannin: ['no'] }).tannin).toBe(1)
  })

  it('maps lemonade or water to acidity', () => {
    expect(quizToProfile({ acidity: ['plain-water'] }).acidity).toBe(0)
    expect(quizToProfile({ acidity: ['lemon-water'] }).acidity).toBe(1)
    expect(quizToProfile({ acidity: ['lemonade'] }).acidity).toBe(2)
  })

  it('maps fruit style, and treats "Either is fine" as no preference', () => {
    expect(quizToProfile({ fruitStyle: ['fresh'] }).fruitCharacter).toBe(0)
    expect(quizToProfile({ fruitStyle: ['jammy'] }).fruitCharacter).toBe(2)
    expect(quizToProfile({ fruitStyle: ['either'] }).fruitCharacter).toBeNull()
  })

  it('turns picked fruits into liked notes (and leaves the others unknown)', () => {
    const p = quizToProfile({ fruit: ['strawberry', 'lemon', 'bell-pepper'] })
    expect(p.fruitNotes).toEqual({ 'red-berry': 1, citrus: 1, green: 1 })
  })

  it('turns scents into flower and extra notes', () => {
    const p = quizToProfile({ scent: ['roses', 'vanilla', 'smoke'] })
    expect(p.flowerNotes).toEqual({ roses: 1 })
    expect(p.extras).toEqual({ vanilla: 1, 'baking-spice': 1, smoke: 1 })
  })

  it('treats "None of these" as a mild dislike of every flower and extra note', () => {
    const p = quizToProfile({ scent: ['none'] })
    for (const n of FLOWER_NOTES) expect(p.flowerNotes[n]).toBeLessThan(0)
    for (const n of EXTRAS) expect(p.extras[n]).toBeLessThan(0)
  })

  it('likes picked types and counts the other offered types as a mismatch', () => {
    const p = quizToProfile({ type: ['red', 'rosé'] })
    expect(p.types.red).toBe(1)
    expect(p.types['rosé']).toBe(1)
    expect(p.types.white).toBeLessThan(0)
    expect(p.types.sparkling).toBeLessThan(0)
    expect(p.types.orange).toBeUndefined() // not asked, so no opinion
  })

  it('a stop after two screens still makes a usable profile', () => {
    const p = quizToProfile({ type: ['white'], body: ['skim'] })
    expect(isEmptyProfile(p)).toBe(false)
    expect(p.body).toBe(0)
    expect(p.acidity).toBeNull()
  })

  it('always produces a profile the schema accepts, and remembers the answers', () => {
    const answers = { type: ['red'], body: ['whole'], fruit: ['blackberry'], scent: ['smoke'] }
    const p = quizToProfile(answers)
    expect(TasteProfileSchema.parse(p)).toEqual(p)
    expect(p.quizAnswers).toEqual(answers)
  })
})

describe('helpers', () => {
  it('chosen drops "Not sure"', () => {
    expect(chosen({ type: [UNSURE] }, 'type')).toEqual([])
    expect(chosen({ type: ['red', UNSURE] }, 'type')).toEqual(['red'])
  })
  it('cleanAnswers drops unknown questions', () => {
    expect(cleanAnswers({ body: ['whole'], evil: ['x'] })).toEqual({ body: ['whole'] })
  })
  it('stepsAnswered counts screens with a real answer', () => {
    expect(stepsAnswered({})).toBe(0)
    expect(stepsAnswered({ type: ['red'], body: [UNSURE], sweetness: ['none'] })).toBe(2)
    expect(stepsAnswered({ fruitStyle: ['fresh'] })).toBe(1) // the fruit screen has two questions
  })
})

describe('quiz definition', () => {
  it('has 6 screens and every question offers real choices', () => {
    expect(QUIZ_STEPS).toHaveLength(6)
    for (const q of QUIZ_STEPS.flatMap((s) => s.questions)) {
      expect(q.options.length).toBeGreaterThanOrEqual(3)
      expect(q.options.some((o) => o.value === UNSURE)).toBe(false) // "Not sure" is added by the screen, once
    }
  })
})
