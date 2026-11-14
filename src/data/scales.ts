// The four "feel" scales, with the everyday analogy for each stop. Order matters: stop 0 is the lowest.
import { ACIDITY, BODIES, FRUIT_CHARACTER, SWEETNESS, TANNIN } from './vocab'

/** Ordinal dimensions: a wine has one value on each; a taste profile has a 0 to 2 target on each. */
export const ORDER = {
  body: BODIES,
  sweetness: SWEETNESS,
  acidity: ACIDITY,
  tannin: TANNIN,
  fruitCharacter: FRUIT_CHARACTER,
} as const
export type OrdinalDim = keyof typeof ORDER

/** Position (0, 1 or 2) of a wine's value on a dimension. */
export function ordinal(dim: OrdinalDim, value: string): number {
  return (ORDER[dim] as readonly string[]).indexOf(value)
}

export interface ScaleInfo {
  title: string
  /** Everyday analogy for the low / middle / high end. */
  stops: readonly [string, string, string]
}

export const SCALES: Record<'body' | 'sweetness' | 'acidity' | 'tannin', ScaleInfo> = {
  body: { title: 'Body', stops: ['Skim milk', '2% milk', 'Whole milk'] },
  sweetness: { title: 'Sweetness', stops: ['Black coffee', 'A little sugar', 'Sweet'] },
  acidity: { title: 'Zing', stops: ['Plain water', 'Lemon water', 'Lemonade'] },
  tannin: { title: 'Dry, grippy feel', stops: ['Green tea', 'Black tea', 'Strong black tea'] },
}
