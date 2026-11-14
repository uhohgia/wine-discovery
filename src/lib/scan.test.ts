import { describe, expect, it } from 'vitest'
import { CONCEPTS, isConceptId } from '@/data/concepts'
import { SEED_BOTTLES } from '@/data/bottles'
import { pickScanBottle } from './scan'

const shelf = SEED_BOTTLES.slice(0, 3)

describe('pickScanBottle', () => {
  it('picks from the shelf when there is one', () => {
    for (let i = 0; i < 25; i++) {
      const pick = pickScanBottle(shelf, SEED_BOTTLES)!
      expect(pick.from).toBe('shelf')
      expect(shelf.map((b) => b.id)).toContain(pick.bottle.id)
    }
  })

  it('falls back to the catalog when the shelf is empty, so a scan always works', () => {
    const pick = pickScanBottle([], SEED_BOTTLES)!
    expect(pick.from).toBe('catalog')
    expect(SEED_BOTTLES.map((b) => b.id)).toContain(pick.bottle.id)
  })

  it('returns null only when there are no bottles at all', () => {
    expect(pickScanBottle([], [])).toBeNull()
  })

  it('does not repeat the last pick when there is anything else', () => {
    for (const r of [0, 0.34, 0.67, 0.999]) expect(pickScanBottle(shelf, SEED_BOTTLES, shelf[0]!.id, () => r)!.bottle.id).not.toBe(shelf[0]!.id)
  })

  it('a one-bottle shelf still works, even right after picking it', () => {
    const only = [shelf[0]!]
    expect(pickScanBottle(only, SEED_BOTTLES, only[0]!.id)!.bottle.id).toBe(only[0]!.id)
  })

  it('is deterministic for a given random number, and covers the whole pool', () => {
    expect(pickScanBottle(shelf, SEED_BOTTLES, null, () => 0)!.bottle.id).toBe(shelf[0]!.id)
    expect(pickScanBottle(shelf, SEED_BOTTLES, null, () => 0.999999)!.bottle.id).toBe(shelf[2]!.id)
    expect(pickScanBottle(shelf, SEED_BOTTLES, null, () => 1)!.bottle.id).toBe(shelf[2]!.id) // never runs off the end
    const seen = new Set([0, 0.4, 0.8].map((r) => pickScanBottle(shelf, SEED_BOTTLES, null, () => r)!.bottle.id))
    expect(seen.size).toBe(3)
  })
})

describe('concept screens', () => {
  it('are the six from the brief, with unique ids and friendly titles', () => {
    expect(CONCEPTS.map((c) => c.id)).toEqual(['non-alcoholic', 'gift-mode', 'budget', 'store-finder', 'host-card', 'more-from-producer'])
    expect(new Set(CONCEPTS.map((c) => c.title)).size).toBe(6)
    for (const c of CONCEPTS) {
      expect(c.title.length).toBeGreaterThan(3)
      expect(c.summary.length).toBeGreaterThan(10)
    }
  })
  it('recognises only real concept ids', () => {
    expect(isConceptId('budget')).toBe(true)
    expect(isConceptId('toString')).toBe(false)
    expect(isConceptId('')).toBe(false)
  })
})
