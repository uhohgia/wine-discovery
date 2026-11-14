import { beforeEach, describe, expect, it } from 'vitest'
import { quizToProfile } from '@/lib/quiz'
import { isEmptyProfile } from '@/lib/profile'
import { createLocalWdRepo, readLocalEvents } from './localWdRepo'

beforeEach(() => localStorage.clear())

describe('localWdRepo', () => {
  const repo = createLocalWdRepo()

  it('starts with no profile', async () => {
    expect(await repo.getProfile('u1')).toBeNull()
  })

  it('confirming age creates the row without touching the (empty) quiz results', async () => {
    const row = await repo.saveProfile('u1', { ageConfirmedAt: '2026-11-08T00:00:00Z' })
    expect(row.ageConfirmedAt).toBe('2026-11-08T00:00:00Z')
    expect(isEmptyProfile(row.prefs)).toBe(true)
  })

  it('saving the quiz keeps the age confirmation, and vice versa', async () => {
    await repo.saveProfile('u1', { ageConfirmedAt: '2026-11-08T00:00:00Z' })
    const prefs = quizToProfile({ type: ['red'], body: ['whole'] })
    const saved = await repo.saveProfile('u1', { prefs })
    expect(saved.ageConfirmedAt).toBe('2026-11-08T00:00:00Z')
    expect(saved.prefs.body).toBe(2)
    const again = await repo.getProfile('u1')
    expect(again?.prefs.types.red).toBe(1)
    await repo.saveProfile('u1', { ratingCount: 3 })
    expect((await repo.getProfile('u1'))?.prefs.body).toBe(2)
  })

  it('keeps people separate', async () => {
    await repo.saveProfile('u1', { prefs: quizToProfile({ body: ['skim'] }) })
    expect(await repo.getProfile('u2')).toBeNull()
  })

  it('survives unreadable stored data by starting fresh', async () => {
    localStorage.setItem('wd:demo:u1:profile', JSON.stringify({ prefs: { body: 99 }, ratingCount: 1, ageConfirmedAt: null }))
    const row = await repo.getProfile('u1')
    expect(isEmptyProfile(row!.prefs)).toBe(true)
  })

  it('records events', async () => {
    await repo.recordEvent('u1', 'quiz_started', { editing: false })
    expect(readLocalEvents('u1').map((e) => e.name)).toEqual(['quiz_started'])
  })

  it('lists the placeholder catalog', async () => {
    const bottles = await repo.listBottles()
    expect(bottles).toHaveLength(10)
    expect(bottles.every((b) => b.is_placeholder)).toBe(true)
  })

  it('keeps a shelf: add, add again to change bought/gift, remove, newest first', async () => {
    await repo.addToShelf('u1', 'sample-red-1', 'bought')
    await repo.addToShelf('u1', 'sample-white-1', 'gift')
    expect((await repo.listShelf('u1')).map((i) => i.bottleId)).toEqual(['sample-white-1', 'sample-red-1'])
    await repo.addToShelf('u1', 'sample-red-1', 'gift')
    const shelf = await repo.listShelf('u1')
    expect(shelf).toHaveLength(2)
    expect(shelf[0]).toMatchObject({ bottleId: 'sample-red-1', source: 'gift' })
    await repo.removeFromShelf('u1', 'sample-red-1')
    expect((await repo.listShelf('u1')).map((i) => i.bottleId)).toEqual(['sample-white-1'])
  })

  it('shelves are private to each person, and unknown bottles are refused', async () => {
    await repo.addToShelf('u1', 'sample-red-2', 'bought')
    expect(await repo.listShelf('u2')).toEqual([])
    await expect(repo.addToShelf('u1', 'no-such-bottle', 'bought')).rejects.toThrow(/know that bottle/)
  })

  it('keeps ratings, oldest first, and lets the same bottle be rated again', async () => {
    const a = await repo.addRating('u1', { bottleId: 'sample-red-1', verdict: 'loved', reasons: [] })
    const b = await repo.addRating('u1', { bottleId: 'sample-red-1', verdict: 'not-for-me', reasons: ['too-heavy', 'flavor'] })
    expect(a.id).not.toBe(b.id)
    const all = await repo.listRatings('u1')
    expect(all.map((r) => r.verdict)).toEqual(['loved', 'not-for-me'])
    expect(all[1]!.reasons).toEqual(['too-heavy', 'flavor'])
    expect(await repo.listRatings('u2')).toEqual([])
  })

  it('can take a rating back, and refuses unknown bottles', async () => {
    const r = await repo.addRating('u1', { bottleId: 'sample-red-2', verdict: 'fine', reasons: [] })
    await repo.removeRating('u1', r.id)
    expect(await repo.listRatings('u1')).toEqual([])
    await expect(repo.addRating('u1', { bottleId: 'nope', verdict: 'loved', reasons: [] })).rejects.toThrow(/know that bottle/)
  })

  it('deleteMyData removes one person’s profile, shelf, ratings and events, and nobody else’s', async () => {
    for (const id of ['u1', 'u2']) {
      await repo.saveProfile(id, { prefs: quizToProfile({ body: ['skim'] }), ratingCount: 1, ageConfirmedAt: 'x' })
      await repo.addToShelf(id, 'sample-red-1', 'bought')
      await repo.addRating(id, { bottleId: 'sample-red-1', verdict: 'loved', reasons: [] })
      await repo.recordEvent(id, 'quiz_started')
    }
    await repo.deleteMyData('u1')
    expect(await repo.getProfile('u1')).toBeNull()
    expect(await repo.listShelf('u1')).toEqual([])
    expect(await repo.listRatings('u1')).toEqual([])
    expect(readLocalEvents('u1')).toEqual([])
    expect((await repo.getProfile('u2'))?.ratingCount).toBe(1)
    expect(await repo.listShelf('u2')).toHaveLength(1)
    expect(await repo.listRatings('u2')).toHaveLength(1)
    expect(readLocalEvents('u2')).toHaveLength(1)
  })
})
