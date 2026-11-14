// Turns a taste profile into plain words: a playful name, one summary sentence, and the evidence line.
import { EXTRA_LABELS, FLOWER_LABELS, FRUIT_LABELS } from '@/data/notes'
import { PROFILE_NAMES } from '@/data/profileNames'
import { isEmptyProfile, topAffinities, type TasteProfile } from './profile'

export function pickProfileName(p: TasteProfile): { name: string; blurb: string } {
  const hit = PROFILE_NAMES.find((n) => n.when(p)) ?? PROFILE_NAMES[PROFILE_NAMES.length - 1]!
  return { name: hit.name, blurb: hit.blurb }
}

const join = (parts: string[]): string =>
  parts.length <= 1 ? (parts[0] ?? '') : `${parts.slice(0, -1).join(', ')} and ${parts[parts.length - 1]}`

/** "You like lighter, fresh, red-berry wines with a little floral." Empty profiles get an invitation instead. */
export function summarize(p: TasteProfile): string {
  if (isEmptyProfile(p)) return 'We don’t know your taste yet. Take the quick quiz and we’ll make a first guess.'

  const words: string[] = []
  if (p.body !== null) words.push(p.body <= 0.6 ? 'lighter' : p.body >= 1.4 ? 'fuller' : 'medium-bodied')
  if (p.fruitCharacter !== null && p.fruitCharacter <= 0.6) words.push('fresh')
  if (p.fruitCharacter !== null && p.fruitCharacter >= 1.4) words.push('jammy')
  if (p.sweetness !== null) words.push(p.sweetness <= 0.5 ? 'dry' : p.sweetness >= 1.4 ? 'sweet' : 'lightly sweet')
  if (p.acidity !== null && p.acidity >= 1.4) words.push('zippy')
  if (p.acidity !== null && p.acidity <= 0.6) words.push('smooth')
  for (const n of topAffinities(p.fruitNotes).slice(0, 2)) words.push(FRUIT_LABELS[n].short)

  const withs: string[] = []
  if (topAffinities(p.flowerNotes).length > 0) withs.push('a little floral')
  const extras = topAffinities(p.extras)
  if (extras.length > 0) withs.push(`a touch of ${EXTRA_LABELS[extras[0]!].short === 'smoky' ? 'smoke' : EXTRA_LABELS[extras[0]!].short}`)
  if (p.tannin !== null && p.tannin >= 1.4) withs.push('a bit of grip')
  if (p.tannin !== null && p.tannin <= 0.4) withs.push('nothing drying or harsh')

  const types = topAffinities(p.types)
  const lead = types.length > 0 && types.length < 4 ? `You mostly reach for ${join(types.map((t) => (t === 'sparkling' ? 'bubbly' : t)))}. ` : ''
  // Adjectives are a plain comma list ("lighter, fresh, red-berry wines"); only the "with" parts use "and".
  const body = words.length > 0 ? `You like ${words.join(', ')} wines` : 'You’re open to many styles'
  return `${lead}${body}${withs.length > 0 ? ` with ${join(withs)}` : ''}.`
}

/** The honest line about how much we know, e.g. "Based on 2 ratings, so more bottles will sharpen this." */
export function evidenceLine(ratingCount: number): string {
  if (ratingCount <= 0) return 'Based on your quiz answers so far. Rate a few bottles and we’ll sharpen this.'
  const noun = ratingCount === 1 ? '1 rating' : `${ratingCount} ratings`
  return `Based on ${noun}, so more bottles will sharpen this.`
}

/** Types the person likes, as friendly words ("Red", "Bubbly"). */
export function favoriteTypes(p: TasteProfile): string[] {
  return topAffinities(p.types).map((t) => (t === 'sparkling' ? 'Bubbly' : t.charAt(0).toUpperCase() + t.slice(1)))
}

export function likedNotes(p: TasteProfile): string[] {
  return [
    ...topAffinities(p.fruitNotes).map((n) => FRUIT_LABELS[n].long),
    ...topAffinities(p.flowerNotes).map((n) => FLOWER_LABELS[n].long),
    ...topAffinities(p.extras).map((n) => EXTRA_LABELS[n].long),
  ]
}
