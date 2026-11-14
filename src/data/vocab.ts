// Controlled vocabularies: the ONLY allowed values. Each list is mirrored by a CHECK constraint in
// supabase/migrations/*_wine_discovery.sql (a unit test fails if the two drift apart), and by the
// Zod schemas in bottles.ts. Add a value here, in the migration and in the rule tables together.

export const TYPES = ['red', 'white', 'rosé', 'sparkling', 'orange', 'other'] as const
export const BODIES = ['light', 'medium', 'full'] as const
export const SWEETNESS = ['dry', 'off-dry', 'sweet'] as const
export const ACIDITY = ['soft', 'medium', 'zippy'] as const
/** Use "low" for whites. */
export const TANNIN = ['low', 'medium', 'high'] as const
export const FRUIT_CHARACTER = ['fresh', 'dried', 'jammy'] as const

export const FRUIT_NOTES = ['red-berry', 'blue-fruit', 'dark-fruit', 'green', 'citrus', 'stone-fruit', 'tropical', 'apple-pear'] as const
export const FLOWER_NOTES = ['white-flowers', 'purple-flowers', 'roses'] as const
export const EXTRAS = ['baking-spice', 'vanilla', 'toast', 'smoke', 'earthy'] as const

export const SHELF_SOURCES = ['bought', 'gift'] as const
export const VERDICTS = ['loved', 'fine', 'not-for-me'] as const
export const DISLIKE_REASONS = [
  'too-dry',
  'too-sharp',
  'too-heavy',
  'too-sweet',
  'mouth-drying',
  'too-light',
  'flavor',
  'not-sure',
] as const

export const MEALS = ['bbq', 'pasta-tomato', 'cheese-cured', 'seafood', 'spicy-takeout', 'pizza', 'salad-veggie'] as const
export const OCCASIONS = ['dinner-party', 'date-night', 'weeknight', 'gift'] as const

export const EVENT_NAMES = [
  'quiz_started',
  'quiz_completed',
  'quiz_stopped_early',
  'meal_selected',
  'wine_card_viewed',
  'rating_saved',
  'dislike_reason_selected',
  'scan_simulated',
  'scan_fallback_used',
  'concept_screen_viewed',
  'scan_photo',
] as const

export type WineType = (typeof TYPES)[number]
export type Body = (typeof BODIES)[number]
export type Sweetness = (typeof SWEETNESS)[number]
export type Acidity = (typeof ACIDITY)[number]
export type Tannin = (typeof TANNIN)[number]
export type FruitCharacter = (typeof FRUIT_CHARACTER)[number]
export type FruitNote = (typeof FRUIT_NOTES)[number]
export type FlowerNote = (typeof FLOWER_NOTES)[number]
export type Extra = (typeof EXTRAS)[number]
export type ShelfSource = (typeof SHELF_SOURCES)[number]
export type Verdict = (typeof VERDICTS)[number]
export type DislikeReason = (typeof DISLIKE_REASONS)[number]
export type Meal = (typeof MEALS)[number]
export type Occasion = (typeof OCCASIONS)[number]
export type EventName = (typeof EVENT_NAMES)[number]
