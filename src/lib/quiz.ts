import {
  FRUIT_RULES,
  LIKED_AFFINITY,
  NO_SCENTS_AFFINITY,
  ORDINAL_RULES,
  QUIZ_STEPS,
  QUIZ_TYPES,
  SCENT_RULES,
  TYPE_MISMATCH_AFFINITY,
  UNSURE,
  type QuestionId,
} from '@/data/quizRules'
import { EXTRAS, FLOWER_NOTES, type WineType } from '@/data/vocab'
import { emptyProfile, type TasteProfile } from './profile'

/** Each question maps to the option values chosen. A missing question, an empty list or ["unsure"] all mean "no information". */
export type QuizAnswers = Partial<Record<QuestionId, string[]>>

const KNOWN_QUESTIONS = new Set<string>(QUIZ_STEPS.flatMap((s) => s.questions.map((q) => q.id)))

/** The real choices for a question, with "Not sure" removed. */
export function chosen(answers: QuizAnswers, id: QuestionId): string[] {
  return (answers[id] ?? []).filter((v) => v !== UNSURE)
}

/** Keep only known questions, so old or edited data can't smuggle junk into a saved profile. */
export function cleanAnswers(raw: Record<string, string[]> | undefined): QuizAnswers {
  const out: QuizAnswers = {}
  for (const [k, v] of Object.entries(raw ?? {})) if (KNOWN_QUESTIONS.has(k)) out[k as QuestionId] = [...v]
  return out
}

/** Turns quiz answers into a starting taste profile. Unanswered or "Not sure" questions tell us nothing. */
export function quizToProfile(answers: QuizAnswers): TasteProfile {
  const p = emptyProfile()

  // Wine types: picked ones are liked; if any were picked, the rest of the offered types are a mismatch.
  const picked = chosen(answers, 'type') as WineType[]
  if (picked.length > 0) {
    for (const t of QUIZ_TYPES) p.types[t] = picked.includes(t) ? LIKED_AFFINITY : TYPE_MISMATCH_AFFINITY
  }

  // Single choices that set a 0 to 2 target.
  for (const [id, rule] of Object.entries(ORDINAL_RULES) as [QuestionId, NonNullable<(typeof ORDINAL_RULES)[QuestionId]>][]) {
    const value = chosen(answers, id)[0]
    if (value !== undefined && value in rule.values) p[rule.dim] = rule.values[value]!
  }

  for (const f of chosen(answers, 'fruit')) {
    const note = FRUIT_RULES[f]
    if (note) p.fruitNotes[note] = LIKED_AFFINITY
  }

  const scents = chosen(answers, 'scent')
  if (scents.includes('none') && scents.length === 1) {
    for (const n of FLOWER_NOTES) p.flowerNotes[n] = NO_SCENTS_AFFINITY
    for (const n of EXTRAS) p.extras[n] = NO_SCENTS_AFFINITY
  } else {
    for (const s of scents) {
      const rule = SCENT_RULES[s]
      for (const n of rule?.flowerNotes ?? []) p.flowerNotes[n] = LIKED_AFFINITY
      for (const n of rule?.extras ?? []) p.extras[n] = LIKED_AFFINITY
    }
  }

  p.quizAnswers = cleanAnswers(answers as Record<string, string[]>)
  return p
}

/** How many quiz screens have at least one real (not "Not sure") answer. */
export function stepsAnswered(answers: QuizAnswers): number {
  return QUIZ_STEPS.filter((s) => s.questions.some((q) => chosen(answers, q.id).length > 0)).length
}
