// The taste quiz: its screens, and the rule tables that turn answers into a taste profile.
// Tune the numbers here; the logic in src/lib/quiz.ts doesn't need to change.
import type { Extra, FlowerNote, FruitNote, WineType } from './vocab'
import type { OrdinalDim } from './scales'

/** Every question can be answered "Not sure". Its value is the same everywhere. */
export const UNSURE = 'unsure'

export type QuestionId = 'type' | 'body' | 'sweetness' | 'tannin' | 'fruit' | 'fruitStyle' | 'scent' | 'acidity'

export interface QuizOption {
  value: string
  label: string
}
export interface QuizQuestion {
  id: QuestionId
  prompt: string
  help?: string
  multi: boolean
  options: readonly QuizOption[]
}
export interface QuizStep {
  id: string
  title: string
  questions: readonly QuizQuestion[]
}

export const QUIZ_STEPS: readonly QuizStep[] = [
  {
    id: 'type',
    title: 'What do you usually reach for?',
    questions: [
      {
        id: 'type',
        prompt: 'Pick all that apply',
        multi: true,
        options: [
          { value: 'red', label: 'Red wine' },
          { value: 'white', label: 'White wine' },
          { value: 'rosé', label: 'Rosé' },
          { value: 'sparkling', label: 'Bubbly' },
        ],
      },
    ],
  },
  {
    id: 'body',
    title: 'Which milk goes in your coffee?',
    questions: [
      {
        id: 'body',
        prompt: 'No wrong answer. This tells us how rich you like things.',
        multi: false,
        options: [
          { value: 'skim', label: 'Skim' },
          { value: '2pct', label: '2%' },
          { value: 'whole', label: 'Whole' },
        ],
      },
    ],
  },
  {
    id: 'coffee-tea',
    title: 'Coffee and tea',
    questions: [
      {
        id: 'sweetness',
        prompt: 'Do you add sugar?',
        multi: false,
        options: [
          { value: 'none', label: 'No, I take it plain' },
          { value: 'little', label: 'A little' },
          { value: 'sweet', label: 'Yes, I like it sweet' },
        ],
      },
      {
        id: 'tannin',
        prompt: 'Does strong black tea dry out your mouth?',
        multi: false,
        options: [
          { value: 'like', label: 'Yes, and I like that' },
          { value: 'dislike', label: 'Yes, and I’m not a fan' },
          { value: 'no', label: 'Not really' },
        ],
      },
    ],
  },
  {
    id: 'fruit',
    title: 'Fruit',
    questions: [
      {
        id: 'fruit',
        prompt: 'Which fruits do you love? Pick as many as you like.',
        multi: true,
        options: [
          { value: 'strawberry', label: 'Strawberry or cranberry' },
          { value: 'blueberry', label: 'Blueberry' },
          { value: 'blackberry', label: 'Blackberry or plum' },
          { value: 'lemon', label: 'Lemon' },
          { value: 'peach', label: 'Peach' },
          { value: 'apple-pear', label: 'Apple or pear' },
          { value: 'pineapple', label: 'Pineapple' },
          { value: 'bell-pepper', label: 'Bell pepper' },
        ],
      },
      {
        id: 'fruitStyle',
        prompt: 'How do you like your fruit?',
        multi: false,
        options: [
          { value: 'fresh', label: 'Fresh and crisp, like just picked' },
          { value: 'jammy', label: 'Ripe and juicy, like jam' },
          { value: 'either', label: 'Either is fine' },
        ],
      },
    ],
  },
  {
    id: 'scent',
    title: 'Which scents do you like?',
    questions: [
      {
        id: 'scent',
        prompt: 'Pick all that apply',
        multi: true,
        options: [
          { value: 'roses', label: 'Roses' },
          { value: 'white-flowers', label: 'White flowers, like jasmine' },
          { value: 'purple-flowers', label: 'Purple flowers, like violets or lavender' },
          { value: 'vanilla', label: 'Vanilla or cinnamon' },
          { value: 'smoke', label: 'Smoke, like a campfire' },
          { value: 'none', label: 'None of these' },
        ],
      },
    ],
  },
  {
    id: 'acidity',
    title: 'Lemonade or plain water?',
    questions: [
      {
        id: 'acidity',
        prompt: 'How zingy do you like your drinks?',
        multi: false,
        options: [
          { value: 'plain-water', label: 'Plain water, nice and smooth' },
          { value: 'lemon-water', label: 'Water with a squeeze of lemon' },
          { value: 'lemonade', label: 'Lemonade, I like the zing' },
        ],
      },
    ],
  },
]

/** The quiz screen number (1-based) after which "Show me wines now" appears. */
export const SHOW_WINES_AFTER_STEP = 2

// ---------- rule tables: answer -> profile ----------

/** Single-choice answers that set a 0 to 2 target. An option missing from a table ("either") means "no preference". */
export const ORDINAL_RULES: Partial<Record<QuestionId, { dim: OrdinalDim; values: Record<string, number> }>> = {
  body: { dim: 'body', values: { skim: 0, '2pct': 1, whole: 2 } },
  sweetness: { dim: 'sweetness', values: { none: 0, little: 1, sweet: 2 } },
  tannin: { dim: 'tannin', values: { dislike: 0, no: 1, like: 2 } },
  fruitStyle: { dim: 'fruitCharacter', values: { fresh: 0, jammy: 2 } },
  acidity: { dim: 'acidity', values: { 'plain-water': 0, 'lemon-water': 1, lemonade: 2 } },
}

/** Picked fruits become liked notes. */
export const FRUIT_RULES: Record<string, FruitNote> = {
  strawberry: 'red-berry',
  blueberry: 'blue-fruit',
  blackberry: 'dark-fruit',
  lemon: 'citrus',
  peach: 'stone-fruit',
  'apple-pear': 'apple-pear',
  pineapple: 'tropical',
  'bell-pepper': 'green',
}

/** Picked scents become liked flower or extra notes. */
export const SCENT_RULES: Record<string, { flowerNotes?: FlowerNote[]; extras?: Extra[] }> = {
  roses: { flowerNotes: ['roses'] },
  'white-flowers': { flowerNotes: ['white-flowers'] },
  'purple-flowers': { flowerNotes: ['purple-flowers'] },
  vanilla: { extras: ['vanilla', 'baking-spice'] },
  smoke: { extras: ['smoke'] },
}

/** Choosing "None of these" nudges every flower and extra note slightly negative. */
export const NO_SCENTS_AFFINITY = -0.3

export const LIKED_AFFINITY = 1

/** Types offered in the quiz. If you pick some, the others count as a mismatch. Orange and "other" aren't asked. */
export const QUIZ_TYPES: readonly WineType[] = ['red', 'white', 'rosé', 'sparkling']
export const TYPE_MISMATCH_AFFINITY = -0.6
