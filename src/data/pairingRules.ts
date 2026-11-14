// What each meal or occasion likes in a wine. Tune these tables; the logic in src/lib/pairing.ts doesn't change.
//
// `ideal` says where on each 0 to 2 scale the best wine sits (0 = skim milk / dry / smooth / soft,
// 2 = whole milk / sweet / zippy / grippy) and how much that matters (weight).
// `types` says how well each wine type suits the meal, from -1 (clashes) to 1 (a classic).
// `reasons` and `misses` are the plain-language sentences used when a bottle fits or doesn't.
import type { Meal, Occasion, WineType } from './vocab'

export type PairingDim = 'body' | 'sweetness' | 'acidity' | 'tannin' | 'fruitCharacter'
export type ReasonKey = PairingDim | 'type' | 'easy' | 'price' | 'tag'

export interface PairingRule {
  id: Meal | Occasion
  kind: 'meal' | 'occasion'
  /** Tile title. */
  label: string
  /** Tile subtitle. */
  hint: string
  /** Decorative only. */
  emoji: string
  /** Used in "Best bets for …". */
  forWhat: string
  ideal: Partial<Record<PairingDim, { target: number; weight: number }>>
  types?: Partial<Record<WineType, number>>
  /** Weight for "easy to like" bottles (crowd-pleasers). */
  easyToLike?: number
  price?: { prefer: 'cheaper' | 'pricier'; weight: number }
  /** Weight for bottles whose `occasions` include this occasion. */
  occasionTag?: number
  reasons: Partial<Record<ReasonKey, string>>
  misses: Partial<Record<ReasonKey, string>>
}

/** How much of the final ranking comes from the meal pairing. The rest comes from the person's taste. */
export const PAIRING_WEIGHT = 0.5
/** How much the wine-type fit counts next to the scales. */
export const TYPE_FIT_WEIGHT = 2

export const PAIRING_RULES: Record<Meal | Occasion, PairingRule> = {
  // ---------- meals ----------
  bbq: {
    id: 'bbq', kind: 'meal', label: 'BBQ & grilled meat', hint: 'Smoky, saucy, hearty', emoji: '🍖', forWhat: 'BBQ and grilled meat',
    ideal: { body: { target: 1.7, weight: 2 }, tannin: { target: 1.4, weight: 1.5 }, fruitCharacter: { target: 1.7, weight: 1 }, sweetness: { target: 0.5, weight: 0.5 } },
    types: { red: 0.8, 'rosé': 0.2, white: -0.3, sparkling: 0, orange: 0.1 },
    reasons: {
      body: 'its body is big enough to stand up to smoky, grilled food',
      tannin: 'a little grip goes well with grilled meat',
      fruitCharacter: 'ripe, juicy fruit loves sweet and smoky sauces',
      type: 'red wine is a classic with grilled meat',
      sweetness: 'a little sweetness echoes sweet barbecue sauce',
    },
    misses: {
      body: 'it may feel too light next to smoky, grilled food',
      tannin: 'it’s missing the little grip that grilled meat likes',
      type: 'white wine is an unusual match for grilled meat',
    },
  },
  'pasta-tomato': {
    id: 'pasta-tomato', kind: 'meal', label: 'Pasta & tomato sauce', hint: 'Tangy, cozy, comforting', emoji: '🍝', forWhat: 'pasta with tomato sauce',
    ideal: { acidity: { target: 1.7, weight: 2 }, body: { target: 1, weight: 1.5 }, tannin: { target: 0.8, weight: 1 }, sweetness: { target: 0, weight: 1 } },
    types: { red: 0.6, 'rosé': 0.3, white: 0.1, sparkling: 0.1 },
    reasons: {
      acidity: 'its zip keeps up with tangy tomato sauce',
      body: 'a medium body won’t overpower the pasta',
      type: 'red wine and tomato sauce are a classic pair',
      tannin: 'a little grip pairs well with tomato and olive oil',
      sweetness: 'being dry keeps the tomato flavors bright',
    },
    misses: {
      acidity: 'it’s a bit soft for tangy tomato sauce',
      body: 'it’s a different weight than a pasta dinner calls for',
    },
  },
  'cheese-cured': {
    id: 'cheese-cured', kind: 'meal', label: 'Cheese & cured meats', hint: 'A board to share', emoji: '🧀', forWhat: 'a cheese and charcuterie board',
    ideal: { acidity: { target: 1.4, weight: 1.5 }, body: { target: 1, weight: 1 }, tannin: { target: 0.9, weight: 1 }, sweetness: { target: 0.3, weight: 0.5 } },
    types: { sparkling: 0.6, 'rosé': 0.5, orange: 0.5, red: 0.4, white: 0.3 },
    reasons: {
      acidity: 'its zip refreshes your mouth between salty bites',
      body: 'a medium body won’t drown out the flavors on the board',
      type: 'bubbles and fresh wines are lovely with salty, rich bites',
      tannin: 'a little grip works with rich, salty cheese',
      sweetness: 'a hint of fruit sweetness balances salty bites',
    },
    misses: {
      acidity: 'it’s a bit soft to cut through rich cheese',
    },
  },
  seafood: {
    id: 'seafood', kind: 'meal', label: 'Seafood', hint: 'Light, fresh, from the sea', emoji: '🦐', forWhat: 'seafood',
    ideal: { body: { target: 0.3, weight: 2 }, acidity: { target: 1.7, weight: 2 }, tannin: { target: 0, weight: 2 }, sweetness: { target: 0, weight: 1 } },
    types: { white: 0.9, sparkling: 0.8, 'rosé': 0.4, orange: 0, red: -0.7 },
    reasons: {
      body: 'it’s light, so it won’t bury delicate seafood',
      acidity: 'its zip works like a squeeze of lemon',
      tannin: 'nothing dry or grippy to fight with the seafood',
      type: 'crisp whites and bubbles are made for seafood',
      sweetness: 'being dry keeps the seafood flavors clean',
    },
    misses: {
      body: 'it’s heavy for delicate seafood',
      tannin: 'a dry, grippy feel can taste metallic with seafood',
      type: 'red wine usually overwhelms seafood',
    },
  },
  'spicy-takeout': {
    id: 'spicy-takeout', kind: 'meal', label: 'Spicy takeout', hint: 'Heat, curry, noodles', emoji: '🌶️', forWhat: 'spicy takeout',
    ideal: { sweetness: { target: 1, weight: 2.5 }, tannin: { target: 0, weight: 2 }, acidity: { target: 1.7, weight: 1.5 }, body: { target: 0.6, weight: 1.5 } },
    types: { white: 0.5, 'rosé': 0.5, sparkling: 0.4, orange: 0, red: -0.3 },
    reasons: {
      sweetness: 'a touch of sweetness calms the heat',
      tannin: 'it’s soft, so it won’t clash with the spice',
      acidity: 'its zip cools and refreshes your mouth',
      body: 'it’s light, so it won’t weigh down the meal',
      type: 'chilled whites and rosés are a welcome cool-down',
    },
    misses: {
      sweetness: 'very dry wines can make spicy food feel hotter',
      tannin: 'a dry, grippy feel can make spicy food burn more',
      acidity: 'it’s a little soft to refresh your mouth',
      body: 'it’s heavy next to spicy food',
      type: 'red wine can taste harsh next to strong spice',
    },
  },
  pizza: {
    id: 'pizza', kind: 'meal', label: 'Pizza', hint: 'Friday night classic', emoji: '🍕', forWhat: 'pizza',
    ideal: { acidity: { target: 1.3, weight: 1.5 }, body: { target: 1, weight: 1 }, tannin: { target: 0.8, weight: 1 }, sweetness: { target: 0, weight: 1 } },
    types: { red: 0.5, sparkling: 0.3, 'rosé': 0.3, white: 0.2 },
    reasons: {
      acidity: 'its zip handles tomato and cheese',
      body: 'a medium body goes with almost any pizza',
      type: 'red wine is a pizza-night favorite',
      tannin: 'a little grip handles melted cheese',
      sweetness: 'being dry keeps it savory next to the cheese',
    },
    misses: { acidity: 'it’s a bit soft for tomato and cheese' },
  },
  'salad-veggie': {
    id: 'salad-veggie', kind: 'meal', label: 'Salad & veggies', hint: 'Fresh, light, green', emoji: '🥗', forWhat: 'a salad or vegetable dish',
    ideal: { body: { target: 0.3, weight: 2 }, acidity: { target: 1.6, weight: 2 }, tannin: { target: 0, weight: 1.5 }, sweetness: { target: 0, weight: 1 }, fruitCharacter: { target: 0, weight: 1 } },
    types: { white: 0.7, 'rosé': 0.6, sparkling: 0.5, orange: 0.3, red: -0.3 },
    reasons: {
      body: 'it’s light, so it won’t overpower fresh vegetables',
      acidity: 'its zip works like a good dressing',
      fruitCharacter: 'fresh, crisp fruit suits fresh, crisp food',
      type: 'crisp whites and rosés love vegetables',
      sweetness: 'being dry keeps it crisp and savory',
    },
    misses: {
      body: 'it’s heavy for a light, fresh meal',
      tannin: 'a dry, grippy feel can taste bitter with greens',
    },
  },

  // ---------- occasions ----------
  'dinner-party': {
    id: 'dinner-party', kind: 'occasion', label: 'Dinner party', hint: 'Something for everyone', emoji: '🥂', forWhat: 'a dinner party',
    ideal: { body: { target: 1, weight: 1 }, acidity: { target: 1, weight: 0.5 }, tannin: { target: 0.8, weight: 0.5 } },
    types: { sparkling: 0.4, red: 0.3, white: 0.3, 'rosé': 0.2, orange: -0.2 },
    easyToLike: 2, occasionTag: 2,
    reasons: {
      easy: 'it’s easy to like, so it should please a crowd',
      tag: 'it suits a dinner party',
      body: 'its medium body works with most dishes',
      acidity: 'its balance works with most courses',
      tannin: 'it’s gentle enough for most guests',
      type: 'it’s a style most guests are happy to see',
    },
    misses: { easy: 'it’s more of an adventure than a crowd-pleaser' },
  },
  'date-night': {
    id: 'date-night', kind: 'occasion', label: 'Date night', hint: 'Something special for two', emoji: '🕯️', forWhat: 'date night',
    ideal: { body: { target: 1, weight: 1 }, sweetness: { target: 0.3, weight: 0.5 } },
    types: { sparkling: 0.6, 'rosé': 0.4, red: 0.3, white: 0.3 },
    easyToLike: 1, occasionTag: 2,
    reasons: {
      tag: 'it’s a good bottle for a date night',
      type: 'bubbly makes any night feel special',
      easy: 'it’s smooth and easy to enjoy together',
      body: 'a medium body feels relaxed and easy',
      sweetness: 'a touch of softness feels easy and relaxed',
    },
    misses: { easy: 'it may take some getting used to' },
  },
  weeknight: {
    id: 'weeknight', kind: 'occasion', label: 'Weeknight', hint: 'Easy, no fuss', emoji: '🏠', forWhat: 'a regular weeknight',
    ideal: {},
    easyToLike: 2, price: { prefer: 'cheaper', weight: 1.5 }, occasionTag: 1,
    reasons: { easy: 'it’s easy to like and easy to open on a regular night', price: 'it’s easy on the wallet for an everyday bottle', tag: 'it suits a regular night at home' },
    misses: { price: 'it’s more of a treat than an everyday bottle', easy: 'it’s more of an adventure than an everyday bottle' },
  },
  gift: {
    id: 'gift', kind: 'occasion', label: 'A gift', hint: 'Something to give', emoji: '🎁', forWhat: 'a gift',
    ideal: {},
    easyToLike: 1.5, price: { prefer: 'pricier', weight: 1 }, occasionTag: 3,
    reasons: { tag: 'it’s a nice bottle to give', easy: 'it’s easy to like, so most people will enjoy it', price: 'it feels like a thoughtful gift' },
    misses: { price: 'it’s a modest bottle for a gift', easy: 'it may not suit every taste' },
  },
}

export const MEAL_RULES = Object.values(PAIRING_RULES).filter((r) => r.kind === 'meal')
export const OCCASION_RULES = Object.values(PAIRING_RULES).filter((r) => r.kind === 'occasion')
