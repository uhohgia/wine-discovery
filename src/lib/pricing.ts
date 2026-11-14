import { CHEAP_UNDER, MID_UP_TO, PRICE_FEEL_WORDS, type PriceFeel } from '@/data/pricing'

export function priceFeel(price: number): PriceFeel {
  if (price < CHEAP_UNDER) return 1
  if (price <= MID_UP_TO) return 2
  return 3
}

/** "$$", "$", "$$$" */
export const priceSymbols = (price: number): string => '$'.repeat(priceFeel(price))

/** "Mid-range, about $22" for screen readers and captions. */
export const priceWords = (price: number): string => `${PRICE_FEEL_WORDS[priceFeel(price)]}, about $${Math.round(price)}`
