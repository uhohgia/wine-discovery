// Plain-language words used to explain why a bottle fits (or doesn't). No wine jargon on purpose.
import type { OrdinalDim } from './scales'
import type { Body, Acidity, FruitCharacter, Sweetness, Tannin } from './vocab'

/** How to describe a bottle's value, in a sentence that starts "It's …". */
export const BOTTLE_WORDS: {
  body: Record<Body, string>
  sweetness: Record<Sweetness, string>
  acidity: Record<Acidity, string>
  tannin: Record<Tannin, string>
  fruitCharacter: Record<FruitCharacter, string>
} = {
  body: { light: 'light', medium: 'medium-bodied', full: 'full-bodied' },
  sweetness: { dry: 'dry', 'off-dry': 'a touch sweet', sweet: 'sweet' },
  acidity: { soft: 'smooth', medium: 'nicely balanced', zippy: 'zippy' },
  tannin: { low: 'soft on the mouth', medium: 'a little grippy', high: 'dry and grippy' },
  fruitCharacter: { fresh: 'fresh', dried: 'ripe', jammy: 'jammy' },
}

/** How to describe a person's preference at the low, middle and high end, after "you like …". */
export const PREFER_WORDS: Record<OrdinalDim, readonly [string, string, string]> = {
  body: ['lighter wines', 'medium-bodied wines', 'rich, full wines'],
  sweetness: ['dry wines', 'wines with a touch of sweetness', 'sweet wines'],
  acidity: ['smooth, soft wines', 'nicely balanced wines', 'zippy wines'],
  tannin: ['wines that feel soft and easy', 'wines with a little grip', 'a dry, grippy feel'],
  fruitCharacter: ['fresh, crisp fruit', 'ripe fruit', 'ripe, jammy fruit'],
}

/** Wine types as everyday words. */
export const TYPE_WORDS = {
  red: 'red',
  white: 'white',
  'rosé': 'rosé',
  sparkling: 'bubbly',
  orange: 'orange wine',
  other: 'wine',
} as const
