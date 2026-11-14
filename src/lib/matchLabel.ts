// Matches what was READ off a label (maker, wine name, year, type) to a bottle in our catalog.
// Pure and tunable: the numbers below are the only knobs.
import type { Bottle } from '@/data/bottles'
import { foldText } from './normalize'

/** What the label reader found. Mirrors the Edge Function's answer. */
export interface LabelReading {
  is_wine_label: boolean
  producer: string | null
  name: string | null
  vintage: number | null
  type: 'red' | 'white' | 'rosé' | 'sparkling' | 'orange' | 'other' | null
}

export type LabelMatch =
  | { kind: 'match'; bottle: Bottle; score: number }
  /** Not sure enough to call it, but these are close: show them and let the person choose. */
  | { kind: 'similar'; bottles: Bottle[] }
  | { kind: 'none' }

/** Words that say nothing about WHICH wine it is (every label has them). */
const FILLER = new Set([
  'the', 'of', 'de', 'du', 'la', 'le', 'and', 'et', 'dr', 'domaine', 'chateau', 'weingut',
  'wine', 'wines', 'winery', 'vineyard', 'vineyards', 'cellars', 'estate', 'estates', 'grown', 'family',
  'red', 'white', 'rose', 'sparkling', 'table', 'reserve', 'portfolio', 'california', 'usa',
])

/** Weights: the maker's name counts double, because it's the surest clue. */
export const PRODUCER_WEIGHT = 2
export const NAME_WEIGHT = 1
/** How much of the final score comes from "the bottle's words were all seen" vs "everything read belongs to the bottle". */
const COVERAGE_SHARE = 0.6
/** A matching year adds this; a different year takes away MISMATCH. */
export const VINTAGE_BONUS = 0.15
export const VINTAGE_MISMATCH = 0.3
export const TYPE_MISMATCH = 0.2
/** At or above this (and clearly ahead of the runner-up) it's a match. */
export const MATCH_AT = 0.6
export const MARGIN = 0.15
/** At or above this it's at least "similar". */
export const SIMILAR_AT = 0.35

const words = (s: string | null): string[] =>
  foldText(s ?? '')
    .split(' ')
    .filter((w) => w.length > 1 && !FILLER.has(w) && !/^\d+$/.test(w))

/** Edit distance, to forgive a misread letter in a long word. */
function distance(a: string, b: string): number {
  const row = Array.from({ length: b.length + 1 }, (_, i) => i)
  for (let i = 1; i <= a.length; i++) {
    let prev = row[0]!
    row[0] = i
    for (let j = 1; j <= b.length; j++) {
      const tmp = row[j]!
      row[j] = Math.min(row[j]! + 1, row[j - 1]! + 1, prev + (a[i - 1] === b[j - 1] ? 0 : 1))
      prev = tmp
    }
  }
  return row[b.length]!
}

const same = (a: string, b: string) => a === b || (a.length >= 5 && b.length >= 5 && distance(a, b) <= 1)

function score(reading: LabelReading, bottle: Bottle): number {
  const read = [...words(reading.producer), ...words(reading.name)]
  if (read.length === 0) return 0
  const hasProducer = words(reading.producer).length > 0
  // The bottle's words, each with a weight. If the label didn't show a maker, don't hold that against the bottle.
  const wanted: { word: string; weight: number }[] = [
    ...(hasProducer ? words(bottle.producer).map((word) => ({ word, weight: PRODUCER_WEIGHT })) : []),
    ...words(bottle.name).map((word) => ({ word, weight: NAME_WEIGHT })),
  ]
  const total = wanted.reduce((n, w) => n + w.weight, 0)
  if (total === 0) return 0
  const seen = wanted.filter((w) => read.some((r) => same(r, w.word))).reduce((n, w) => n + w.weight, 0)
  const explained = read.filter((r) => wanted.some((w) => same(r, w.word))).length
  let s = COVERAGE_SHARE * (seen / total) + (1 - COVERAGE_SHARE) * (explained / read.length)
  if (reading.vintage !== null && bottle.vintage !== null) s += reading.vintage === bottle.vintage ? VINTAGE_BONUS : -VINTAGE_MISMATCH
  if (reading.type !== null && reading.type !== bottle.type) s -= TYPE_MISMATCH
  // With no maker on the label, a grape or style alone is too common to be sure: the year must back it up.
  if (!hasProducer && !(reading.vintage !== null && reading.vintage === bottle.vintage)) s = Math.min(s, MATCH_AT - 0.01)
  return Math.max(0, Math.min(1, s))
}

/** Finds the catalog bottle a label reading most likely means. */
export function matchLabel(bottles: readonly Bottle[], reading: LabelReading): LabelMatch {
  if (!reading.is_wine_label) return { kind: 'none' }
  const ranked = bottles
    .map((bottle) => ({ bottle, score: score(reading, bottle) }))
    .sort((a, b) => b.score - a.score)
  const best = ranked[0]
  if (!best || best.score < SIMILAR_AT) return { kind: 'none' }
  const next = ranked[1]?.score ?? 0
  if (best.score >= MATCH_AT && best.score - next >= MARGIN) return { kind: 'match', bottle: best.bottle, score: best.score }
  return { kind: 'similar', bottles: ranked.filter((r) => r.score >= SIMILAR_AT).slice(0, 3).map((r) => r.bottle) }
}
