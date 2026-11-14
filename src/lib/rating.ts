// Turns a rating into a better taste profile, plus a warm confirmation. Pure: the input is never changed.
import type { Bottle } from '@/data/bottles'
import {
  CONFIRMATIONS,
  DISLIKE_RULES,
  DISLIKE_STEP,
  FINE_PULL,
  FLAVOR_DISLIKE_DROP,
  LOVED_AFFINITY_BOOST,
  LOVED_PULL,
} from '@/data/dislikeRules'
import { EXTRA_LABELS, FLOWER_LABELS, FRUIT_LABELS } from '@/data/notes'
import { ordinal, type OrdinalDim } from '@/data/scales'
import type { DislikeReason, Verdict } from '@/data/vocab'
import { clamp, ORDINAL_DIMS, type TasteProfile } from './profile'

const bottleValue = (b: Bottle, dim: OrdinalDim): number => ordinal(dim, b[dim === 'fruitCharacter' ? 'fruit_character' : dim])

const join = (parts: string[]): string =>
  parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`

/** The bottle's flavors in everyday words, e.g. ["dark-fruit", "vanilla"]. */
function noteWords(b: Bottle): string[] {
  return [...b.fruit_notes.map((n) => FRUIT_LABELS[n].short), ...b.flower_notes.map((n) => FLOWER_LABELS[n].short), ...b.extras.map((n) => EXTRA_LABELS[n].short)]
}

const lower = (n: number | undefined, delta: number): number => clamp((n ?? 0) + delta, -1, 1)

export interface RatingResult {
  profile: TasteProfile
  /** Warm words to show right after saving. */
  confirmation: string
}

export function applyRating(profile: TasteProfile, bottle: Bottle, verdict: Verdict, reasons: readonly DislikeReason[]): RatingResult {
  const next: TasteProfile = structuredClone(profile)
  const unique = [...new Set(reasons)]

  if (verdict === 'loved' || verdict === 'fine') {
    const pull = verdict === 'loved' ? LOVED_PULL : FINE_PULL
    for (const dim of ORDINAL_DIMS) {
      const value = bottleValue(bottle, dim)
      const current = next[dim]
      if (current !== null) next[dim] = clamp(current + pull * (value - current), 0, 2)
      else if (verdict === 'loved') next[dim] = value // the only thing we know yet
    }
    if (verdict === 'loved') {
      next.types[bottle.type] = lower(next.types[bottle.type], LOVED_AFFINITY_BOOST)
      for (const n of bottle.fruit_notes) next.fruitNotes[n] = lower(next.fruitNotes[n], LOVED_AFFINITY_BOOST)
      for (const n of bottle.flower_notes) next.flowerNotes[n] = lower(next.flowerNotes[n], LOVED_AFFINITY_BOOST)
      for (const n of bottle.extras) next.extras[n] = lower(next.extras[n], LOVED_AFFINITY_BOOST)
    }
    return { profile: next, confirmation: verdict === 'loved' ? CONFIRMATIONS.loved : CONFIRMATIONS.fine }
  }

  // Not for me: each reason moves the matching preference away from what this bottle was like.
  const phrases: string[] = []
  for (const reason of unique) {
    const rule = DISLIKE_RULES[reason]
    if (rule.dim && rule.direction) {
      const value = bottleValue(bottle, rule.dim)
      const current = next[rule.dim]
      // Away from the bottle: never past where the person already was, and always a clear step beyond the bottle.
      const base = rule.direction < 0 ? Math.min(current ?? value, value) : Math.max(current ?? value, value)
      next[rule.dim] = clamp(base + rule.direction * DISLIKE_STEP, 0, 2)
      phrases.push(rule.phrase)
    } else if (reason === 'flavor') {
      for (const n of bottle.fruit_notes) next.fruitNotes[n] = lower(next.fruitNotes[n], -FLAVOR_DISLIKE_DROP)
      for (const n of bottle.flower_notes) next.flowerNotes[n] = lower(next.flowerNotes[n], -FLAVOR_DISLIKE_DROP)
      for (const n of bottle.extras) next.extras[n] = lower(next.extras[n], -FLAVOR_DISLIKE_DROP)
      const words = noteWords(bottle).slice(0, 2)
      phrases.push(words.length > 0 ? `go easier on ${join(words)} flavors` : DISLIKE_RULES.flavor.phrase)
    }
    // "Not sure" changes nothing.
  }

  return {
    profile: next,
    confirmation: phrases.length > 0 ? `Good to know. We’ll ${join(phrases)}.` : CONFIRMATIONS.notForMeNoReason,
  }
}

export interface RatedBottle {
  bottleId: string
  verdict: Verdict
  reasons: readonly DislikeReason[]
}

/**
 * Rebuilds a profile from a starting point (for example fresh quiz answers) by applying every past rating in order.
 * This is how retaking the quiz keeps what ratings have taught the app. Ratings for bottles no longer in the catalog are skipped.
 */
export function replayRatings(base: TasteProfile, ratings: readonly RatedBottle[], bottles: readonly Bottle[]): TasteProfile {
  let profile = base
  for (const r of ratings) {
    const bottle = bottles.find((b) => b.id === r.bottleId)
    if (bottle) profile = applyRating(profile, bottle, r.verdict, r.reasons).profile
  }
  return profile
}
