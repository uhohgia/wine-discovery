import { describe, expect, it } from 'vitest'
import { CHEAP_UNDER, MID_UP_TO } from '@/data/pricing'
import { priceFeel, priceSymbols, priceWords } from './pricing'

describe('price feel', () => {
  it('uses the thresholds: $ under 15, $$ 15 to 30, $$$ over 30', () => {
    expect(priceFeel(0)).toBe(1)
    expect(priceFeel(14.99)).toBe(1)
    expect(priceFeel(CHEAP_UNDER)).toBe(2)
    expect(priceFeel(22)).toBe(2)
    expect(priceFeel(MID_UP_TO)).toBe(2)
    expect(priceFeel(30.01)).toBe(3)
    expect(priceFeel(250)).toBe(3)
  })
  it('shows dollar signs and a plain-words caption', () => {
    expect(priceSymbols(12)).toBe('$')
    expect(priceSymbols(22)).toBe('$$')
    expect(priceSymbols(38)).toBe('$$$')
    expect(priceWords(22.4)).toBe('Mid-range, about $22')
  })
})
