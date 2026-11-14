// Finds bottles by what a person types: a name, a producer, or a description ("light red", "something zippy").
// Every typed word must match somewhere. Case, accents and punctuation are ignored.
import { EXTRA_LABELS, FLOWER_LABELS, FRUIT_LABELS } from '@/data/notes'
import { TYPE_WORDS } from '@/data/whyPhrases'
import type { Bottle } from '@/data/bottles'
import { foldText } from './normalize'

/** Everyday words for how a bottle tastes, so "light", "bold", "crisp" and "sweet" all work as searches. */
const BODY_WORDS = { light: 'light delicate', medium: 'medium', full: 'full bold rich heavy' } as const
const SWEET_WORDS = { dry: 'dry', 'off-dry': 'off-dry a little sweet', sweet: 'sweet dessert' } as const
const ZING_WORDS = { soft: 'smooth soft mellow', medium: 'balanced', zippy: 'zippy crisp fresh bright tart' } as const
const GRIP_WORDS = { low: 'smooth', medium: 'grippy', high: 'grippy dry bold tannic' } as const

const wordsOf = (text: string): string[] => foldText(text).split(' ').filter(Boolean)

/** Every word we can match a search against: name, producer, type, how it tastes, flavors, food. */
export function bottleWords(b: Bottle): string[] {
  return wordsOf(
    [
      b.name,
      b.producer,
      b.type,
      TYPE_WORDS[b.type],
      b.type === 'sparkling' ? 'bubbles bubbly fizzy champagne' : '',
      BODY_WORDS[b.body],
      SWEET_WORDS[b.sweetness],
      ZING_WORDS[b.acidity],
      GRIP_WORDS[b.tannin],
      b.fruit_character,
      b.vintage ?? '',
      ...b.fruit_notes.flatMap((n) => [n, FRUIT_LABELS[n].short, FRUIT_LABELS[n].long]),
      ...b.flower_notes.flatMap((n) => [n, FLOWER_LABELS[n].short, FLOWER_LABELS[n].long]),
      ...b.extras.flatMap((n) => [n, EXTRA_LABELS[n].short, EXTRA_LABELS[n].long]),
      ...b.pairings,
    ].join(' '),
  )
}

/** The words that describe the bottle at a glance. A search that hits these ranks above one that only hits a flavor or a food. */
function headlineWords(b: Bottle): string[] {
  return wordsOf([b.name, b.producer, b.type, TYPE_WORDS[b.type], BODY_WORDS[b.body], SWEET_WORDS[b.sweetness], ZING_WORDS[b.acidity]].join(' '))
}

const hits = (words: readonly string[], typed: string): boolean => words.some((w) => w.startsWith(typed))

/**
 * Bottles matching the typed words. Every word must START a word we know ("rose" finds "roses", but "3" won't
 * match a 2023 vintage). Name, producer and style matches come first. An empty search returns everything.
 */
export function searchBottles(bottles: readonly Bottle[], query: string): Bottle[] {
  const typed = wordsOf(query)
  if (typed.length === 0) return [...bottles]
  const found: { b: Bottle; missed: number }[] = []
  for (const b of bottles) {
    const all = bottleWords(b)
    if (!typed.every((t) => hits(all, t))) continue
    const head = headlineWords(b)
    found.push({ b, missed: typed.filter((t) => !hits(head, t)).length })
  }
  return found.sort((x, y) => x.missed - y.missed || x.b.name.localeCompare(y.b.name)).map((f) => f.b)
}
