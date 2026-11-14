// The "tap a word" helper: plain-language meanings. Technical terms are optional and one tap away.
// Every flavor note and wine type from vocab.ts must have an entry (a test checks).
import { EXTRAS, FLOWER_NOTES, FRUIT_NOTES } from './vocab'

export interface GlossaryEntry {
  /** What we call it on screen. */
  term: string
  /** One or two friendly sentences. */
  plain: string
  /** The technical word, if there is one, so people can recognise it elsewhere. */
  alsoCalled?: string
}

export const GLOSSARY: Record<string, GlossaryEntry> = {
  // --- the feel of a wine ---
  body: { term: 'Body', plain: 'How rich or heavy a wine feels in your mouth. Light is like skim milk, full is like whole milk.' },
  sweetness: { term: 'Sweetness', plain: 'How much sugar you can taste. Dry means no sweetness, like black coffee.', alsoCalled: 'dry, off-dry, sweet' },
  acidity: { term: 'Zing', plain: 'The fresh, mouth-watering zip, like lemonade. Zippy wines feel lively; soft ones feel smooth, like plain water.', alsoCalled: 'acidity' },
  tannin: { term: 'Dry, grippy feel', plain: 'The dry, slightly rough feeling that strong black tea leaves on your tongue and gums. Some people love it, some don’t.', alsoCalled: 'tannin' },
  'fruit-style': { term: 'Fruit style', plain: 'Whether the fruit tastes fresh and crisp, like just picked, or ripe and juicy, like jam.' },
  dry: { term: 'Dry', plain: 'Not sweet. Most wines are dry, even if they smell fruity.' },
  'off-dry': { term: 'Off-dry', plain: 'A touch of sweetness, not dessert-sweet. It can calm spicy food.' },
  sweet: { term: 'Sweet', plain: 'Clearly sweet, like a dessert wine.' },
  fresh: { term: 'Fresh', plain: 'Crisp, bright fruit, like biting into a just-picked apple or berry.' },
  dried: { term: 'Ripe', plain: 'Fruit that tastes a bit deeper and sweeter, like dried fruit or raisins.', alsoCalled: 'dried fruit' },
  jammy: { term: 'Jammy', plain: 'Very ripe, juicy fruit, like jam on toast.' },
  vintage: { term: 'Vintage', plain: 'The year the grapes were picked. No year means the wine is a blend of years.' },
  producer: { term: 'Producer', plain: 'The winery or maker that made the wine.' },

  // --- types ---
  red: { term: 'Red wine', plain: 'Made with dark grape skins, which give it color and a little grip.' },
  white: { term: 'White wine', plain: 'Made from light-colored grapes. Usually fresher and lighter than red.' },
  'rosé': { term: 'Rosé', plain: 'A pink wine, made like a red but with only a short time on the dark skins. Usually crisp and fruity.' },
  sparkling: { term: 'Bubbly', plain: 'Wine with bubbles, like Champagne or Prosecco.', alsoCalled: 'sparkling wine' },
  orange: { term: 'Orange wine', plain: 'A white wine made like a red, with the skins left in. It tastes a little nutty and tea-like.' },
  other: { term: 'Other', plain: 'A style that doesn’t fit the usual groups.' },

  // --- flavor notes ---
  'red-berry': { term: 'Strawberry & cranberry', plain: 'Bright red fruit flavors, like strawberries, raspberries and cranberries.', alsoCalled: 'red berry' },
  'blue-fruit': { term: 'Blueberry', plain: 'Deep, juicy flavors like blueberries.', alsoCalled: 'blue fruit' },
  'dark-fruit': { term: 'Blackberry & plum', plain: 'Rich, dark fruit flavors like blackberries, plums and black cherries.', alsoCalled: 'dark fruit' },
  green: { term: 'Bell pepper', plain: 'Fresh, green flavors, like bell pepper, grass or green apple skin.' },
  citrus: { term: 'Lemon & citrus', plain: 'Zesty flavors like lemon, lime and grapefruit.' },
  'stone-fruit': { term: 'Peach', plain: 'Juicy flavors like peaches, apricots and nectarines.', alsoCalled: 'stone fruit' },
  tropical: { term: 'Pineapple & tropical', plain: 'Sunny flavors like pineapple, mango and passion fruit.' },
  'apple-pear': { term: 'Apple & pear', plain: 'Crisp, gentle flavors like fresh apples and pears.' },
  'white-flowers': { term: 'White flowers', plain: 'A light, perfumey smell like jasmine or orange blossom.' },
  'purple-flowers': { term: 'Purple flowers', plain: 'A perfumey smell like violets or lavender.' },
  roses: { term: 'Roses', plain: 'A soft, sweet floral smell, like rose petals.' },
  'baking-spice': { term: 'Baking spice', plain: 'Warm flavors like cinnamon, nutmeg and cloves.', alsoCalled: 'baking spice' },
  vanilla: { term: 'Vanilla', plain: 'A creamy, sweet flavor, like vanilla in baking. It often comes from aging in oak barrels.' },
  toast: { term: 'Toast', plain: 'A warm, bready flavor, like toasted bread or a toasted nut.' },
  smoke: { term: 'Smoke', plain: 'A campfire or grilled flavor.' },
  earthy: { term: 'Earthy', plain: 'Flavors like a forest floor, mushrooms or wet stones. Savory rather than fruity.' },
}

/** Every flavor note has a glossary entry, since the wine card shows them as tappable words. */
export const NOTE_IDS: readonly string[] = [...FRUIT_NOTES, ...FLOWER_NOTES, ...EXTRAS]
