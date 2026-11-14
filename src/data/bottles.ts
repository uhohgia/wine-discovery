import { z } from 'zod'
import real from './bottles.json'
import sample from './bottles.sample.json'
import {
  ACIDITY,
  BODIES,
  EXTRAS,
  FLOWER_NOTES,
  FRUIT_CHARACTER,
  FRUIT_NOTES,
  OCCASIONS,
  SWEETNESS,
  TANNIN,
  TYPES,
} from './vocab'

/** An array whose items must be distinct and come from a controlled vocabulary. */
const pick = <T extends readonly [string, ...string[]]>(values: T) =>
  z
    .array(z.enum(values))
    .max(values.length)
    .refine((a) => new Set(a).size === a.length, 'Values must not repeat')

const text = z.string().trim().min(1)

/** One bottle, as stored in `wd_bottles` and in `bottles.json`. Unknown keys and unknown vocabulary values are errors. */
export const Bottle = z
  .strictObject({
    id: z.string().regex(/^[a-z0-9]+(-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and dashes'),
    name: text.max(120),
    producer: text.max(120),
    vintage: z.number().int().min(1900).max(2100).nullable(),
    type: z.enum(TYPES),
    price: z.number().min(0).max(100000),
    body: z.enum(BODIES),
    sweetness: z.enum(SWEETNESS),
    acidity: z.enum(ACIDITY),
    tannin: z.enum(TANNIN),
    fruit_character: z.enum(FRUIT_CHARACTER),
    fruit_notes: pick(FRUIT_NOTES),
    flower_notes: pick(FLOWER_NOTES),
    extras: pick(EXTRAS),
    /** Plain-language suggestions shown on the wine card, e.g. "Grilled chicken". */
    pairings: z.array(text.max(60)).min(1).max(5),
    occasions: pick(OCCASIONS),
    serve_tip: text.max(200),
    talking_point: text.max(240),
    easy_to_like: z.boolean(),
    usually_sold_at: z.array(text.max(60)).max(6),
    label_image_path: z.string().nullable(),
    is_placeholder: z.boolean(),
  })
  .refine((b) => b.type !== 'white' && b.type !== 'sparkling' ? true : b.tannin === 'low', {
    path: ['tannin'],
    message: 'Use "low" tannin for whites and sparkling wines',
  })
export type Bottle = z.infer<typeof Bottle>

export const BottleList = z
  .array(Bottle)
  .min(1)
  .refine((list) => new Set(list.map((b) => b.id)).size === list.length, 'Bottle ids must be unique')

/** Throws a readable error listing every problem. Used by `npm run bottles:check` and the tests. */
export function parseBottles(data: unknown): Bottle[] {
  const result = BottleList.safeParse(data)
  if (result.success) return result.data
  const lines = result.error.issues.map((i) => `  • ${i.path.length ? i.path.join('.') : '(list)'}: ${i.message}`)
  throw new Error(`bottles.json has problems:\n${lines.join('\n')}`)
}

/** Every bottle in the catalog, as read from the file (`bottles.json`: your real bottles). */
export const REAL_BOTTLES: Bottle[] = parseBottles(real)
/** Ten made-up bottles ("Sample Red 1"…) that the automated tests use, so tests don't change when the real catalog does. */
export const SAMPLE_BOTTLES: Bottle[] = parseBottles(sample)

/**
 * The catalog the app starts with in device-only demo mode (with Supabase, the database's `wd_bottles` is used instead).
 * Tests set VITE_CATALOG=sample to get the made-up bottles.
 */
export const SEED_BOTTLES: Bottle[] = import.meta.env?.VITE_CATALOG === 'sample' ? SAMPLE_BOTTLES : REAL_BOTTLES

/** Wine jargon that shouldn't appear unexplained in the friendly text. Returns the words found. */
export const JARGON = ['tannin', 'tannic', 'acidity', 'astringent', 'malolactic', 'terroir', 'palate', 'finish', 'structure', 'minerality', 'nose'] as const
export function jargonIn(b: Pick<Bottle, 'serve_tip' | 'talking_point' | 'pairings'>): string[] {
  const text = [b.serve_tip, b.talking_point, ...b.pairings].join(' ').toLowerCase()
  return JARGON.filter((w) => new RegExp(`\\b${w}\\b`).test(text))
}
