// Playful profile names, picked by simple rules. The FIRST matching rule wins, so order matters;
// the last one always matches. Targets default to the middle (1) and affinities to 0 when unknown.
import type { TasteProfile } from '@/lib/profile'

export interface ProfileName {
  name: string
  /** One friendly sentence shown under the name. */
  blurb: string
  when: (p: TasteProfile) => boolean
}

const mid = (n: number | null): number => n ?? 1
const hasNote = (p: TasteProfile, ...notes: string[]): boolean =>
  notes.some((n) => ((p.fruitNotes as Record<string, number>)[n] ?? (p.flowerNotes as Record<string, number>)[n] ?? (p.extras as Record<string, number>)[n] ?? 0) >= 0.5)
const anyFlower = (p: TasteProfile): boolean => Object.values(p.flowerNotes).some((v) => v >= 0.5)

export const PROFILE_NAMES: readonly ProfileName[] = [
  {
    name: 'Big & Bold',
    blurb: 'You like wines with presence: full, rich and a little grippy.',
    when: (p) => mid(p.body) >= 1.5 && mid(p.tannin) >= 1.3,
  },
  {
    name: 'Ripe & Jammy',
    blurb: 'You like juicy, ripe fruit, the kind that tastes like it was just cooked down.',
    when: (p) => mid(p.fruitCharacter) >= 1.5 || (mid(p.body) >= 1.3 && hasNote(p, 'dark-fruit', 'blue-fruit')),
  },
  {
    name: 'Crisp & Citrusy',
    blurb: 'You like things bright and refreshing, with a squeeze of lemon.',
    when: (p) => mid(p.acidity) >= 1.4 && (hasNote(p, 'citrus', 'green', 'apple-pear') || (p.types.white ?? 0) >= 0.5),
  },
  {
    name: 'Bright & Berry',
    blurb: 'You like lighter, fresh wines that taste like red berries.',
    when: (p) => mid(p.body) <= 1.2 && hasNote(p, 'red-berry'),
  },
  {
    name: 'Floral & Fancy',
    blurb: 'You like wines that smell like a bouquet.',
    when: anyFlower,
  },
  {
    name: 'Warm & Toasty',
    blurb: 'You like cozy flavors: vanilla, spice, a little smoke.',
    when: (p) => hasNote(p, 'vanilla', 'baking-spice', 'toast', 'smoke'),
  },
  {
    name: 'Soft & Sweet',
    blurb: 'You like wines with a touch of sweetness and no sharp edges.',
    when: (p) => mid(p.sweetness) >= 1.4,
  },
  {
    name: 'Smooth & Easygoing',
    blurb: 'You like wines that go down easy: soft, smooth and friendly.',
    when: (p) => mid(p.tannin) <= 0.6 && mid(p.acidity) <= 1.1,
  },
  {
    name: 'Curious Explorer',
    blurb: 'Your taste is still a blank slate, which is the fun part.',
    when: () => true,
  },
]
