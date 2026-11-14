import { readLocalEvents } from './data/localWdRepo'
import { quizToProfile } from './lib/quiz'

export const USER = { id: 'u1', email: 'gia@example.com', display_name: 'gia' }

interface SeedOptions {
  age?: boolean
  quiz?: Parameters<typeof quizToProfile>[0]
  shelf?: { bottleId: string; source: 'bought' | 'gift' }[]
  ratings?: { bottleId: string; verdict: 'loved' | 'fine' | 'not-for-me'; reasons?: string[] }[]
}

/** A signed-in demo person, optionally with age confirmed, a finished quiz, bottles on the shelf and past ratings. */
export function seedPerson(opts: SeedOptions = {}) {
  localStorage.setItem('wd:demo-users', JSON.stringify({ [USER.email]: USER }))
  localStorage.setItem('wd:session', USER.id)
  if (opts.age || opts.quiz) {
    localStorage.setItem(
      'wd:demo:u1:profile',
      JSON.stringify({
        prefs: opts.quiz ? quizToProfile(opts.quiz) : {},
        ratingCount: opts.ratings?.length ?? 0,
        ageConfirmedAt: opts.age === false ? null : '2026-11-08T00:00:00Z',
      }),
    )
  }
  if (opts.shelf) {
    localStorage.setItem('wd:demo:u1:shelf', JSON.stringify(opts.shelf.map((s) => ({ ...s, addedOn: '2026-11-01' }))))
  }
  if (opts.ratings) {
    localStorage.setItem(
      'wd:demo:u1:ratings',
      JSON.stringify(
        opts.ratings.map((r, i) => ({
          id: `r${i}`,
          bottleId: r.bottleId,
          verdict: r.verdict,
          reasons: r.reasons ?? [],
          createdAt: `2026-11-0${i + 1}T10:00:00Z`,
        })),
      ),
    )
  }
}

export const eventNames = () => readLocalEvents('u1').map((e) => e.name)
