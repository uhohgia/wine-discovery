// Ranks the bottles on a person's shelf for a meal or occasion: about half how well the bottle goes with the
// food (pairing rules), about half how well it fits the person's taste (their profile).
import type { Bottle } from '@/data/bottles'
import { PAIRING_WEIGHT, type PairingRule } from '@/data/pairingRules'
import { confidenceFor, scoreBottle, tasteClause, type Confidence } from './scoring'
import { pairingFit, pairingSentence } from './pairing'
import { isEmptyProfile, type TasteProfile } from './profile'

export interface RankedBottle {
  bottle: Bottle
  /** The blended 0 to 1 score the list is sorted by. */
  combined: number
  /** How well it goes with the meal, and how well it fits the person's taste (each 0 to 1). */
  pairing: number
  taste: number
  /** Null when we don't know the person's taste yet. Based on the blended score, so it is about this meal. */
  confidence: Confidence | null
  /** A short, plain-language reason: why it goes with the meal, and how it sits with their taste. */
  why: string
}

export function rankForMeal(profile: TasteProfile, bottles: readonly Bottle[], rule: PairingRule, ratingCount: number): RankedBottle[] {
  const knowsTaste = !isEmptyProfile(profile)

  return bottles
    .map((bottle): RankedBottle => {
      const fit = pairingFit(rule, bottle)
      const scored = scoreBottle(profile, bottle)
      const combined = knowsTaste ? PAIRING_WEIGHT * fit.score + (1 - PAIRING_WEIGHT) * scored.score : fit.score
      const confidence = knowsTaste ? confidenceFor({ score: combined, matches: [], typeMismatch: false, known: true }, bottle, ratingCount) : null
      const why = [pairingSentence(rule, fit), tasteClause(profile, bottle, scored)].filter(Boolean).join(' ')
      return { bottle, combined, pairing: fit.score, taste: scored.score, confidence, why: why || 'A middle-of-the-road match, so it could go either way.' }
    })
    .sort((a, b) => b.combined - a.combined || b.taste - a.taste || a.bottle.name.localeCompare(b.bottle.name))
}
