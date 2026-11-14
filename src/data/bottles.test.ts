import { readdirSync, readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { bottlesToSql } from './bottleSql'
import { existsSync } from 'node:fs'
import { jargonIn, parseBottles, REAL_BOTTLES, SEED_BOTTLES } from './bottles'
import * as V from './vocab'

const good = SEED_BOTTLES[0]!
const withChange = (patch: Record<string, unknown>) => [{ ...good, ...patch }]

describe('placeholder bottles', () => {
  it('are the 10 clearly fictional placeholders', () => {
    expect(SEED_BOTTLES).toHaveLength(10)
    for (const b of SEED_BOTTLES) {
      expect(b.is_placeholder).toBe(true)
      expect(b.name).toMatch(/^Sample /)
      expect(b.producer).toBe('Placeholder Cellars')
    }
  })

  it('cover a mix of types, bodies and price feels', () => {
    expect(new Set(SEED_BOTTLES.map((b) => b.type))).toEqual(new Set(['red', 'white', 'rosé', 'sparkling', 'orange']))
    expect(new Set(SEED_BOTTLES.map((b) => b.body))).toEqual(new Set(['light', 'medium', 'full']))
    expect(Math.min(...SEED_BOTTLES.map((b) => b.price))).toBeLessThan(15)
    expect(Math.max(...SEED_BOTTLES.map((b) => b.price))).toBeGreaterThan(30)
  })

  it('use low tannin for whites', () => {
    for (const b of SEED_BOTTLES.filter((x) => x.type === 'white' || x.type === 'sparkling')) expect(b.tannin).toBe('low')
  })
})

describe('the real catalog (bottles.json)', () => {
  it('has the 10 real bottles, none marked as a placeholder', () => {
    expect(REAL_BOTTLES).toHaveLength(10)
    for (const b of REAL_BOTTLES) expect(b.is_placeholder, b.id).toBe(false)
  })
  it('gives every bottle a front photo that exists in public/', () => {
    for (const b of REAL_BOTTLES) {
      expect(b.label_image_path, b.id).toBe(`/bottles/${b.id}.jpg`)
      expect(existsSync(`public${b.label_image_path}`), b.id).toBe(true)
    }
  })
  it('has no unexplained jargon, and 2 to 3 pairings, a tip and a talking point each', () => {
    for (const b of REAL_BOTTLES) {
      expect(jargonIn(b), b.id).toEqual([])
      expect(b.pairings.length, b.id).toBeGreaterThanOrEqual(2)
      expect(b.pairings.length, b.id).toBeLessThanOrEqual(3)
      expect(b.serve_tip.length).toBeGreaterThan(10)
      expect(b.talking_point.length).toBeGreaterThan(10)
    }
  })
  it('covers sparkling, white, rosé and red, with a spread of prices', () => {
    expect(new Set(REAL_BOTTLES.map((b) => b.type))).toEqual(new Set(['red', 'white', 'rosé', 'sparkling']))
    expect(Math.min(...REAL_BOTTLES.map((b) => b.price))).toBeLessThanOrEqual(20)
    expect(Math.max(...REAL_BOTTLES.map((b) => b.price))).toBeGreaterThan(30)
  })
  it('uses low tannin for whites and sparkling wines', () => {
    for (const b of REAL_BOTTLES.filter((x) => x.type === 'white' || x.type === 'sparkling')) expect(b.tannin, b.id).toBe('low')
  })
})

describe('friendly text', () => {
  it('has no unexplained wine jargon in the placeholders', () => {
    for (const b of SEED_BOTTLES) expect(jargonIn(b), b.id).toEqual([])
  })
  it('spots jargon when it creeps in', () => {
    expect(jargonIn({ ...SEED_BOTTLES[0]!, talking_point: 'A tannic wine with great structure.' })).toEqual(['tannic', 'structure'])
  })
  it('gives every placeholder 2 to 3 pairings, a tip and a talking point', () => {
    for (const b of SEED_BOTTLES) {
      expect(b.pairings.length, b.id).toBeGreaterThanOrEqual(2)
      expect(b.pairings.length, b.id).toBeLessThanOrEqual(3)
      expect(b.serve_tip.length).toBeGreaterThan(10)
      expect(b.talking_point.length).toBeGreaterThan(10)
    }
  })
})

describe('vocabulary validation fails on unknown values', () => {
  it('accepts a good bottle', () => {
    expect(() => parseBottles([good])).not.toThrow()
  })

  it.each([
    ['type', 'purple'],
    ['body', 'huge'],
    ['sweetness', 'syrupy'],
    ['acidity', 'sharp'],
    ['tannin', 'grippy'],
    ['fruit_character', 'stewed'],
  ])('rejects an unknown %s', (field, value) => {
    expect(() => parseBottles(withChange({ [field]: value }))).toThrow(new RegExp(field))
  })

  it.each([
    ['fruit_notes', ['red-berry', 'banana']],
    ['flower_notes', ['lavender']],
    ['extras', ['pepper']],
    ['occasions', ['picnic']],
  ])('rejects an unknown value inside %s', (field, value) => {
    expect(() => parseBottles(withChange({ [field]: value }))).toThrow(new RegExp(field))
  })

  it('rejects unknown keys, repeated values, duplicate ids, bad ids and empty lists', () => {
    expect(() => parseBottles(withChange({ colour: 'red' }))).toThrow()
    expect(() => parseBottles(withChange({ fruit_notes: ['green', 'green'] }))).toThrow(/repeat/i)
    expect(() => parseBottles([good, good])).toThrow(/unique/i)
    expect(() => parseBottles(withChange({ id: 'Sample Red!' }))).toThrow(/id/)
    expect(() => parseBottles([])).toThrow()
    expect(() => parseBottles(withChange({ pairings: [] }))).toThrow(/pairings/)
  })

  it('rejects tannin above "low" for white and sparkling wines', () => {
    expect(() => parseBottles(withChange({ type: 'white', tannin: 'high' }))).toThrow(/tannin/)
    expect(() => parseBottles(withChange({ type: 'sparkling', tannin: 'medium' }))).toThrow(/tannin/)
    expect(() => parseBottles(withChange({ type: 'orange', tannin: 'medium' }))).not.toThrow()
  })
})

describe('bottlesToSql', () => {
  const sql = bottlesToSql(SEED_BOTTLES)
  it('is an idempotent upsert of every bottle', () => {
    expect(sql).toContain('on conflict (id) do update set')
    expect((sql.match(/'sample-[a-z]+-\d'/g) ?? []).length).toBeGreaterThanOrEqual(10)
  })
  it('escapes quotes so text cannot break out of the statement', () => {
    const tricky = parseBottles(withChange({ id: 'o-brien', name: "O'Brien's; drop table x;--" }))
    expect(bottlesToSql(tricky)).toContain("'O''Brien''s; drop table x;--'")
  })
})

// The migration's CHECK constraints must list exactly the same values as vocab.ts.
describe('migration matches the TypeScript vocabulary', () => {
  const migration = readFileSync('supabase/migrations/20261107200000_wine_discovery.sql', 'utf8')
  // A later migration may redefine a constraint (e.g. to add an event name): the last definition wins.
  const allMigrations = readdirSync('supabase/migrations')
    .filter((f) => /_(wine_discovery|wd_\w+)\.sql$/.test(f))
    .sort()
    .map((f) => readFileSync(`supabase/migrations/${f}`, 'utf8'))
    .join('\n')
  const valuesOf = (constraint: string): string[] => {
    const line = allMigrations.split('\n').reverse().find((l) => l.includes(`constraint ${constraint} `))
    if (!line) throw new Error(`constraint ${constraint} not found in migration`)
    return [...line.matchAll(/'([^']+)'/g)].map((m) => m[1]!)
  }

  const cases: [string, readonly string[]][] = [
    ['wd_bottles_type_ok', V.TYPES],
    ['wd_bottles_body_ok', V.BODIES],
    ['wd_bottles_sweetness_ok', V.SWEETNESS],
    ['wd_bottles_acidity_ok', V.ACIDITY],
    ['wd_bottles_tannin_ok', V.TANNIN],
    ['wd_bottles_fruit_character_ok', V.FRUIT_CHARACTER],
    ['wd_bottles_fruit_notes_ok', V.FRUIT_NOTES],
    ['wd_bottles_flower_notes_ok', V.FLOWER_NOTES],
    ['wd_bottles_extras_ok', V.EXTRAS],
    ['wd_bottles_occasions_ok', V.OCCASIONS],
    ['wd_shelf_items_source_ok', V.SHELF_SOURCES],
    ['wd_ratings_verdict_ok', V.VERDICTS],
    ['wd_ratings_reasons_ok', V.DISLIKE_REASONS],
    ['wd_events_name_ok', V.EVENT_NAMES],
  ]
  it.each(cases)('%s', (constraint, values) => {
    expect([...valuesOf(constraint)].sort()).toEqual([...values].sort())
  })

  it('only creates wd_ tables and never touches the old app', () => {
    const created = [...migration.matchAll(/create table public\.(\w+)/g)].map((m) => m[1])
    expect(created.length).toBe(5)
    expect(created.every((t) => t!.startsWith('wd_'))).toBe(true)
    expect(migration).not.toMatch(/\b(alter|drop)\s+table\s+public\.(?!wd_)/i)
    for (const old of ['restaurants', 'visits', 'producers', 'visit_wines', 'lists', 'events', 'admin_emails', 'profiles']) {
      expect(migration).not.toMatch(new RegExp(`(alter|drop|delete from|update|insert into)\\s+(table\\s+)?public\\.${old}\\b`, 'i'))
    }
  })

  it('enables row-level security on every new table', () => {
    for (const t of ['wd_bottles', 'wd_shelf_items', 'wd_taste_profiles', 'wd_ratings', 'wd_events']) {
      expect(migration).toContain(`alter table public.${t} enable row level security`)
    }
  })
})
