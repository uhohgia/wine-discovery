// How much each part of a taste profile matters when scoring a bottle, and where the confidence
// labels start. Tune these numbers; the logic in src/lib/scoring.ts doesn't need to change.

export const WEIGHTS = {
  type: 3,
  body: 2,
  sweetness: 2,
  acidity: 1.5,
  tannin: 1.5,
  fruitCharacter: 1,
  fruitNotes: 2,
  flowerNotes: 1,
  extras: 1,
} as const
export type Dimension = keyof typeof WEIGHTS

/** A type the person steers away from multiplies the whole score by this (a strong penalty). */
export const TYPE_MISMATCH_MULTIPLIER = 0.5
/** A type affinity at or above this counts as "a type you usually reach for". */
export const TYPE_LIKED_MIN = 0.5

/** A bottle's match on one dimension counts as a good match at or above this, and a poor one at or below that. */
export const GOOD_MATCH_MIN = 0.75
export const POOR_MATCH_MAX = 0.25

/** Score (0 to 1) at which a bottle becomes "A good bet" / "Worth a try". Below that it's "A stretch". */
export const GOOD_BET_MIN = 0.72
export const WORTH_A_TRY_MIN = 0.52
/** "A good bet" needs either an easy-to-like bottle or at least this many ratings from the person. */
export const MIN_RATINGS_FOR_CONFIDENCE = 3
/** Score used when we know nothing yet. */
export const NEUTRAL_SCORE = 0.5
