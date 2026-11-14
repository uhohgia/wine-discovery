// Plain-language names for flavor notes. `short` reads inside a sentence ("lighter, red-berry wines");
// `long` labels a chip ("Strawberry & cranberry").
import type { Extra, FlowerNote, FruitNote } from './vocab'

interface Label {
  short: string
  long: string
}

export const FRUIT_LABELS: Record<FruitNote, Label> = {
  'red-berry': { short: 'red-berry', long: 'Strawberry & cranberry' },
  'blue-fruit': { short: 'blueberry', long: 'Blueberry' },
  'dark-fruit': { short: 'dark-fruit', long: 'Blackberry & plum' },
  green: { short: 'green-pepper', long: 'Bell pepper (green)' },
  citrus: { short: 'citrus', long: 'Lemon & citrus' },
  'stone-fruit': { short: 'peachy', long: 'Peach' },
  tropical: { short: 'tropical', long: 'Pineapple & tropical' },
  'apple-pear': { short: 'apple-and-pear', long: 'Apple & pear' },
}

export const FLOWER_LABELS: Record<FlowerNote, Label> = {
  'white-flowers': { short: 'white-flower', long: 'White flowers' },
  'purple-flowers': { short: 'purple-flower', long: 'Purple flowers' },
  roses: { short: 'rose', long: 'Roses' },
}

export const EXTRA_LABELS: Record<Extra, Label> = {
  'baking-spice': { short: 'spice', long: 'Baking spice (cinnamon)' },
  vanilla: { short: 'vanilla', long: 'Vanilla' },
  toast: { short: 'toasty', long: 'Toast' },
  smoke: { short: 'smoky', long: 'Smoke' },
  earthy: { short: 'earthy', long: 'Earthy (forest floor)' },
}
