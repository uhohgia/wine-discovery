// How a rating changes a taste profile, and the warm words we say back. Tune these numbers and phrases;
// the logic in src/lib/rating.ts doesn't need to change.
import type { OrdinalDim } from './scales'
import type { DislikeReason } from './vocab'

/** "Loved it" pulls each known scale target this fraction of the way toward the bottle (and adopts the bottle's value where we knew nothing). */
export const LOVED_PULL = 0.35
/** "It was fine" is a light nudge toward the bottle, and only where we already had an opinion. */
export const FINE_PULL = 0.1
/** "Loved it" also makes the bottle's type and flavors a little more liked. */
export const LOVED_AFFINITY_BOOST = 0.3
/** "Didn't like the flavor" makes each flavor in the bottle less liked. */
export const FLAVOR_DISLIKE_DROP = 0.4
/**
 * How far past the bottle's own value a "too much of X" complaint pushes the preference: a full notch on the
 * 0 to 2 scale. For "too sharp" on a zippy bottle that lands on "balanced", halfway to smooth.
 */
export const DISLIKE_STEP = 1

export interface DislikeRule {
  /** What the person taps. */
  label: string
  /** The scale this reason moves, and which way (+1 = higher, -1 = lower). Omitted for flavor and "not sure". */
  dim?: OrdinalDim
  direction?: 1 | -1
  /** Finishes "Good to know. We’ll …" */
  phrase: string
}

export const DISLIKE_RULES: Record<DislikeReason, DislikeRule> = {
  'too-dry': { label: 'Too dry', dim: 'sweetness', direction: 1, phrase: 'look for wines with a touch of sweetness' },
  'too-sharp': { label: 'Too sharp or sour', dim: 'acidity', direction: -1, phrase: 'steer away from sharp wines' },
  'too-heavy': { label: 'Too heavy', dim: 'body', direction: -1, phrase: 'look for lighter wines' },
  'too-sweet': { label: 'Too sweet', dim: 'sweetness', direction: -1, phrase: 'go easier on the sweetness' },
  'mouth-drying': { label: 'Mouth-drying or bitter', dim: 'tannin', direction: -1, phrase: 'go easy on the dry, grippy feel' },
  'too-light': { label: 'Too light or watery', dim: 'body', direction: 1, phrase: 'look for wines with a bit more body' },
  flavor: { label: 'Didn’t like the flavor', phrase: 'go easier on those flavors' },
  'not-sure': { label: 'Not sure', phrase: '' },
}

export const VERDICT_LABELS = {
  loved: 'Loved it',
  fine: 'It was fine',
  'not-for-me': 'Not for me',
} as const

export const VERDICT_HINTS = {
  loved: 'More like this, please',
  fine: 'Nothing special, nothing wrong',
  'not-for-me': 'Not your style? That helps us too',
} as const

export const CONFIRMATIONS = {
  loved: 'Great! We’ll look for more wines like this one.',
  fine: 'Thanks for letting us know. A “fine” helps us too.',
  /** Not for me, with no specific reason (or "not sure"). */
  notForMeNoReason: 'Not your style? That helps us too. We’ve noted it.',
} as const
