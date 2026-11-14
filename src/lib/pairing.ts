// How well a bottle goes with a meal or occasion, using the tables in src/data/pairingRules.ts.
import type { Bottle } from '@/data/bottles'
import { GOOD_MATCH_MIN, POOR_MATCH_MAX } from '@/data/scoringWeights'
import { ordinal } from '@/data/scales'
import { TYPE_FIT_WEIGHT, type PairingDim, type PairingRule, type ReasonKey } from '@/data/pairingRules'
import { clamp } from './profile'
import { priceFeel } from './pricing'

export interface PairingMatch {
  key: ReasonKey
  similarity: number
  weight: number
}
export interface PairingFit {
  /** 0 (a poor match) to 1 (a classic pairing). */
  score: number
  matches: PairingMatch[]
}

const DIMS = ['body', 'sweetness', 'acidity', 'tannin', 'fruitCharacter'] as const satisfies readonly PairingDim[]

export function pairingFit(rule: PairingRule, bottle: Bottle): PairingFit {
  const matches: PairingMatch[] = []
  const add = (key: ReasonKey, similarity: number, weight: number) => matches.push({ key, similarity: clamp(similarity, 0, 1), weight })

  for (const dim of DIMS) {
    const ideal = rule.ideal[dim]
    if (!ideal) continue
    const value = ordinal(dim, bottle[dim === 'fruitCharacter' ? 'fruit_character' : dim])
    add(dim, 1 - Math.abs(ideal.target - value) / 2, ideal.weight)
  }
  if (rule.types) add('type', ((rule.types[bottle.type] ?? 0) + 1) / 2, TYPE_FIT_WEIGHT)
  if (rule.easyToLike) add('easy', bottle.easy_to_like ? 1 : 0.2, rule.easyToLike)
  if (rule.price) {
    const feel = priceFeel(bottle.price)
    const cheap = [1, 0.6, 0.2][feel - 1]!
    add('price', rule.price.prefer === 'cheaper' ? cheap : 1.1 - cheap, rule.price.weight)
  }
  if (rule.occasionTag) add('tag', bottle.occasions.includes(rule.id as Bottle['occasions'][number]) ? 1 : 0.2, rule.occasionTag)

  const total = matches.reduce((s, m) => s + m.weight, 0)
  return { score: total > 0 ? matches.reduce((s, m) => s + m.weight * m.similarity, 0) / total : 0.5, matches }
}

const sentence = (s: string): string => `${s.charAt(0).toUpperCase()}${s.slice(1)}.`

/**
 * One plain sentence about the pairing: the strongest reason it works, or (if it doesn't) the main reason it
 * may not. Null when the match is middling and no single thing stands out.
 */
export function pairingSentence(rule: PairingRule, fit: PairingFit): string | null {
  const best = fit.matches
    .filter((m) => m.similarity >= GOOD_MATCH_MIN && rule.reasons[m.key])
    .sort((a, b) => b.weight * b.similarity - a.weight * a.similarity)[0]
  if (best && fit.score >= 0.5) return sentence(rule.reasons[best.key]!)
  const worst = fit.matches
    .filter((m) => m.similarity <= POOR_MATCH_MAX && rule.misses[m.key])
    .sort((a, b) => b.weight * (1 - b.similarity) - a.weight * (1 - a.similarity))[0]
  if (worst) return sentence(rule.misses[worst.key]!)
  return best ? sentence(rule.reasons[best.key]!) : null
}
