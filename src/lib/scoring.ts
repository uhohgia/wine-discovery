// Scores how well a bottle fits a taste profile, labels the confidence, and explains it in plain words.
// Pure functions: no storage, no UI. The numbers live in src/data/scoringWeights.ts.
import { EXTRA_LABELS, FLOWER_LABELS, FRUIT_LABELS } from '@/data/notes'
import { ordinal, type OrdinalDim } from '@/data/scales'
import {
  GOOD_BET_MIN,
  GOOD_MATCH_MIN,
  MIN_RATINGS_FOR_CONFIDENCE,
  NEUTRAL_SCORE,
  POOR_MATCH_MAX,
  TYPE_LIKED_MIN,
  TYPE_MISMATCH_MULTIPLIER,
  WEIGHTS,
  WORTH_A_TRY_MIN,
  type Dimension,
} from '@/data/scoringWeights'
import { BOTTLE_WORDS, PREFER_WORDS, TYPE_WORDS } from '@/data/whyPhrases'
import type { Bottle } from '@/data/bottles'
import { clamp, topAffinities, type TasteProfile } from './profile'

export interface Match {
  dim: Dimension
  /** 0 (opposite of what they like) to 1 (exactly what they like) */
  similarity: number
  weight: number
}

export interface Scored {
  /** 0 to 1. Higher means more likely to be liked. */
  score: number
  matches: Match[]
  /** True when the type is one the person steers away from (already reflected in `score`). */
  typeMismatch: boolean
  /** False when the profile told us nothing about this bottle, so `score` is just the neutral midpoint. */
  known: boolean
}

const ORDINAL_DIMS = ['body', 'sweetness', 'acidity', 'tannin', 'fruitCharacter'] as const satisfies readonly OrdinalDim[]

/** The bottle's average liking across notes the person has an opinion on, or null if they have none for this bottle. */
function noteSimilarity<K extends string>(affinities: Partial<Record<K, number>>, notes: readonly K[]): number | null {
  const opinions = notes.map((n) => affinities[n]).filter((a): a is number => a !== undefined)
  if (opinions.length === 0) return null
  return opinions.reduce((sum, a) => sum + (clamp(a, -1, 1) + 1) / 2, 0) / opinions.length
}

export function scoreBottle(profile: TasteProfile, bottle: Bottle): Scored {
  const matches: Match[] = []
  const add = (dim: Dimension, similarity: number) => matches.push({ dim, similarity, weight: WEIGHTS[dim] })

  const typeAffinity = profile.types[bottle.type]
  if (typeAffinity !== undefined && typeAffinity >= TYPE_LIKED_MIN) add('type', 1)

  for (const dim of ORDINAL_DIMS) {
    const target = profile[dim]
    if (target === null) continue
    const value = ordinal(dim, bottle[dim === 'fruitCharacter' ? 'fruit_character' : dim])
    add(dim, 1 - Math.abs(target - value) / 2)
  }

  const fruit = noteSimilarity(profile.fruitNotes, bottle.fruit_notes)
  if (fruit !== null) add('fruitNotes', fruit)
  const flowers = noteSimilarity(profile.flowerNotes, bottle.flower_notes)
  if (flowers !== null) add('flowerNotes', flowers)
  const extras = noteSimilarity(profile.extras, bottle.extras)
  if (extras !== null) add('extras', extras)

  const typeMismatch = typeAffinity !== undefined && typeAffinity < 0
  const totalWeight = matches.reduce((s, m) => s + m.weight, 0)
  const base = totalWeight > 0 ? matches.reduce((s, m) => s + m.weight * m.similarity, 0) / totalWeight : NEUTRAL_SCORE
  const score = clamp(typeMismatch ? base * TYPE_MISMATCH_MULTIPLIER : base, 0, 1)
  return { score, matches, typeMismatch, known: matches.length > 0 || typeMismatch }
}

export type Confidence = 'good-bet' | 'worth-a-try' | 'a-stretch'

export const CONFIDENCE_LABELS: Record<Confidence, string> = {
  'good-bet': 'A good bet',
  'worth-a-try': 'Worth a try',
  'a-stretch': 'A stretch',
}

/**
 * "A good bet" needs a high score AND either an easy-to-like bottle or enough ratings to trust the profile.
 * A high score without that is only "Worth a try". Null means we know too little to say anything.
 */
export function confidenceFor(scored: Scored, bottle: Bottle, ratingCount: number): Confidence | null {
  if (!scored.known) return null
  if (scored.score >= GOOD_BET_MIN && (bottle.easy_to_like || ratingCount >= MIN_RATINGS_FOR_CONFIDENCE)) return 'good-bet'
  if (scored.score >= WORTH_A_TRY_MIN) return 'worth-a-try'
  return 'a-stretch'
}

const join = (parts: string[]): string =>
  parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`

function bottleWord(dim: OrdinalDim, bottle: Bottle): string {
  switch (dim) {
    case 'body':
      return BOTTLE_WORDS.body[bottle.body]
    case 'sweetness':
      return BOTTLE_WORDS.sweetness[bottle.sweetness]
    case 'acidity':
      return BOTTLE_WORDS.acidity[bottle.acidity]
    case 'tannin':
      return BOTTLE_WORDS.tannin[bottle.tannin]
    case 'fruitCharacter':
      return BOTTLE_WORDS.fruitCharacter[bottle.fruit_character]
  }
}

const isOrdinal = (d: Dimension): d is OrdinalDim => (ORDINAL_DIMS as readonly string[]).includes(d)

/** The notes both the bottle has and the person likes, in everyday words. */
function sharedNotes(profile: TasteProfile, bottle: Bottle): string[] {
  const liked = {
    fruit: new Set(topAffinities(profile.fruitNotes)),
    flowers: new Set(topAffinities(profile.flowerNotes)),
    extras: new Set(topAffinities(profile.extras)),
  }
  return [
    ...bottle.fruit_notes.filter((n) => liked.fruit.has(n)).map((n) => FRUIT_LABELS[n].short),
    ...bottle.flower_notes.filter((n) => liked.flowers.has(n)).map((n) => FLOWER_LABELS[n].short),
    ...bottle.extras.filter((n) => liked.extras.has(n)).map((n) => EXTRA_LABELS[n].short),
  ]
}

/**
 * One or two plain sentences: what fits ("It's light, dry and zippy, just the way you like it.") and, if
 * something clashes, what to know ("It's rich and full, and you like lighter wines.").
 */
export function explainWhy(profile: TasteProfile, bottle: Bottle, scored: Scored): string {
  if (!scored.known) return 'We don’t know enough about your taste yet to say. The quick quiz will help.'

  const sentences: string[] = []

  const good = scored.matches
    .filter((m) => isOrdinal(m.dim) && m.similarity >= GOOD_MATCH_MIN)
    .sort((a, b) => b.weight * b.similarity - a.weight * a.similarity)
    .slice(0, 3)
  if (good.length > 0) {
    sentences.push(`It’s ${join(good.map((m) => bottleWord(m.dim as OrdinalDim, bottle)))}, just the way you like it.`)
  }

  const notes = sharedNotes(profile, bottle).slice(0, 2)
  if (notes.length > 0) sentences.push(`It has the ${join(notes)} flavors you like.`)

  if (scored.matches.some((m) => m.dim === 'type')) sentences.push(`It’s a ${TYPE_WORDS[bottle.type]}, which you usually reach for.`)

  const poor = scored.matches
    .filter((m) => isOrdinal(m.dim) && m.similarity <= POOR_MATCH_MAX)
    .sort((a, b) => b.weight * (1 - b.similarity) - a.weight * (1 - a.similarity))
    .slice(0, 2)
  const clashes = poor.map((m) => {
    const dim = m.dim as OrdinalDim
    const target = profile[dim] as number
    return { word: bottleWord(dim, bottle), prefer: PREFER_WORDS[dim][Math.round(clamp(target, 0, 2))] }
  })
  if (clashes.length > 0) {
    sentences.push(`${sentences.length > 0 ? 'But it' : 'It'}’s ${join(clashes.map((c) => c.word))}, and you like ${join(clashes.map((c) => c.prefer))}.`)
  }
  if (scored.typeMismatch) {
    const liked = topAffinities(profile.types).map((t) => TYPE_WORDS[t])
    sentences.push(`${sentences.length > 0 ? 'Also, it' : 'It'}’s a ${TYPE_WORDS[bottle.type]}${liked.length > 0 ? `, and you usually reach for ${join(liked)}` : ''}.`)
  }

  return sentences.length > 0 ? sentences.join(' ') : 'It’s a bit of a mix for your taste, so it could go either way.'
}

/**
 * One short sentence about how a bottle sits with the person's taste, for lists where space is tight.
 * ("It’s light and fresh, like you like." / "It’s full-bodied, and you like lighter wines.") Null if we know nothing.
 */
export function tasteClause(profile: TasteProfile, bottle: Bottle, scored: Scored): string | null {
  if (!scored.known) return null
  if (scored.typeMismatch) {
    const liked = topAffinities(profile.types).map((t) => TYPE_WORDS[t])
    return `It’s a ${TYPE_WORDS[bottle.type]}${liked.length > 0 ? `, and you usually reach for ${join(liked)}` : ''}.`
  }
  const fits = scored.matches
    .filter((m) => isOrdinal(m.dim) && m.similarity >= GOOD_MATCH_MIN)
    .sort((a, b) => b.weight * b.similarity - a.weight * a.similarity)
    .slice(0, 2)
    .map((m) => bottleWord(m.dim as OrdinalDim, bottle))
  const clash = scored.matches
    .filter((m) => isOrdinal(m.dim) && m.similarity <= POOR_MATCH_MAX)
    .sort((a, b) => b.weight * (1 - b.similarity) - a.weight * (1 - a.similarity))[0]
  const clashText = clash
    ? `${bottleWord(clash.dim as OrdinalDim, bottle)} and you like ${PREFER_WORDS[clash.dim as OrdinalDim][Math.round(clamp(profile[clash.dim as OrdinalDim] as number, 0, 2))]}`
    : null
  if (fits.length > 0 && clashText) return `It’s ${join(fits)}, but it’s ${clashText}.`
  if (clashText) return `It’s ${clashText}.`
  if (fits.length > 0) return `It’s ${join(fits)}, like you like.`
  return null
}
