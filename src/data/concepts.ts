// The "Concept preview" screens: sketches of ideas we're testing. They are static and clearly labelled.
export type ConceptId = 'non-alcoholic' | 'gift-mode' | 'budget' | 'store-finder' | 'host-card' | 'more-from-producer'

export interface Concept {
  id: ConceptId
  title: string
  /** One friendly line for the list. */
  summary: string
  /** Decorative only. */
  emoji: string
}

export const CONCEPTS: readonly Concept[] = [
  { id: 'non-alcoholic', title: 'An alcohol-free option', summary: 'Alcohol-free bottles shown right next to the wines, as a normal choice.', emoji: '🍇' },
  { id: 'gift-mode', title: 'Gift mode', summary: 'Choosing a bottle for someone else, based on what they like.', emoji: '🎁' },
  { id: 'budget', title: 'Stay on budget', summary: 'See only bottles in the price range you’re comfortable with.', emoji: '💵' },
  { id: 'store-finder', title: 'Where to buy it', summary: 'The kinds of stores that usually carry a bottle you liked.', emoji: '🛒' },
  { id: 'host-card', title: 'Host card', summary: 'A little card for your guests: what it is, why it’s on the table, one fun thing to say.', emoji: '🍽️' },
  { id: 'more-from-producer', title: 'More from this producer', summary: 'Other bottles from a maker you liked.', emoji: '🔎' },
]

export const isConceptId = (id: string): id is ConceptId => CONCEPTS.some((c) => c.id === id)
