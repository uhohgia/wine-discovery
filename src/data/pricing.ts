// "Price feel" thresholds, in dollars. Change them here and everything follows.
//   $   = under CHEAP_UNDER
//   $$  = CHEAP_UNDER up to and including MID_UP_TO
//   $$$ = over MID_UP_TO
export const CHEAP_UNDER = 15
export const MID_UP_TO = 30

export type PriceFeel = 1 | 2 | 3

export const PRICE_FEEL_WORDS: Record<PriceFeel, string> = {
  1: 'Easy on the wallet',
  2: 'Mid-range',
  3: 'A treat',
}
