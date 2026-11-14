// Supabase-backed WdRepo. Security lives in the database (row-level security): this code never
// decides who may see what, and only ever asks for the signed-in person's own rows.
import type { SupabaseClient } from '@supabase/supabase-js'
import { parseProfile } from '@/lib/profile'
import { Bottle } from './bottles'
import { DISLIKE_REASONS, SHELF_SOURCES, VERDICTS } from './vocab'
import type { Rating, ShelfItem, WdProfileRow, WdRepo } from './wdRepo'

const COLUMNS = 'prefs, rating_count, age_confirmed_at'
// Explicit columns: the strict Bottle schema rejects extras like created_at.
const BOTTLE_COLUMNS =
  'id, name, producer, vintage, type, price, body, sweetness, acidity, tannin, fruit_character, fruit_notes, flower_notes, extras, pairings, occasions, serve_tip, talking_point, easy_to_like, usually_sold_at, label_image_path, is_placeholder'

function fail(what: string, error: unknown): never {
  console.error(`[wd] ${what}:`, error)
  throw new Error('We couldn’t do that. Please check your connection and try again.')
}

interface ProfileDbRow {
  prefs: unknown
  rating_count: number
  age_confirmed_at: string | null
}

const toRow = (r: ProfileDbRow): WdProfileRow => ({
  prefs: parseProfile(r.prefs), // never trust what comes back: unreadable data becomes an empty profile
  ratingCount: r.rating_count ?? 0,
  ageConfirmedAt: r.age_confirmed_at,
})

export function createSupabaseWdRepo(sb: SupabaseClient): WdRepo {
  return {
    listBottles: async () => {
      const { data, error } = await sb.from('wd_bottles').select(BOTTLE_COLUMNS).order('name')
      if (error) fail('load bottles', error)
      // Never trust what comes back: a row that doesn't fit the schema is skipped, not shown.
      const bottles: Bottle[] = []
      for (const row of data ?? []) {
        const parsed = Bottle.safeParse(row)
        if (parsed.success) bottles.push(parsed.data)
        else console.warn('[wd] skipping unreadable bottle:', (row as { id?: string }).id, parsed.error.message)
      }
      return bottles
    },

    listShelf: async (userId) => {
      const { data, error } = await sb.from('wd_shelf_items').select('bottle_id, source, added_on').eq('user_id', userId).order('added_on', { ascending: false })
      if (error) fail('load shelf', error)
      return (data ?? []).flatMap((r: { bottle_id: string; source: string; added_on: string }): ShelfItem[] =>
        (SHELF_SOURCES as readonly string[]).includes(r.source) ? [{ bottleId: r.bottle_id, source: r.source as ShelfItem['source'], addedOn: r.added_on }] : [],
      )
    },

    addToShelf: async (userId, bottleId, source) => {
      const { error } = await sb.from('wd_shelf_items').upsert({ user_id: userId, bottle_id: bottleId, source }, { onConflict: 'user_id,bottle_id' })
      if (error) fail('add to shelf', error)
    },

    listRatings: async (userId) => {
      const { data, error } = await sb.from('wd_ratings').select('id, bottle_id, verdict, reasons, created_at').eq('user_id', userId).order('created_at', { ascending: true })
      if (error) fail('load ratings', error)
      type Row = { id: string; bottle_id: string; verdict: string; reasons: string[] | null; created_at: string }
      return ((data ?? []) as Row[]).flatMap((r): Rating[] =>
        (VERDICTS as readonly string[]).includes(r.verdict)
          ? [{
              id: r.id,
              bottleId: r.bottle_id,
              verdict: r.verdict as Rating['verdict'],
              reasons: (r.reasons ?? []).filter((x): x is Rating['reasons'][number] => (DISLIKE_REASONS as readonly string[]).includes(x)),
              createdAt: r.created_at,
            }]
          : [],
      )
    },

    addRating: async (userId, r) => {
      const { data, error } = await sb
        .from('wd_ratings')
        .insert({ user_id: userId, bottle_id: r.bottleId, verdict: r.verdict, reasons: r.reasons })
        .select('id, created_at')
        .single()
      if (error) fail('save rating', error)
      return { id: (data as { id: string }).id, ...r, reasons: [...r.reasons], createdAt: (data as { created_at: string }).created_at }
    },

    removeRating: async (userId, ratingId) => {
      const { error } = await sb.from('wd_ratings').delete().eq('user_id', userId).eq('id', ratingId)
      if (error) fail('undo rating', error)
    },

    removeFromShelf: async (userId, bottleId) => {
      const { error } = await sb.from('wd_shelf_items').delete().eq('user_id', userId).eq('bottle_id', bottleId)
      if (error) fail('remove from shelf', error)
    },

    getProfile: async (userId) => {
      const { data, error } = await sb.from('wd_taste_profiles').select(COLUMNS).eq('user_id', userId).maybeSingle()
      if (error) {
        console.error('[wd] load profile:', error)
        throw new Error('We couldn’t load your profile. Please check your connection and try again.')
      }
      return data ? toRow(data as ProfileDbRow) : null
    },

    saveProfile: async (userId, patch) => {
      // Only the fields given are written, so confirming your age never wipes your quiz results.
      const payload: Record<string, unknown> = { user_id: userId, updated_at: new Date().toISOString() }
      if (patch.prefs !== undefined) payload.prefs = patch.prefs
      if (patch.ratingCount !== undefined) payload.rating_count = patch.ratingCount
      if (patch.ageConfirmedAt !== undefined) payload.age_confirmed_at = patch.ageConfirmedAt
      const { data, error } = await sb.from('wd_taste_profiles').upsert(payload, { onConflict: 'user_id' }).select(COLUMNS).single()
      if (error) {
        console.error('[wd] save profile:', error)
        throw new Error('We couldn’t save that. Please check your connection and try again.')
      }
      return toRow(data as ProfileDbRow)
    },

    deleteMyData: async (userId) => {
      // Row-level security lets people delete only their own rows. Ratings and shelf first, the profile last.
      for (const table of ['wd_ratings', 'wd_shelf_items', 'wd_events', 'wd_taste_profiles']) {
        const { error } = await sb.from(table).delete().eq('user_id', userId)
        if (error) fail(`delete ${table}`, error)
      }
    },

    recordEvent: async (userId, name, properties = {}) => {
      const { error } = await sb.from('wd_events').insert({ user_id: userId, name, properties })
      if (error) console.warn('[wd] event not recorded:', error.message)
    },
  }
}
