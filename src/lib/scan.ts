// The simulated scan: no camera, no recognition. It picks a bottle so people can feel how scanning will work.
import type { Bottle } from '@/data/bottles'

export interface ScanPick {
  bottle: Bottle
  /** Where the bottle came from: the person's own shelf, or (if the shelf is empty) the sample catalog. */
  from: 'shelf' | 'catalog'
}

/**
 * Picks a bottle from the shelf, or from the catalog when the shelf is empty. It avoids repeating the last
 * pick when there is anything else to choose. Returns null only if there are no bottles at all.
 * `random` is injectable so tests are deterministic.
 */
export function pickScanBottle(shelf: readonly Bottle[], catalog: readonly Bottle[], lastId: string | null = null, random: () => number = Math.random): ScanPick | null {
  const from = shelf.length > 0 ? 'shelf' : 'catalog'
  const pool = from === 'shelf' ? shelf : catalog
  if (pool.length === 0) return null
  const fresh = pool.length > 1 ? pool.filter((b) => b.id !== lastId) : pool
  const index = Math.min(fresh.length - 1, Math.floor(random() * fresh.length))
  return { bottle: fresh[index]!, from }
}
