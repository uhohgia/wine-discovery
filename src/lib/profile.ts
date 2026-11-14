// The taste profile: what we believe a person likes, as numbers the scoring code can use.
//  - ordinal dimensions: a TARGET from 0 to 2 (for example body 0 = skim milk, 2 = whole milk), or null for "not sure"
//  - wine types and notes: an AFFINITY from -1 (steer away) to 1 (love); a missing key means "no opinion"
import { z } from 'zod'
import { EXTRAS, FLOWER_NOTES, FRUIT_NOTES, TYPES } from '@/data/vocab'
import { ORDER, type OrdinalDim } from '@/data/scales'

const affinity = z.number().min(-1).max(1)
const target = z.number().min(0).max(2).nullable().default(null)

export const TasteProfileSchema = z.object({
  types: z.partialRecord(z.enum(TYPES), affinity).default({}),
  body: target,
  sweetness: target,
  acidity: target,
  tannin: target,
  fruitCharacter: target,
  fruitNotes: z.partialRecord(z.enum(FRUIT_NOTES), affinity).default({}),
  flowerNotes: z.partialRecord(z.enum(FLOWER_NOTES), affinity).default({}),
  extras: z.partialRecord(z.enum(EXTRAS), affinity).default({}),
  /** The quiz answers this profile started from, so "Edit my answers" can reopen the quiz. */
  quizAnswers: z.record(z.string(), z.array(z.string())).optional(),
})
export type TasteProfile = z.infer<typeof TasteProfileSchema>

export const ORDINAL_DIMS = Object.keys(ORDER) as OrdinalDim[]

export const emptyProfile = (): TasteProfile => TasteProfileSchema.parse({})

/** True when we know nothing yet (the quiz hasn't been taken). */
export function isEmptyProfile(p: TasteProfile): boolean {
  return (
    ORDINAL_DIMS.every((d) => p[d] === null) &&
    Object.keys(p.types).length === 0 &&
    Object.keys(p.fruitNotes).length === 0 &&
    Object.keys(p.flowerNotes).length === 0 &&
    Object.keys(p.extras).length === 0
  )
}

export const clamp = (n: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, n))

/** Parse whatever the database holds into a safe profile; anything unreadable becomes "empty". */
export function parseProfile(raw: unknown): TasteProfile {
  const result = TasteProfileSchema.safeParse(raw ?? {})
  if (result.success) return result.data
  console.warn('[profile] unreadable taste profile, starting fresh:', result.error.message)
  return emptyProfile()
}

/** The strongest liked notes across fruit, flower and extra families, best first. */
export function topAffinities<K extends string>(record: Partial<Record<K, number>>, min = 0.5): K[] {
  return (Object.entries(record) as [K, number][])
    .filter(([, v]) => v >= min)
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => k)
}
